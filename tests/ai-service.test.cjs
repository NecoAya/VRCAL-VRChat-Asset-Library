const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {AiService}=require('../dist/main/main/ai-service');
const {redactAiText,prepareClassificationInput,prepareDiagnosticInput}=require('../dist/main/main/ai-privacy');
const classification={clothingTypes:['连衣裙'],styles:['甜美'],confidence:0.8,reason:'标题明确标注连衣裙',uncertain:false};
const diagnostic={summary:'缺少程序集引用',observedFacts:['CS0246'],possibleCauses:['依赖包缺失'],steps:[{action:'检查 Package Manager 中的依赖',verification:'重新编译检查首条错误',risk:'read-only'}],missingInformation:['SDK 版本'],confidence:0.7};
const response=value=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}),{status:200});
function fixture(t,extra={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vrcal-ai-'));const secret=crypto.randomBytes(32);
 const cipher={isEncryptionAvailable:()=>true,encryptString(s){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',secret,iv);return Buffer.concat([iv,c.update(s,'utf8'),c.final(),c.getAuthTag()]);},decryptString(b){const c=crypto.createDecipheriv('aes-256-gcm',secret,b.subarray(0,12));c.setAuthTag(b.subarray(-16));return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString('utf8');}};
 let now=Date.parse('2026-10-24T00:00:00Z');let calls=[];const options={dataDir:dir,cipher,now:()=>now,fetchImpl:async(url,init)=>{calls.push({url,init});return response(classification);},...extra};const s=new AiService(options);
 t.after(()=>{s.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {dir,s,calls,options,advance:n=>now+=n,enable:patch=>s.updateSettings({enabled:true,classificationEnabled:true,diagnosticsEnabled:true,consentVersion:1,apiKey:'sk-test-1234567890-SECRET',...patch})};
}
test('default off and explicit scope consent prevents accidental upload',async t=>{
 const f=fixture(t);assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).code,'disabled');assert.equal(f.calls.length,0);
 await assert.rejects(f.s.updateSettings({enabled:true,classificationEnabled:true,apiKey:'sk-test-1234567890'}),/同意/);
 assert.equal((await f.s.getState()).enabled,false);await f.enable();assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).ok,true);
});
test('keys encrypted on disk, masked in state and reusable after restart; providers isolate keys',async t=>{
 const f=fixture(t);await f.enable();const state=await f.s.getState();assert.equal(state.keyConfigured,true);assert(!JSON.stringify(state).includes('SECRET'));
 assert(!fs.readFileSync(path.join(f.dir,'ai-credentials.json'),'utf8').includes('SECRET'));
 const second=new AiService(f.options);t.after(()=>second.close());assert.equal((await second.getState()).keyConfigured,true);
 await second.updateSettings({provider:'kimi'});assert.equal((await second.getState()).keyConfigured,false);
 await second.updateSettings({provider:'qwen',deleteApiKey:true});assert.equal((await second.getState()).keyConfigured,false);
});
test('unavailable encryption never writes plaintext credentials',async t=>{
 const f=fixture(t,{cipher:{isEncryptionAvailable:()=>false,encryptString(){throw Error('no');},decryptString(){throw Error('no');}}});
 await assert.rejects(f.enable(),/加密/);assert.equal(fs.existsSync(path.join(f.dir,'ai-credentials.json')),false);
});
test('input projection removes paths, secrets, private URLs, source lines and unknown fields',()=>{
 const text=redactAiText('C:\\Users\\PrivateAlice\\secret.cs:12 /home/PrivateBob/project/a.cs token=abc123456 Authorization: Bearer hidden012345 Cookie: session=abc https://pan.baidu.com/s/private?pwd=1234 me@example.com usr_12345678-1234-1234-1234-123456789012');
 for(const bad of ['PrivateAlice','PrivateBob','abc123456','hidden012345','session=abc','pan.baidu','example.com','usr_123'])assert(!text.includes(bad),bad);
 const input=prepareClassificationInput({assetId:'local',publicTitle:'Dress',filenameClue:'C:\\Users\\alice\\Dress.unitypackage',apiKey:'SECRET',localPreview:'C:/private.png'});assert.equal(input.filenameClue,'Dress.unitypackage');assert(!JSON.stringify(input).includes('SECRET'));assert(!JSON.stringify(input).includes('alice'));
 const diag=prepareDiagnosticInput({projectId:'private',excerpt:'Assets/Private/code.cs(2,3): error CS0246: type missing\nprivate string Secret = "private source";\nconst error = "private assignment";\nLogger.Error("private call");\n at MyPrivateClass.Run() in C:\\Users\\alice\\project\\Assets\\script.cs:line 2',unityVersion:'2022.3.22f1',sourceCode:'PRIVATE'});assert(!JSON.stringify(diag).includes('private source'));assert(!JSON.stringify(diag).includes('private assignment'));assert(!JSON.stringify(diag).includes('private call'));assert(!JSON.stringify(diag).includes('MyPrivateClass'));assert(JSON.stringify(diag).includes('CS0246'));
 assert(!redactAiText('Exception at /srv/PrivateAlice/Source.cs').includes('PrivateAlice'));
});
test('classification is separate, bounded and cached across restart with provenance',async t=>{
 const f=fixture(t);await f.enable();const input={assetId:'asset-1',publicTitle:'Sweet dress',officialCategory:'avatar',manualCategory:'hair'};const a=await f.s.classify(input);assert.equal(a.ok,true);assert.equal(a.record.provenance.provider,'qwen');assert.deepEqual(a.record.suggestion.clothingTypes,['连衣裙']);assert.equal(input.manualCategory,'hair');
 const b=await f.s.classify(input);assert.equal(b.cached,true);assert.equal(f.calls.length,1);const second=new AiService(f.options);t.after(()=>second.close());assert.equal((await second.classify(input)).cached,true);assert.equal((await second.getClassification('asset-1')).suggestion.reason,'标题明确标注连衣裙');
 const sent=JSON.parse(f.calls[0].init.body);assert.equal(sent.response_format.type,'json_object');assert(!JSON.stringify(sent).includes('asset-1'));assert.equal(f.calls[0].init.redirect,'error');
});
test('malformed, truncated, oversized or out-of-schema provider data never becomes a suggestion',async t=>{
 for(const value of [{...classification,confidence:1.1},{...classification,styles:['x'.repeat(100)]},{...classification,clothingTypes:['delete everything']},{...classification,command:'rm'},null]){
  const f=fixture(t,{fetchImpl:async()=>response(value)});await f.enable();const result=await f.s.classify({assetId:'a',publicTitle:'dress'});assert.equal(result.ok,false);assert.equal(result.code,'invalid-response');assert.equal(await f.s.getClassification('a'),null);
 }
});
test('diagnostics transmit only bounded redacted excerpts and return advisory steps',async t=>{
 const f=fixture(t,{fetchImpl:async(url,init)=>{f.calls.push({url,init});return response(diagnostic);}});await f.enable();const r=await f.s.diagnose({projectId:'local-project',excerpt:'C:/Users/Alice/project/Assets/test.cs(1,1): error CS0246: SomeType missing',unityVersion:'2022.3.22f1'});assert.equal(r.ok,true);assert.equal(r.record.suggestion.steps[0].risk,'read-only');assert(!f.calls[0].init.body.includes('Alice'));assert(!f.calls[0].init.body.includes('local-project'));assert.equal((await f.s.getDiagnostic('local-project')).suggestion.summary,'缺少程序集引用');
});
test('daily attempts survive restart and failures are never retried automatically',async t=>{
 const f=fixture(t,{fetchImpl:async()=>{f.calls.push(1);return new Response('SECRET',{status:401});}});await f.enable({dailyCallLimit:1});const a=await f.s.classify({assetId:'a',publicTitle:'dress'});assert.equal(a.code,'authentication');assert(!JSON.stringify(a).includes('SECRET'));const second=new AiService(f.options);t.after(()=>second.close());assert.equal((await second.classify({assetId:'b',publicTitle:'shoes'})).code,'daily-limit');assert.equal(f.calls.length,1);
});
test('in-flight requests can be cancelled and shutdown does not store late responses',async t=>{
 let started;const ready=new Promise(r=>started=r);const f=fixture(t,{fetchImpl:async(_url,init)=>{started();return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted SECRET')),{once:true}));}});await f.enable();const p=f.s.classify({assetId:'a',publicTitle:'dress'},'request-1');await ready;assert.equal(f.s.cancel('request-1'),true);assert.equal((await p).code,'cancelled');assert.equal(await f.s.getClassification('a'),null);
});
test('timeout covers stalled provider and rate cap prevents a fourth call per minute',async t=>{
 const f=fixture(t,{timeoutMs:25,fetchImpl:async(_url,init)=>new Promise((_r,j)=>init.signal.addEventListener('abort',()=>j(Error('abort')),{once:true}))});await f.enable();assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).code,'timeout');
 const g=fixture(t);await g.enable();for(let i=0;i<3;i++)assert.equal((await g.s.classify({assetId:'a'+i,publicTitle:'dress'+i})).ok,true);assert.equal((await g.s.classify({assetId:'b',publicTitle:'dress4'})).code,'rate-limit');assert.equal(g.calls.length,3);
});
test('provider endpoints are fixed, workspace IDs cannot redirect secrets, JSON parameters are provider-specific',async t=>{
 const f=fixture(t);await f.enable({qwenWorkspaceId:'llm-example'});await f.s.classify({assetId:'a',publicTitle:'dress'});assert.equal(f.calls[0].url,'https://llm-example.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');
 await assert.rejects(f.s.updateSettings({qwenWorkspaceId:'evil.example/path'}));await assert.rejects(f.s.updateSettings({baseUrl:'https://evil.test'}));
 await f.enable({provider:'kimi'});await f.s.classify({assetId:'b',publicTitle:'dress'});assert.equal(f.calls[1].url,'https://api.moonshot.cn/v1/chat/completions');assert.deepEqual(JSON.parse(f.calls[1].init.body).thinking,{type:'disabled'});
 await f.enable({provider:'deepseek'});await f.s.classify({assetId:'c',publicTitle:'dress'});assert.equal(f.calls[2].url,'https://api.deepseek.com/chat/completions');
});
test('newly enabled scope needs consent, revocation cancels ongoing requests',async t=>{
 let started;const ready=new Promise(r=>started=r);const f=fixture(t,{fetchImpl:async(_url,init)=>{started();return new Promise((_r,j)=>init.signal.addEventListener('abort',()=>j(Error('abort')),{once:true}));}});
 await f.enable({diagnosticsEnabled:false});await assert.rejects(f.s.updateSettings({diagnosticsEnabled:true}),/同意/);await f.s.updateSettings({diagnosticsEnabled:true,consentVersion:1});
 const running=f.s.classify({assetId:'a',publicTitle:'dress'});await ready;await f.s.updateSettings({enabled:false});assert.equal((await running).code,'cancelled');
});
test('corrupt settings and usage fail closed without overwriting originals',async t=>{
 for(const name of ['ai-settings.json','ai-credentials.json','ai-usage.json']){
  const f=fixture(t);await f.enable();const file=path.join(f.dir,name);fs.writeFileSync(file,'CORRUPT');const s=new AiService(f.options);t.after(()=>s.close());assert.equal((await s.classify({assetId:'a',publicTitle:'dress'})).code,'storage');assert.equal(fs.readFileSync(file,'utf8'),'CORRUPT');assert.equal(f.calls.length,0);
 }
});
test('response length and completion status are checked before accepting JSON',async t=>{
 for(const fetchImpl of [
  async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:JSON.stringify(classification)}}]})),
  async()=>new Response('x'.repeat(70000)),
  async()=>new Response('{}',{headers:{'Content-Length':'70000'}}),
  async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(classification),tool_calls:[{}]}}]})),
 ]){const f=fixture(t,{fetchImpl});await f.enable();assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).code,'invalid-response');}
});
test('even provider-reflected credential is removed from suggestion and cache',async t=>{
 const f=fixture(t,{fetchImpl:async(_url,init)=>response({...classification,reason:'seen '+init.headers.Authorization.substring(7)})});await f.enable({apiKey:'arbitrary-secret-value'});const r=await f.s.classify({assetId:'a',publicTitle:'dress'});assert.equal(r.ok,true);assert(!JSON.stringify(r).includes('arbitrary-secret-value'));assert(!fs.readFileSync(path.join(f.dir,'ai-cache.json'),'utf8').includes('arbitrary-secret-value'));
});
test('cache expires, version changes invalidate diagnostics and UTC day resets quota',async t=>{
 const f=fixture(t,{fetchImpl:async()=>{f.calls.push(1);return response(diagnostic);}});await f.enable({dailyCallLimit:1});const input={projectId:'p',excerpt:'error CS0246: dependency missing',unityVersion:'2022.3.1f1'};
 assert.equal((await f.s.diagnose(input)).ok,true);assert.equal((await f.s.diagnose(input)).cached,true);assert.equal((await f.s.diagnose({...input,unityVersion:'2022.3.2f1'})).code,'daily-limit');
 f.advance(86400000);assert.equal((await f.s.diagnose({...input,unityVersion:'2022.3.2f1'})).cached,false);f.advance(8*86400000);assert.equal(await f.s.getDiagnostic('p'),null);
});
test('weak plaintext safeStorage backend refuses credential persistence',async t=>{
 const f=fixture(t,{cipher:{isEncryptionAvailable:()=>true,getSelectedStorageBackend:()=> 'basic_text',encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()}});await assert.rejects(f.enable(),/加密/);assert.equal(fs.existsSync(path.join(f.dir,'ai-credentials.json')),false);
});
test('collected C# exception messages reach AI while stack frames and source lines remain local',async t=>{
 const {UnityDiagnosticsMonitor}=require('../dist/main/main/unity-diagnostics');
 const f=fixture(t,{fetchImpl:async(url,init)=>{f.calls.push({url,init});return response(diagnostic);}});await f.enable();
 const project={id:'runtime-project',kind:'unity-project',path:path.join(f.dir,'日本語工程')};
 for(const name of ['Assets','Packages','ProjectSettings'])fs.mkdirSync(path.join(project.path,name),{recursive:true});
 fs.writeFileSync(path.join(project.path,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: 2022.3.22f1\n');fs.writeFileSync(path.join(project.path,'Packages/manifest.json'),'{"dependencies":{}}');
 const logPath=path.join(f.dir,'Editor.log');const exceptions=['NullReferenceException: Object reference not set to an instance of an object','MissingReferenceException: The object of type GameObject has been destroyed','System.ArgumentException: Invalid parameter'];
 fs.writeFileSync(logPath,`Built from '2022.3/staging' branch\nCOMMAND LINE ARGUMENTS:\nUnity.exe\n-projectPath\n${project.path}\nInitialize engine version: 2022.3.22f1\n`+exceptions.map(e=>e+'\n  at PRIVATE_FRAME.Update () (at Assets/Secret.cs:42)\n').join(''));
 const report=await new UnityDiagnosticsMonitor({logPath}).read(project,[f.dir]);assert.equal(report.status,'ready');assert.equal(report.issues.length,3);
 const excerpt=report.issues.filter(i=>i.severity==='error').map(i=>`${i.message}\n${i.detail}`).join('\n\n');
 const prepared=prepareDiagnosticInput({projectId:project.id,excerpt,unityVersion:report.projectVersion});for(const e of exceptions)assert(prepared.excerpt.includes(e));assert(!prepared.excerpt.includes('PRIVATE_FRAME'));
 const r=await f.s.diagnose({projectId:project.id,excerpt,unityVersion:report.projectVersion});assert.equal(r.ok,true);assert.equal(f.calls.length,1);for(const name of ['NullReferenceException','MissingReferenceException','System.ArgumentException'])assert(f.calls[0].init.body.includes(name));assert(!f.calls[0].init.body.includes('PRIVATE_FRAME'));assert(!f.calls[0].init.body.includes(project.path));
 assert.equal(prepareDiagnosticInput({projectId:'p',excerpt:'throw new NullReferenceException("PRIVATE_SOURCE");\nLogger.Error("PRIVATE_SOURCE");\n at PrivateException.Run()'}).excerpt,'');
});

test('custom OpenAI endpoint, model IDs and encrypted receiver-bound key survive restart',async t=>{
 const f=fixture(t);await f.enable({provider:'custom',model:'vendor/model:latest',customBaseUrl:'https://example.com/v1/',customProtocol:'openai'});
 assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).ok,true);
 assert.equal(f.calls[0].url,'https://example.com/v1/chat/completions');
 assert.equal(JSON.parse(f.calls[0].init.body).model,'vendor/model:latest');
 const second=new AiService(f.options);t.after(()=>second.close());assert.equal((await second.getState()).keyConfigured,true);
 await assert.rejects(second.updateSettings({customBaseUrl:'https://other.example/v1'}),/同意/);
 await second.updateSettings({customBaseUrl:'https://other.example/v1',consentVersion:1});
 assert.equal((await second.getState()).keyConfigured,false);
 assert.equal((await second.classify({assetId:'b',publicTitle:'dress'})).code,'key-required');
});
test('custom Anthropic Messages uses native headers and parses bounded text only',async t=>{
 const f=fixture(t,{fetchImpl:async(url,init)=>{f.calls.push({url,init});return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'thinking',thinking:'not a result'},{type:'text',text:JSON.stringify(classification)}]}));}});
 await f.enable({provider:'custom',model:'claude-opus-5-5',customBaseUrl:'https://api.anthropic.com',customProtocol:'anthropic'});
 const r=await f.s.classify({assetId:'a',publicTitle:'dress'});assert.equal(r.ok,true);
 const {url,init}=f.calls[0];assert.equal(url,'https://api.anthropic.com/v1/messages');assert(init.headers['x-api-key']);assert.equal(init.headers.Authorization,undefined);
 const b=JSON.parse(init.body);assert.equal(typeof b.system,'string');assert.equal(b.messages[0].role,'user');assert.equal(b.response_format,undefined);
 assert(!JSON.stringify(r).includes('SECRET'));
});
test('custom addresses reject insecure URLs, URL credentials and query tokens',async t=>{
 const f=fixture(t);
 for(const url of ['http://example.com/v1','https://user:pass@example.com/v1','https://example.com/v1?key=secret','https://example.com/#secret','not a url']) await assert.rejects(f.enable({provider:'custom',model:'model',customBaseUrl:url}));
 assert.equal(f.calls.length,0);
});
test('Anthropic truncation, refusals and tool calls cannot become advice',async t=>{
 for(const payload of [{stop_reason:'max_tokens',content:[{type:'text',text:JSON.stringify(classification)}]},{stop_reason:'refusal',content:[]},{stop_reason:'end_turn',content:[{type:'tool_use',name:'run'}]}]){
  const f=fixture(t,{fetchImpl:async()=>new Response(JSON.stringify(payload))});await f.enable({provider:'custom',model:'claude-opus-5-5',customBaseUrl:'https://example.com/v1',customProtocol:'anthropic'});
  assert.equal((await f.s.classify({assetId:'a',publicTitle:'dress'})).code,'invalid-response');
 }
});
test('editing stored custom endpoint cannot send an existing key to the replacement receiver',async t=>{
 const f=fixture(t);await f.enable({provider:'custom',model:'model',customBaseUrl:'https://example.com/v1'});
 const file=path.join(f.dir,'ai-settings.json'),s=JSON.parse(fs.readFileSync(file,'utf8'));s.customBaseUrl='https://other.example/v1';fs.writeFileSync(file,JSON.stringify(s));
 const second=new AiService(f.options);t.after(()=>second.close());assert.equal((await second.getState()).keyStatus,'unavailable');assert.equal((await second.classify({assetId:'a',publicTitle:'dress'})).code,'encryption-unavailable');assert.equal(f.calls.length,0);
});
