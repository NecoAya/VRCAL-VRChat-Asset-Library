const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module'),{EventEmitter}=require('node:events');
const {BAIDU_SHARE_SNAPSHOT}=require('../dist/main/main/baidu-share-page');

class Contents extends EventEmitter {
 constructor(){super();this.id=321;this.url='';this.destroyed=false;this.action=async()=>true;this.normal=async()=> 'waiting';this.data={title:'Synthetic share',path:'/s/1Synthetic',files:[{index:0,name:'PRIVATE_FILE.zip',directory:false,sizeText:'4 B'}],back:false}}
 setWindowOpenHandler(handler){this.popup=handler}getURL(){return this.url}isDestroyed(){return this.destroyed}close(){this.destroyed=true}
 async loadURL(url){this.url=url}
 async executeJavaScript(script){if(script===BAIDU_SHARE_SNAPSHOT)return this.data;if(script.includes('bottom_download_btn'))return this.action();if(script.includes('moduleDownloadDialog'))return this.normal();throw Error('Unexpected synthetic page operation')}
}
class View {constructor(){this.webContents=new Contents()}setBounds(){}}
const ordinaryLoad=Module._load;let BaiduDownloads;
try{Module._load=function(name,...args){return name==='electron'?{WebContentsView:View}:ordinaryLoad.call(this,name,...args)};({BaiduDownloads}=require('../dist/main/main/baidu-downloads'))}finally{Module._load=ordinaryLoad}
class Download extends EventEmitter {
 constructor(name='PRIVATE_FILE.zip',urls=['https://d.pcs.baidu.com/file/PRIVATE_SIGNED_URL']){super();this.name=name;this.urls=urls}
 getFilename(){return this.name}getURLChain(){return this.urls}getTotalBytes(){return 4}getReceivedBytes(){return 0}setSavePath(file){this.file=file}isPaused(){return false}canResume(){return false}
 cancel(){this.emit('done',{},'cancelled')}
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function advance(t,ms){for(let elapsed=0;elapsed<ms;elapsed+=500){t.mock.timers.tick(Math.min(500,ms-elapsed));await new Promise(resolve=>setImmediate(resolve))}}
async function fixture(t){
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000000});
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vrc-baidu-start-')),dataDir=path.join(root,'Library'),downloads=path.join(root,'Downloads');fs.mkdirSync(dataDir);fs.mkdirSync(downloads);
 let online=true;const manager=new BaiduDownloads({dataDir,roots:()=>[],session:async()=>({cookies:{get:async()=>[{name:'BDUSS',value:'PRIVATE_SYNTHETIC_COOKIE',domain:'.baidu.com'}]}}),canNetwork:()=>online,changed(){}});
 manager.setDirectory(downloads);await manager.read('https://pan.baidu.com/s/1Synthetic');
 t.after(async()=>{manager.stop();await advance(t,12000);await manager.shutdown();const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(resolved,{recursive:true,force:true})});
 const send=item=>{const event={prevented:false,preventDefault(){this.prevented=true}};manager.accept(event,item,manager.view.webContents);return event};
 return {manager,wc:manager.view.webContents,file:manager.state().files[0],send,setOnline:value=>online=value};
}

test('slow page steps still accept the selected native download after twenty seconds',async t=>{
 const f=await fixture(t);let normalCalls=0,event;
 f.wc.action=async()=>{await delay(9000);return true};
 f.wc.normal=async()=>{await delay(++normalCalls===1?9000:2000);if(normalCalls===1)return 'waiting';event=f.send(new Download());return 'clicked'};
 const outcome=f.manager.download(f.file.id).then(()=>({started:true}),error=>({error:error.message}));
 await advance(t,45000);const result=await outcome;
 assert.deepEqual(result,{started:true});assert.equal(event.prevented,false);assert.equal(f.manager.state().tasks.length,1);
});

test('page execution time counts toward one finite download-start deadline',async t=>{
 const f=await fixture(t);f.wc.normal=async()=>{await delay(8000);return 'waiting'};
 let settled=false;const outcome=f.manager.download(f.file.id).then(()=>({started:true}),error=>({error:error.message})).then(result=>{settled=true;return result});
 await advance(t,50000);assert.equal(settled,true,'slow page polling must stop within the overall start deadline');
 const result=await outcome;assert.match(result.error,/超时/);assert.equal(f.manager.state().busy,false);assert.equal(f.manager.state().tasks.length,0);
 assert.equal(f.manager.allowNavigation(f.wc.id,'https://d.pcs.baidu.com/file/anything'),false);
});

for(const scenario of [
 {name:'filename mismatch',item:()=>new Download('PRIVATE_OTHER_FILE.zip'),reason:/文件名/},
 {name:'untrusted download origin',item:()=>new Download(undefined,['https://untrusted.example/PRIVATE_SIGNED_URL']),reason:/来源/},
])test(`${scenario.name} stops with a safe specific reason`,async t=>{
 const f=await fixture(t);let event;f.wc.action=async()=>{event=f.send(scenario.item());return true};
 const outcome=f.manager.download(f.file.id).then(()=>({started:true}),error=>({error:error.message}));
 await advance(t,45000);const result=await outcome;assert.match(result.error,scenario.reason);assert.equal(event.prevented,true);assert.equal(f.manager.state().tasks.length,0);
 assert.doesNotMatch(JSON.stringify(f.manager.state()),/PRIVATE_OTHER_FILE|PRIVATE_SIGNED_URL|PRIVATE_SYNTHETIC_COOKIE|untrusted\.example/);
});

test('an expired native event cannot write and reports expiry instead of an unknown page failure',async t=>{
 const f=await fixture(t);let event;
 f.wc.normal=async()=>{t.mock.timers.setTime(Date.now()+60000);event=f.send(new Download());return 'clicked'};
 const outcome=f.manager.download(f.file.id).then(()=>({started:true}),error=>({error:error.message}));
 await advance(t,45000);const result=await outcome;assert.match(result.error,/超时|过期/);assert.equal(event.prevented,true);assert.equal(f.manager.state().tasks.length,0);
});

test('going offline after the ordinary-download click stops waiting promptly',async t=>{
 const f=await fixture(t);f.wc.normal=async()=>{f.setOnline(false);return 'clicked'};
 let settled=false;const outcome=f.manager.download(f.file.id).then(()=>({started:true}),error=>({error:error.message})).then(result=>{settled=true;return result});
 await advance(t,2000);assert.equal(settled,true);assert.match((await outcome).error,/联网|网络/);assert.equal(f.manager.state().tasks.length,0);
});
