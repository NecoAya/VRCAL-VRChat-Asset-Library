const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base='https://github.com/NecoAya/VRCAL-VRChat-Asset-Library';
function release(version='1.4.0'){
 const name=`VRC-Asset-Library-${version}-x64.exe`,tag=`v${version}`;
 return {tag_name:tag,draft:false,prerelease:false,html_url:`${base}/releases/tag/${tag}`,body:'Stable release fixture',assets:[{name,state:'uploaded',size:1024,digest:'sha256:'+'a'.repeat(64),browser_download_url:`${base}/releases/download/${tag}/${name}`}]};
}
function fixture(t){
 const tempRoot=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(tempRoot,'vrc-stable-release-')),executable=path.join(directory,'VRCAL.exe');
 fs.writeFileSync(executable,Buffer.alloc(1024,1));t.after(()=>{const resolved=path.resolve(directory);assert(path.isAbsolute(resolved));assert.equal(path.dirname(resolved).toLowerCase(),tempRoot.toLowerCase());assert(path.basename(resolved).startsWith('vrc-stable-release-'));assert.equal(fs.lstatSync(resolved).isSymbolicLink(),false);assert.equal(fs.realpathSync(resolved).toLowerCase(),resolved.toLowerCase());fs.rmSync(resolved,{recursive:true,force:true})});return executable;
}

test('stable release check offers 1.4.0 to 1.3.0 and preview.17 but does not reoffer it to the shipped stable version',async t=>{
 const {checkStableUpdate}=require('../scripts/check-stable-update.cjs'),executable=fixture(t);
 for(const [currentVersion,expectedStatus] of [['1.3.0','available'],['1.4.0-preview.17','available'],['1.4.0','up-to-date'],[require('../package.json').version,'up-to-date']]){
  const report=await checkStableUpdate({currentVersion,expectedVersion:'1.4.0',expectedStatus,executable,request:async()=>Response.json(release())});
  assert.equal(report.state.latestVersion,'1.4.0');assert.equal(report.state.releaseUrl,base+'/releases/tag/v1.4.0');assert.equal(report.noPayloadDownloaded,true);assert.equal(report.executableUnchanged,true);
 }
});

test('changing the preview GitHub flag alone cannot publish an update and the official fallback stays available',async t=>{
 const {AppUpdater}=require('../dist/main/main/updater'),executable=fixture(t);
 for(const metadata of [release('1.4.0-preview.17'),{...release(),assets:[{...release().assets[0],digest:null}]}]){
  const updater=new AppUpdater({version:'1.3.0',dataDir:path.join(path.dirname(executable),'profile'),roots:()=>[],packaged:false,canNetwork:()=>true,fetch:async()=>Response.json(metadata),quit:()=>{throw Error('A check must never quit')}});
  try{const state=await updater.check();assert.equal(state.status,'error');assert.equal(state.currentVersion,'1.3.0');assert.equal(state.releaseUrl,base+'/releases/latest');assert.equal(state.receivedBytes,0);await assert.rejects(()=>updater.download());}finally{updater.close()}
 }
});

test('failed stable checks retain the actual current version and the official manual fallback',async()=>{
 const {AppUpdater}=require('../dist/main/main/updater');
 const currentVersion=require('../package.json').version,updater=new AppUpdater({version:currentVersion,dataDir:path.join(os.tmpdir(),'unused-vrc-release-profile'),roots:()=>[],packaged:false,canNetwork:()=>true,fetch:async()=>{throw Error('Offline fixture')},quit:()=>{throw Error('A check must never quit')}});
 try{const state=await updater.check();assert.equal(state.status,'error');assert.equal(state.currentVersion,currentVersion);assert.equal(state.releaseUrl,base+'/releases/latest');assert.equal(state.canInstall,false);assert.equal(state.receivedBytes,0);}finally{updater.close()}
});
