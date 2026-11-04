import {createHash,randomUUID} from 'node:crypto';
import {displayCategory,type AssetRecord} from '../shared/contracts';
import type {AiClassificationInput,AiClassificationQueueState,AiPublicState} from '../shared/ai-contracts';
import {AiService,AI_MAX_CLASSIFICATION_ATTEMPTS} from './ai-service';
import {prepareClassificationInput,redactAiText} from './ai-privacy';

export interface AiClassificationQueueOptions {
  service: AiService;
  assets: () => AssetRecord[];
  canRun: () => boolean;
  changed: () => void;
  now?: () => number;
}
function boothItem(value:unknown):string|null {
  if(typeof value!=='string')return null;
  try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='booth.pm'||/^[a-z0-9-]+\.booth\.pm$/.test(u.hostname)))return null;return u.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?items\/(\d+)\/?$/)?.[1]??null;}catch{return null;}
}
/** Public BOOTH metadata only: private marketplace delivery/purchase text never qualifies. */
export function automaticClassificationInput(asset:AssetRecord):AiClassificationInput|null {
  if(!asset||asset.kind==='unity-project'||asset.missing||asset.recycledAt||asset.manual?.hidden||displayCategory(asset)!=='服装')return null;
  const online=asset.online;
  if(online?.status!=='matched'||!online.title?.trim())return null;
  const source=boothItem(online.url);if(!source||online.metadataSourceUrl&&boothItem(online.metadataSourceUrl)!==source)return null;
  const evidence=online.matchEvidence;
  const verifiedAutomatic=boothItem(online.metadataSourceUrl)===source&&!!evidence&&['filename-id','readme-link','name-search','child-package','known-source'].includes(evidence.method)&&!!evidence.ruleVersion&&Array.isArray(evidence.signals)&&evidence.signals.some(signal=>typeof signal==='string'&&!!signal.trim());
  if(!online.confirmedSource&&!verifiedAutomatic)return null;
  if(asset.manual.sourceUrl&&boothItem(asset.manual.sourceUrl)!==source)return null;
  const input={assetId:asset.id,publicTitle:online.title,publicDescription:online.description,publicTags:online.tags,filenameClue:asset.name};
  // Project now so both fingerprint and request are computed from exactly the same bounded public text.
  return {assetId:asset.id,...prepareClassificationInput(input)};
}
/** At most one item per 30s tick. start/stop own all timers; stop awaits cancellation. */
export class AiClassificationQueue {
  private timer?:ReturnType<typeof setInterval>;
  private enabled=false;
  private inFlight?:Promise<void>;
  private requestId?:string;
  private waitUntil=0;
  private waitSettings='';
  private readonly now:()=>number;
  private snapshot:AiClassificationQueueState={running:false,completed:0,pending:0,current:'',message:''};
  constructor(private readonly options:AiClassificationQueueOptions){this.now=options.now??Date.now;this.snapshot.completed=options.service.getClassificationAttempts().filter(a=>a.completed).length;}
  state():AiClassificationQueueState{return {...this.snapshot};}
  start():void {
    if(this.enabled)return;this.enabled=true;
    this.timer=setInterval(()=>{void this.tick();},30000);this.timer.unref?.();void this.tick();
  }
  async stop():Promise<void> {
    this.enabled=false;if(this.timer)clearInterval(this.timer);this.timer=undefined;
    if(this.requestId)this.options.service.cancel(this.requestId);
    await this.inFlight;
    this.set({running:false,current:'',message:'自动分类已暂停。'});
  }
  retry(assetId?:string):void {
    try {this.options.service.clearClassificationAttempts(assetId);this.waitUntil=0;this.waitSettings='';if(this.requestId)this.options.service.cancel(this.requestId);void this.tick();}
    catch {this.set({message:'无法保存重试状态，请检查资料库目录。'});}
  }
  tick():Promise<void> {
    if(this.inFlight){if(!this.allowed()&&this.requestId)this.options.service.cancel(this.requestId);return this.inFlight;}
    const run=this.run().catch(()=>{this.set({running:false,current:'',message:'自动分类暂时无法继续，请检查 AI 设置或资料库目录。'});}).finally(()=>{this.inFlight=undefined;});this.inFlight=run;return run;
  }
  private allowed():boolean {try{return this.enabled&&this.options.canRun();}catch{return false;}}
  private set(patch:Partial<AiClassificationQueueState>):void {const next={...this.snapshot,...patch};if(JSON.stringify(next)===JSON.stringify(this.snapshot))return;this.snapshot=next;try{this.options.changed();}catch{/* UI listeners must not break the queue. */}}
  private fingerprint(input:AiClassificationInput,state:AiPublicState):string {
    return createHash('sha256').update(JSON.stringify({version:1,provider:state.provider,model:state.model,workspace:state.qwenWorkspaceId,customBaseUrl:state.customBaseUrl,customProtocol:state.customProtocol,input:prepareClassificationInput(input)})).digest('hex');
  }
  private async run():Promise<void> {
    if(!this.allowed()){this.set({running:false,current:'',message:'自动分类已暂停。'});return;}
    const state=await this.options.service.getState();
    if(!this.allowed())return;
    if(!state.enabled||!state.classificationEnabled||!state.keyConfigured||state.error){this.set({running:false,current:'',message:state.error||'开启 AI 服装分类并配置密钥后自动处理。'});return;}
    const attempts=new Map(this.options.service.getClassificationAttempts().map(a=>[a.assetId,a]));
    const candidates=this.options.assets().slice(0,50000).map(automaticClassificationInput).filter((a):a is AiClassificationInput=>a!==null)
      .map(input=>({input,fingerprint:this.fingerprint(input,state)})).filter(a=>attempts.get(a.input.assetId)?.fingerprint!==a.fingerprint);
    this.set({pending:candidates.length,completed:[...attempts.values()].filter(a=>a.completed).length});
    if(!candidates.length){this.set({running:false,current:'',message:'已处理当前符合条件的服装；有新商品信息时继续。'});return;}
    const settingsKey=JSON.stringify([state.provider,state.model,state.qwenWorkspaceId,state.customBaseUrl,state.customProtocol,state.dailyCallLimit,state.keyStatus]);
    if(this.waitUntil>this.now()&&this.waitSettings===settingsKey)return;
    if(state.callsToday>=state.dailyCallLimit){this.waitSettings=settingsKey;this.waitUntil=Date.parse(new Date(this.now()).toISOString().slice(0,10)+'T00:00:00Z')+86400000;this.set({message:'今日 AI 调用额度已用完，明天继续。'});return;}
    const candidate=candidates[0];
    if(attempts.size>=AI_MAX_CLASSIFICATION_ATTEMPTS&&!attempts.has(candidate.input.assetId)){this.set({message:'自动分类记录已达容量上限；可清理重试记录后继续。'});return;}
    if(!this.allowed())return;
    this.requestId=`auto-clothes-${randomUUID()}`;
    this.set({running:true,current:redactAiText(candidate.input.publicTitle,120),message:'正在补充服装类型与风格建议。'});
    try {
      const result=await this.options.service.classify(candidate.input,this.requestId);
      if(!this.allowed())return;
      if(result.ok){this.options.service.saveClassificationAttempt({assetId:candidate.input.assetId,fingerprint:candidate.fingerprint,completed:true,at:this.now()});this.set({completed:this.snapshot.completed+1,pending:Math.max(0,this.snapshot.pending-1),message:result.cached?'已复用已有 AI 建议。':'已保存 AI 服装建议。'});}
      else if(result.code==='daily-limit'||result.code==='rate-limit'||result.code==='busy'){
        this.waitSettings=settingsKey;this.waitUntil=this.now()+(result.code==='daily-limit'?60000:result.code==='rate-limit'?60000:30000);this.set({message:result.message});
      }else if(['disabled','consent-required','key-required','encryption-unavailable','cancelled','storage'].includes(result.code)){this.set({message:result.message});}
      else{this.options.service.saveClassificationAttempt({assetId:candidate.input.assetId,fingerprint:candidate.fingerprint,completed:false,at:this.now()});this.set({pending:Math.max(0,this.snapshot.pending-1),message:result.message+' 此商品不会自动重复尝试。'});}
    }finally{this.requestId=undefined;this.set({running:false,current:''});}
  }
}
