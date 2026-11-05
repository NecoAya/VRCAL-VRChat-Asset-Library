import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {AI_CONSENT_VERSION, type AiClassificationInput, type AiClassificationRecord, type AiDiagnosticInput, type AiDiagnosticRecord, type AiErrorCode, type AiPublicState, type AiRunResult, type AiSettingsUpdate} from '../shared/ai-contracts';
import {AiSettings, aiEndpoint, isAiProvider, readAiJson, writeAiJson, type AiCipher} from './ai-settings';
import {prepareClassificationInput, prepareDiagnosticInput,redactAiText} from './ai-privacy';
import {aiSystemPrompt, parseClassification, parseDiagnostic,parseDiscovery} from './ai-schemas';

export interface AiServiceOptions {
  dataDir: string;
  cipher: AiCipher;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}
type Kind = 'classification' | 'diagnostic' | 'discovery';
type RecordResult = AiClassificationRecord | AiDiagnosticRecord | import("../shared/discovery").DiscoveryAiRecord;
const recordId=(r:RecordResult)=>"assetId" in r?r.assetId:"projectId" in r?r.projectId:r.searchId;
type CacheEntry = {kind: Kind; key: string; record: RecordResult};
type Usage = {schemaVersion: 1; day: string; calls: number; recent: number[]};
export interface AiClassificationAttempt {assetId: string; fingerprint: string; completed: boolean; at: number}
export const AI_MAX_CLASSIFICATION_ATTEMPTS=10000;
const errors: Record<AiErrorCode,string> = {
  disabled:'AI 尚未启用或此范围已暂停。', 'consent-required':'请先阅读并同意当前 AI 数据说明。',
  'key-required':'请在 AI 设置中填写所选服务商的 API 密钥。', 'encryption-unavailable':'系统无法解密 AI 密钥，请重新配置。',
  'invalid-input':'没有可发送的有效商品文字或错误摘要。', 'invalid-response':'AI 返回格式无效或内容不完整，本次未保存建议。',
  busy:'正在处理另一项 AI 分析，请稍后查看。', 'rate-limit':'已达到每分钟调用上限，请稍后再试。',
  'daily-limit':'已达到今天的 AI 调用上限。', cancelled:'AI 请求已取消。', timeout:'AI 请求超时，本次未自动重试。',
  authentication:'服务商拒绝了 API 密钥，请检查密钥、权限和余额。', 'provider-error':'AI 服务商暂时无法完成请求，请检查模型、额度或稍后重试。',
  network:'暂时无法连接 AI 服务商，本次未自动重试。', storage:'AI 本地记录无法读取或保存，已暂停本次处理。',
};
const failure = (code: AiErrorCode): AiRunResult<never> => ({ok:false,code,message:errors[code]});
class AiFailure extends Error {constructor(readonly code: AiErrorCode){super(code);}}
function localId(value: unknown): value is string { return typeof value==='string'&&value.length>0&&value.length<=180&&!/[\u0000-\u001f]/.test(value); }

/** A single instance per active data directory. Nothing in this service reads local previews/source files. */
export class AiService {
  private readonly settings: AiSettings;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private cache: CacheEntry[]=[];
  private classificationAttempts: AiClassificationAttempt[]=[];
  private usage: Usage;
  private storageError=false;
  private active = new Map<string,AbortController>();
  private closed=false;
  constructor(private readonly options: AiServiceOptions) {
    this.settings=new AiSettings(options.dataDir,options.cipher);
    this.fetchImpl=options.fetchImpl??fetch;
    this.now=options.now??Date.now;
    this.usage={schemaVersion:1,day:this.day(),calls:0,recent:[]};
    try {
      const value=readAiJson(path.join(options.dataDir,'ai-usage.json'),16384) as Usage|undefined;
      if(value!==undefined){
        if(!value||value.schemaVersion!==1||!/^\d{4}-\d{2}-\d{2}$/.test(value.day)||!Number.isInteger(value.calls)||value.calls<0||value.calls>100000||!Array.isArray(value.recent)||value.recent.length>3||!value.recent.every(t=>typeof t==='number'&&Number.isFinite(t)&&t>=0))throw new Error();
        this.usage={schemaVersion:1,day:value.day,calls:value.calls,recent:value.recent};
      }
    }catch{this.storageError=true;}
    try {
      const raw=readAiJson(path.join(options.dataDir,'ai-cache.json'),8*1024*1024);
      if(raw!==undefined){
        if(!raw||typeof raw!=='object'||!Array.isArray((raw as {entries?:unknown}).entries))throw new Error();
        const entries=(raw as {entries:unknown[]}).entries;if(entries.length>500)throw new Error();
        for(const entry of entries){const parsed=this.parseCacheEntry(entry);if(parsed)this.cache.push(parsed);}
        const attempts=(raw as {classificationAttempts?:unknown}).classificationAttempts;
        if(Array.isArray(attempts)&&attempts.length<=AI_MAX_CLASSIFICATION_ATTEMPTS)this.classificationAttempts=attempts.filter((a):a is AiClassificationAttempt=>!!a&&typeof a==='object'&&localId(a.assetId)&&typeof a.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(a.fingerprint)&&typeof a.completed==='boolean'&&typeof a.at==='number'&&Number.isFinite(a.at)).map(a=>({assetId:a.assetId,fingerprint:a.fingerprint,completed:a.completed,at:a.at}));
      }
    }catch{ /* Derived cache is optional; a bad cache is never sent to a provider or presented as a result. */ }
  }
  private day(): string {return new Date(this.now()).toISOString().slice(0,10);}
  private currentUsage(): Usage {
    const day=this.day();
    // Do not reset quotas if the clock moves backwards.
    return day>this.usage.day?{schemaVersion:1,day,calls:0,recent:[]}:this.usage;
  }
  async getState(): Promise<AiPublicState> {
    const s=this.settings.settings,status=this.settings.keyStatus();
    return {enabled:s.enabled,classificationEnabled:s.classificationEnabled,diagnosticsEnabled:s.diagnosticsEnabled,discoveryEnabled:s.discoveryEnabled,provider:s.provider,model:s.model,customProtocol:s.customProtocol,customBaseUrl:s.customBaseUrl,qwenWorkspaceId:s.qwenWorkspaceId,dailyCallLimit:s.dailyCallLimit,callsToday:this.currentUsage().calls,consentVersion:s.consentVersion,keyConfigured:status==='configured',keyStatus:status,encryptionAvailable:this.settings.encryptionAvailable(),busy:this.active.size>0,...(this.settings.error||this.storageError?{error:this.settings.error??errors.storage}:{})};
  }
  async updateSettings(patch: AiSettingsUpdate): Promise<AiPublicState> {
    if(this.closed)throw new Error(errors.cancelled);
    this.settings.configure(patch);
    // Reconfiguring consent/provider/key invalidates authorization for any previous in-flight request.
    for(const controller of this.active.values())controller.abort();
    return this.getState();
  }
  async classify(input: AiClassificationInput, requestId?: string): Promise<AiRunResult<AiClassificationRecord>> {
    if(!input||!localId(input.assetId))return failure('invalid-input');
    const prepared=prepareClassificationInput(input);
    if(!prepared.publicTitle&&!prepared.publicDescription&&!prepared.publicTags.length&&!prepared.filenameClue)return failure('invalid-input');
    return this.run('classification',input.assetId,prepared,requestId) as Promise<AiRunResult<AiClassificationRecord>>;
  }
  async diagnose(input: AiDiagnosticInput, requestId?: string): Promise<AiRunResult<AiDiagnosticRecord>> {
    if(!input||!localId(input.projectId))return failure('invalid-input');
    const prepared=prepareDiagnosticInput(input);
    if(!prepared.excerpt)return failure('invalid-input');
    return this.run('diagnostic',input.projectId,prepared,requestId) as Promise<AiRunResult<AiDiagnosticRecord>>;
  }
  async planSearch(description:string,avatar:string,requestId:string):Promise<AiRunResult<import('../shared/discovery').DiscoveryAiRecord>> {
    if(typeof description!=='string'||!description.trim()||description.length>600||typeof avatar!=='string'||avatar.length>80)return failure('invalid-input');
    return this.run('discovery',requestId,{description:redactAiText(description,600),avatar:redactAiText(avatar,80)},requestId) as Promise<AiRunResult<import('../shared/discovery').DiscoveryAiRecord>>;
  }
  async getClassification(assetId: string): Promise<AiClassificationRecord|null> {return this.getRecord('classification',assetId) as AiClassificationRecord|null;}
  async getDiagnostic(projectId: string): Promise<AiDiagnosticRecord|null> {return this.getRecord('diagnostic',projectId) as AiDiagnosticRecord|null;}
  private getRecord(kind:Kind,id:string):RecordResult|null {
    const found=this.cache.filter(e=>e.kind===kind&&this.fresh(e)&&recordId(e.record)===id).sort((a,b)=>b.record.provenance.generatedAt-a.record.provenance.generatedAt)[0];
    return found?structuredClone(found.record):null;
  }
  cancel(requestId: string): boolean {const controller=this.active.get(requestId);if(!controller)return false;controller.abort();return true;}
  close(): void {this.closed=true;for(const controller of this.active.values())controller.abort();}
  /** Local queue bookkeeping only; includes hashes, never product input or error responses. */
  getClassificationAttempts(): AiClassificationAttempt[] {return structuredClone(this.classificationAttempts);}
  saveClassificationAttempt(attempt: AiClassificationAttempt): void {
    if(this.closed||!localId(attempt.assetId)||!/^[a-f0-9]{64}$/.test(attempt.fingerprint))throw new Error(errors.storage);
    const next=[...this.classificationAttempts.filter(a=>a.assetId!==attempt.assetId),attempt];
    if(next.length>AI_MAX_CLASSIFICATION_ATTEMPTS)throw new Error(errors.storage);
    this.persistDerived(this.cache,next);this.classificationAttempts=next;
  }
  clearClassificationAttempts(assetId?: string): void {
    if(this.closed)throw new Error(errors.cancelled);
    const next=assetId?this.classificationAttempts.filter(a=>a.assetId!==assetId):[];
    this.persistDerived(this.cache,next);this.classificationAttempts=next;
  }
  private fresh(entry:CacheEntry):boolean {const age=this.now()-entry.record.provenance.generatedAt;return age>=0&&age<(entry.kind==='classification'?30:7)*86400000;}
  private parseCacheEntry(value:unknown):CacheEntry|null {
    try {
      const e=value as CacheEntry;
      if(!e||(e.kind!=='classification'&&e.kind!=='diagnostic'&&e.kind!=='discovery')||typeof e.key!=='string'||!/^[a-f0-9]{64}$/.test(e.key))return null;
      const p=e.record?.provenance;
      if(!p||!isAiProvider(p.provider)||typeof p.model!=='string'||!/^[a-z0-9][a-z0-9._\/:-]{0,99}$/i.test(p.model)||p.schemaVersion!==1||!/^[a-f0-9]{64}$/.test(p.inputHash)||!Number.isFinite(p.generatedAt)||p.generatedAt<0||p.inputScope!==(e.kind==='classification'?'public-text-and-filename':e.kind==='diagnostic'?'redacted-unity-errors':'search-description'))return null;
      const provenance={provider:p.provider,model:p.model,generatedAt:p.generatedAt,inputHash:p.inputHash,schemaVersion:1 as const,inputScope:p.inputScope};
      const id=recordId(e.record);if(!localId(id))return null;
      const record=e.kind==='classification'?{assetId:id,suggestion:parseClassification(e.record.suggestion),provenance}:e.kind==='diagnostic'?{projectId:id,suggestion:parseDiagnostic(e.record.suggestion),provenance}:{searchId:id,suggestion:parseDiscovery(e.record.suggestion),provenance};
      const result={kind:e.kind,key:e.key,record};return this.fresh(result)?result:null;
    }catch{return null;}
  }
  private async run(kind: Kind, id: string, input: object, requestId: string = randomUUID()): Promise<AiRunResult<RecordResult>> {
    if(this.closed)return failure('cancelled');
    if(!localId(requestId))return failure('invalid-input');
    const s={...this.settings.settings};
    if(this.settings.error||this.storageError)return failure('storage');
    if(!s.enabled||!(kind==='classification'?s.classificationEnabled:kind==='diagnostic'?s.diagnosticsEnabled:s.discoveryEnabled))return failure('disabled');
    if(s.consentVersion!==AI_CONSENT_VERSION||!(kind==='classification'?s.consentClassification:kind==='diagnostic'?s.consentDiagnostics:s.consentDiscovery))return failure('consent-required');
    const keyStatus=this.settings.keyStatus();
    if(keyStatus==='missing')return failure('key-required');
    if(keyStatus==='unavailable')return failure('encryption-unavailable');
    const endpoint=aiEndpoint(s),prompt=aiSystemPrompt(kind);
    const hash=createHash('sha256').update(JSON.stringify({kind,provider:s.provider,model:s.model,endpoint,protocol:s.customProtocol,prompt,input,schemaVersion:1})).digest('hex');
    const cached=this.cache.find(e=>e.key===hash&&e.kind===kind&&this.fresh(e));
    if(cached){
      const record=structuredClone(cached.record);if('assetId'in record)record.assetId=id;else if('projectId'in record)record.projectId=id;else record.searchId=id;
      try {this.storeCache({kind,key:hash,record});}catch{return failure('storage');}
      return {ok:true,record,cached:true};
    }
    if(this.active.size)return failure('busy');
    const usage=this.currentUsage(),recent=usage.recent.filter(t=>this.now()-t<60000);
    if(usage.calls>=s.dailyCallLimit)return failure('daily-limit');
    if(recent.length>=3)return failure('rate-limit');
    let key:string;
    try {key=this.settings.key();}catch{return failure('encryption-unavailable');}
    const controller=new AbortController();this.active.set(requestId,controller);
    let timeout=false;
    let rejectAbort: (reason:AiFailure)=>void=()=>{};
    const aborted=new Promise<never>((_resolve,reject)=>{rejectAbort=reject;});
    const onAbort=()=>rejectAbort(new AiFailure(timeout?'timeout':'cancelled'));
    controller.signal.addEventListener('abort',onAbort,{once:true});
    const timer=setTimeout(()=>{timeout=true;controller.abort();},Math.max(10,Math.min(this.options.timeoutMs??45000,120000)));
    try {
      // Reserve the attempt before any network I/O; failures may also incur provider charges.
      this.usage={schemaVersion:1,day:usage.day,calls:usage.calls+1,recent:[...recent,this.now()]};
      try {writeAiJson(path.join(this.options.dataDir,'ai-usage.json'),this.usage);}catch{this.storageError=true;throw new AiFailure('storage');}
      const body={model:s.model,messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},max_tokens:kind==='classification'?1200:2400,stream:false,
        ...(s.provider==='qwen'?{enable_thinking:false}:{}),...(s.provider==='kimi'&&/^kimi-k2\./.test(s.model)?{thinking:{type:'disabled'}}:{})};
      const anthropic=s.provider==='custom' && s.customProtocol==='anthropic';
      const requestBody=anthropic ? {model:s.model,system:prompt,messages:[{role:'user',content:JSON.stringify(input)}],max_tokens:kind==='classification'?1200:2400,stream:false} : body;
      const headers:Record<string,string>=anthropic ? {'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'} : {Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
      const operation=async()=>{
        const response=await this.fetchImpl(endpoint,{method:'POST',headers,body:JSON.stringify(requestBody),signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store'});
        if(!response.ok){void response.body?.cancel().catch(()=>{});throw new AiFailure(response.status===401||response.status===403?'authentication':response.status===429?'rate-limit':'provider-error');}
        const payload=await this.readResponse(response);
        const message=payload as {stop_reason?:unknown;content?:Array<{type?:unknown;text?:unknown}>};
        if(anthropic && (message.stop_reason!=='end_turn' || !Array.isArray(message.content) || message.content.some(b=>b.type!=='text'&&b.type!=='thinking'&&b.type!=='redacted_thinking'))) throw new AiFailure('invalid-response');
        const choice=anthropic ? {finish_reason:'stop',message:{content:message.content!.filter(b=>b.type==='text').map(b=>typeof b.text==='string'?b.text:'').join('')}} : (payload as {choices?:Array<{finish_reason?:unknown;message?:{content?:unknown;tool_calls?:unknown;refusal?:unknown}}>})?.choices?.[0];
        if(choice?.finish_reason!=='stop'||choice.message?.tool_calls||choice.message?.refusal||typeof choice.message?.content!=='string'||choice.message.content.length>16000)throw new AiFailure('invalid-response');
        try {
          // Even a hostile provider reflecting its Authorization header cannot echo the saved key into IPC/cache.
          const parsed=JSON.parse(choice.message.content,(_name,value)=>typeof value==='string'?value.split(key).join('[credential]'):value);
          return kind==='classification'?parseClassification(parsed):kind==='diagnostic'?parseDiagnostic(parsed):parseDiscovery(parsed);
        }catch{throw new AiFailure('invalid-response');}
      };
      const suggestion=await Promise.race([operation(),aborted]);
      if(controller.signal.aborted||this.closed)throw new AiFailure(timeout?'timeout':'cancelled');
      const provenance={provider:s.provider,model:s.model,generatedAt:this.now(),inputHash:hash,schemaVersion:1 as const,inputScope:kind==='classification'?'public-text-and-filename' as const:kind==='diagnostic'?'redacted-unity-errors' as const:'search-description' as const};
      const record=(kind==='classification'?{assetId:id,suggestion,provenance}:kind==='diagnostic'?{projectId:id,suggestion,provenance}:{searchId:id,suggestion,provenance}) as RecordResult;
      try {this.storeCache({kind,key:hash,record});}catch{throw new AiFailure('storage');}
      return {ok:true,record:structuredClone(record),cached:false};
    }catch(error){return failure(error instanceof AiFailure?error.code:controller.signal.aborted?(timeout?'timeout':'cancelled'):'network');}
    finally{clearTimeout(timer);controller.signal.removeEventListener('abort',onAbort);this.active.delete(requestId);}
  }
  private storeCache(entry: CacheEntry):void {
    const id=recordId(entry.record);
    const next=[...this.cache.filter(e=>this.fresh(e)&&!(e.kind===entry.kind&&recordId(e.record)===id)),entry].slice(-500);
    // Keep serialized derived data bounded even when every diagnostic reaches its schema limit.
    while(Buffer.byteLength(JSON.stringify(next),'utf8')>3*1024*1024&&next.length>1)next.shift();
    this.persistDerived(next,this.classificationAttempts);this.cache=next;
  }
  private persistDerived(entries:CacheEntry[],classificationAttempts:AiClassificationAttempt[]):void {writeAiJson(path.join(this.options.dataDir,'ai-cache.json'),{schemaVersion:1,entries,classificationAttempts});}
  private async readResponse(response: Response):Promise<unknown> {
    if(Number(response.headers.get('content-length')??0)>65536){void response.body?.cancel().catch(()=>{});throw new AiFailure('invalid-response');}
    if(!response.body)throw new AiFailure('invalid-response');
    const reader=response.body.getReader();const parts:Uint8Array[]=[];let size=0;
    try {
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){void reader.cancel().catch(()=>{});throw new AiFailure('invalid-response');}parts.push(value);}
      try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new AiFailure('invalid-response');}
    }finally{reader.releaseLock();}
  }
}
