const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module'),{EventEmitter}=require('node:events');
const {BAIDU_SHARE_SNAPSHOT}=require('../dist/main/main/baidu-share-page');
const windows=[];
class Contents extends EventEmitter {
 constructor(){super();this.id=1234;this.url='';this.destroyed=false;this.loads=0}
 setWindowOpenHandler(handler){this.popup=handler}getURL(){return this.url}isDestroyed(){return this.destroyed}close(){this.destroyed=true}
 async loadURL(url){this.url=url;this.loads++}
 async executeJavaScript(script){assert.equal(script,BAIDU_SHARE_SNAPSHOT);return {title:'Synthetic',path:'/s/1Synthetic',files:[{index:0,name:'Synthetic.zip',directory:false,sizeText:'4 B'}],back:false}}
}
class View {constructor(options){this.options=options;this.webContents=new Contents()}setBounds(value){this.bounds=value}}
class Window extends EventEmitter {
 constructor(options){super();this.options=options;this.destroyed=false;this.shown=0;this.focused=0;this.children=[];this.contentView={addChildView:view=>this.children.push(view),removeChildView:view=>{const i=this.children.indexOf(view);if(i>=0)this.children.splice(i,1)}};windows.push(this)}
 isDestroyed(){return this.destroyed}getContentSize(){return [1100,800]}show(){this.shown++}focus(){this.focused++}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.emit('closed')}
}
const ordinary=Module._load;let BaiduDownloads;
try{Module._load=function(name,...args){return name==='electron'?{WebContentsView:View,BrowserWindow:Window}:ordinary.call(this,name,...args)};({BaiduDownloads}=require('../dist/main/main/baidu-downloads'))}finally{Module._load=ordinary}
async function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vrc-baidu-verification-')),dataDir=path.join(root,'Library');fs.mkdirSync(dataDir);let online=true;const parent={syntheticParent:true};
 const manager=new BaiduDownloads({dataDir,roots:()=>[],parent:()=>parent,session:async()=>({cookies:{get:async()=>[{name:'BDUSS',value:'PRIVATE_SYNTHETIC_COOKIE',domain:'.baidu.com'}]}}),canNetwork:()=>online,changed(){}});
 t.after(async()=>{await manager.shutdown();const resolved=path.resolve(root);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(resolved,{recursive:true,force:true})});
 return {manager,parent,setOnline:value=>online=value};
}
test('verification has no page to show until a share was read and never opens automatically',async t=>{
 const f=await fixture(t),before=windows.length;assert.equal(f.manager.openVerification(),false);assert.equal(windows.length,before);
 await f.manager.read('https://pan.baidu.com/s/1Synthetic?pwd=abcd');assert.equal(windows.length,before);assert.equal(f.manager.state().tasks.length,0);
});
test('verification reuses the exact existing sandboxed share view without navigating or exposing secrets',async t=>{
 const f=await fixture(t);await f.manager.read('https://pan.baidu.com/s/1Synthetic?pwd=abcd');const view=f.manager.view,wc=view.webContents,before=windows.length;
 assert.equal(f.manager.openVerification(),true);assert.equal(windows.length,before+1);const window=windows.at(-1);
 assert.deepEqual(window.children,[view]);assert.equal(window.options.parent,f.parent);assert.equal(wc.loads,1);assert.equal(wc.destroyed,false);
 for(const options of [window.options.webPreferences,view.options.webPreferences]){assert.equal(options.sandbox,true);assert.equal(options.contextIsolation,true);assert.equal(options.nodeIntegration,false);assert.equal(options.webSecurity,true)}
 assert.equal(f.manager.openVerification(),true);assert.equal(windows.length,before+1);assert.equal(wc.loads,1);
 assert.doesNotMatch(JSON.stringify(f.manager.state()),/PRIVATE_SYNTHETIC_COOKIE|BDUSS|pwd=|abcd|https:/);
});
test('closing verification detaches the page for reuse and stop disposes an open verification window',async t=>{
 const f=await fixture(t);await f.manager.read('https://pan.baidu.com/s/1Synthetic');const view=f.manager.view,wc=view.webContents,files=f.manager.state().files;
 f.manager.openVerification();const first=windows.at(-1);first.destroy();assert.deepEqual(first.children,[]);assert.equal(wc.destroyed,false);assert.deepEqual(f.manager.state().files,files);assert.deepEqual(view.bounds,{x:0,y:0,width:1280,height:900});
 f.manager.openVerification();const second=windows.at(-1);assert.notEqual(first,second);assert.deepEqual(second.children,[view]);f.manager.stop();assert.equal(second.destroyed,true);assert.deepEqual(second.children,[]);assert.equal(wc.destroyed,true);assert.equal(f.manager.openVerification(),false);
});
test('verification respects network disablement without creating or revealing a window',async t=>{
 const f=await fixture(t);await f.manager.read('https://pan.baidu.com/s/1Synthetic');const before=windows.length;f.setOnline(false);assert.throws(()=>f.manager.openVerification(),/联网/);assert.equal(windows.length,before);assert.equal(f.manager.view.webContents.destroyed,false);
});
