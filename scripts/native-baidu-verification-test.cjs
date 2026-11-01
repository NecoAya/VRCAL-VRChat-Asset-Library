// Real Electron view/window lifecycle, entirely synthetic and offline.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),run=fs.mkdtempSync(path.resolve(repo,'../native-baidu-verification-'));
process.env.VRC_LIBRARY_TEST_HIDDEN='1';app.setPath('userData',path.join(run,'Profile'));app.on('window-all-closed',()=>{});
let manager,parent;const checks=[];
app.whenReady().then(async()=>{
 const {BaiduDownloads}=require('../dist/main/main/baidu-downloads');
 const remote=session.fromPartition('synthetic-baidu-verification-'+Date.now());
 await remote.protocol.handle('https',request=>new Response(new URL(request.url).hostname==='pan.baidu.com'?'<title>Synthetic verification</title><dd class="g-clearfix"><a class="filename" title="Synthetic.zip">Synthetic.zip</a><span class="file-size">4 B</span></dd>':'Not found',{status:new URL(request.url).hostname==='pan.baidu.com'?200:404,headers:{'Content-Type':'text/html; charset=utf-8'}}));
 await remote.cookies.set({url:'https://pan.baidu.com',name:'BDUSS',value:'SYNTHETIC_TEST_ONLY',path:'/',secure:true});
 const dataDir=path.join(run,'Library');fs.mkdirSync(dataDir);
 parent=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 manager=new BaiduDownloads({dataDir,parent:()=>parent,roots:()=>[],session:async()=>remote,canNetwork:()=>true,changed(){}});
 await manager.read('https://pan.baidu.com/s/1Synthetic?pwd=abcd');assert.equal(BrowserWindow.getAllWindows().length,1);const view=manager.view,wc=view.webContents,url=wc.getURL();
 assert.equal(manager.openVerification(),true);const window=BrowserWindow.getAllWindows().find(w=>w!==parent);assert(window);assert(window.contentView.children.includes(view));assert.equal(wc.getURL(),url);assert.equal(wc.session,remote);assert.equal(manager.state().tasks.length,0);
 const prefs=wc.getLastWebPreferences();assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.sandbox,true);assert.equal(prefs.webSecurity,true);
 checks.push('An explicit action attaches the exact existing sandboxed share view without loading another page or starting a download');
 manager.openVerification();assert.equal(BrowserWindow.getAllWindows().length,2);checks.push('Repeated verification reuses one owned window');
 const closed=new Promise(resolve=>window.once('closed',resolve));window.close();await closed;assert.equal(wc.isDestroyed(),false);assert.equal(wc.getURL(),url);assert.deepEqual(view.getBounds(),{x:0,y:0,width:1280,height:900});
 checks.push('Native close detaches and preserves the page for the next app retry');
 manager.openVerification();assert.equal(BrowserWindow.getAllWindows().length,2);const destroyed=new Promise(resolve=>wc.once('destroyed',resolve));manager.stop();let timer;try{await Promise.race([destroyed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned share view did not close')),5000)})])}finally{clearTimeout(timer)}assert.equal(wc.isDestroyed(),true);assert.equal(BrowserWindow.getAllWindows().length,1);
 checks.push('Stop disposes both the verification window and the remote view');
 await manager.shutdown();manager=null;parent.destroy();parent=null;
 const report={ok:true,synthetic:true,noNetwork:true,checks,version:require('../package.json').version};fs.writeFileSync(path.join(run,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,report:path.join(run,'report.json')}));app.exit(0);
}).catch(async error=>{console.error(error);try{await manager?.shutdown()}catch{}if(parent&&!parent.isDestroyed())parent.destroy();fs.writeFileSync(path.join(run,'report.json'),JSON.stringify({ok:false,checks,error:error.message},null,2));app.exit(1)});
