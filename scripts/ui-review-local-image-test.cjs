/* Real Electron/preload/IPC. Only private synthetic sources and cached product
 * pages are used; browser launches, public fetches, Unity and recycling are blocked. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {_electron}=require('playwright'),{Store}=require('../dist/main/main/store'),{parseProduct}=require('../dist/main/main/online'),{MATCH_RULE_VERSION}=require('../dist/main/main/matching');
const repo=path.resolve(__dirname,'..'),startedAt=Date.now(),guid=crypto.randomUUID(),runDir=fs.mkdtempSync(path.resolve(repo,'../ui-review-local-image-'));
const source=path.join(runDir,'Private synthetic sources'),profile=path.join(runDir,'Private Library'),cache=path.join(profile,'cache');
const executablePath=process.env.VRC_TEST_APP_EXECUTABLE||require('electron'),packaged=!!process.env.VRC_TEST_APP_EXECUTABLE;
const checks=[],screenshots=[],renderErrors=[],audits=[],measurements=[],fixtures={},rawFixtures=[];
let app,page,runtime,phase='synthetic fixture setup';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function write(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return file}
function tree(directory){const result={};for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){result[entry.name+'/']='directory';for(const [name,hash]of Object.entries(tree(file)))result[entry.name+'/'+name]=hash}else result[entry.name]=digest(fs.readFileSync(file))}return result}
function crc(bytes){let value=~0;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0)}return(value^~0)>>>0}
function chunk(name,bytes){const type=Buffer.from(name),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(bytes.length);checksum.writeUInt32BE(crc(Buffer.concat([type,bytes])));return Buffer.concat([size,type,bytes,checksum])}
function png(color){const width=800,height=600,rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=y*(width*4+1)+1+x*4,mark=Math.abs(x-width/2)+Math.abs(y-height/2)<140;for(let c=0;c<3;c++)rows[at+c]=mark?245:color[c];rows[at+3]=255}const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))])}
for(const directory of [source,cache])fs.mkdirSync(directory,{recursive:true});
for(const [file,color]of Object.entries({'manual-blue.png':[35,110,190],'scanner-green.png':[30,145,95],'online-orange.png':[205,120,35],'member-purple.png':[135,80,175]}))write(path.join(cache,file),png(color));
const store=new Store(profile,[source]);
// Deliberately omit reviewShowLocalImage to verify the application's default.
store.saveSettings({onlineEnabled:true,language:'zh-CN',theme:'x',xThemeIntroduced:true,reviewSort:'name',reviewHeaderPinned:false,uiZoom:1});
function add(key,name,options={}){
 const file=path.join(source,name+(options.folder?'':'.zip'));
 if(options.folder)write(path.join(file,'Read only demonstration.txt'),'Synthetic local image review folder '+guid);else write(file,'READ ONLY synthetic source '+guid+' '+key);
 const asset=store.upsertScan({path:file,name,kind:options.folder?'folder':'archive',group:'Private local image QA',size:100,mtimeMs:Date.UTC(2026,9,23),localCategory:'服装',localAvatars:['Shinra'],hintUrls:[],...(options.preview?{previewFile:options.preview}:{})});
 const candidates=options.noCandidates?[]:[0,1].map(index=>{
  const url=`https://local-review-qa.example.org/products/${guid}/${key}/${index}`,title=name+' synthetic product '+index;
  const html='<!doctype html><title>'+title+'</title><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',url,name:title,brand:{name:'Private QA Creator'},category:'服装',description:'A synthetic cached product used only by local UI acceptance'})+'</script><h1>'+title+'</h1>';
  assert.equal(parseProduct(html,url).title,title);write(path.join(cache,'page-'+digest(url)+'.json'),JSON.stringify({at:Date.now(),url,html}));return{url,title,author:'Private QA Creator',coverFile:'online-orange.png'};
 });
 store.updateOnline(asset.id,{status:'review',title:name+' remote metadata',url:'https://example.org/existing-source/'+key,coverFile:'online-orange.png',coverUrl:'https://example.org/remote-image-only.png',matchingCheckedVersion:MATCH_RULE_VERSION,candidates});
 store.updateManual([asset.id],{notes:'KEEP NOTES '+key,tags:['KEEP '+guid],favorite:true,...(options.manual?{coverFile:options.manual}:{})});
 const fixture={id:asset.id,name,path:file,candidates,key};fixtures[key]=fixture;rawFixtures.push(fixture);return fixture;
}
add('manual','Local QA 00 Manual',{manual:'manual-blue.png',preview:'scanner-green.png'});
add('scanner','Local QA 01 Scanner',{preview:'scanner-green.png'});
add('onlineOnly','Local QA 02 Online only');
add('missing','Local QA 03 Missing local',{manual:'missing-local.png'});
add('localOnly','Local QA 04 Local only',{manual:'manual-blue.png',noCandidates:true});
add('merged','Local QA 05 Merged',{folder:true,preview:'scanner-green.png'});
add('member','Local QA 05 Merged_Shinra',{manual:'member-purple.png'});
add('confirm','Local QA 06 Confirm',{manual:'manual-blue.png'});
const projected=store.list({view:'materials',status:'review',sort:'name',limit:100}).items;
const merged=projected.find(asset=>asset.members?.some(member=>member.id===fixtures.member.id));assert(merged,'The synthetic folder and archive must genuinely aggregate');fixtures.merged.id=merged.id;
const expectedIds=projected.map(asset=>asset.id),expectedCandidates=Object.fromEntries(projected.map(asset=>[asset.id,(asset.online.candidates??[]).map(candidate=>candidate.url)]));
assert.equal(expectedIds.length,7);const annotations=Object.fromEntries(rawFixtures.map(fixture=>{const manual=store.getRaw(fixture.id).manual;return[fixture.id,{notes:manual.notes,tags:manual.tags,favorite:manual.favorite,coverFile:manual.coverFile??null}]}));store.close();
const beforeSources=tree(source);
const copy={
 'zh-CN':{local:'本地',note:'仅供对照，不会确认商品来源',view:'查看本地图片',close:'关闭本地图片预览',dialog:'本地图片预览'},
 en:{local:'Local',note:'For comparison only; does not confirm a product source',view:'View local image',close:'Close local image preview',dialog:'Local image preview'},
 ja:{local:'ローカル',note:'比較専用です。商品の出典は確定しません',view:'ローカル画像を見る',close:'ローカル画像プレビューを閉じる',dialog:'ローカル画像プレビュー'}
};
const row=key=>page.locator('.review-row[data-asset-id="'+fixtures[key].id+'"]'),local=key=>row(key).locator('[data-review-local-image]'),dialog=()=>page.locator('.review-local-image-preview[role="dialog"]');
function pass(label){checks.push(label);console.log('REVIEW LOCAL IMAGE PASS:',label)}
async function wait(predicate,message){for(let i=0;i<160;i++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,60))}throw new Error(message)}
async function order(){return page.locator('.review-row').evaluateAll(rows=>rows.map(row=>({id:row.dataset.assetId,urls:[...row.querySelectorAll('[data-candidate-url]')].map(candidate=>candidate.dataset.candidateUrl)})))}
async function expectRows(ids){await wait(async()=>await page.locator('.review-list').getAttribute('aria-busy')==='false'&&JSON.stringify((await order()).map(row=>row.id))===JSON.stringify(ids),'Review row order changed or did not settle');for(const row of await order())assert.deepEqual(row.urls,expectedCandidates[row.id])}
async function recordState(key){return page.evaluate(async id=>{const asset=await window.library.get(id);return{status:asset.online.status,url:asset.online.url??null,sourceUrl:asset.manual.sourceUrl??null,confirmed:asset.online.confirmedSource===true,manualCover:asset.manual.coverFile??null,preview:asset.previewFile??null,candidates:(asset.online.candidates??[]).map(candidate=>candidate.url)}},fixtures[key].id)}
async function allStates(){const result={};for(const key of ['manual','scanner','onlineOnly','missing','localOnly','merged','confirm'])result[key]=await recordState(key);return result}
async function capture(name){const file=path.join(runDir,name+'.png'),bytes=await app.evaluate(async({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});await new Promise(resolve=>setTimeout(resolve,80));return(await win.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64')});write(file,Buffer.from(bytes,'base64'));screenshots.push(file)}
async function launch(){
 const env={...process.env,VRC_LIBRARY_DATA_DIR:profile,VRC_LIBRARY_ROOT:source,VRC_LIBRARY_LOCATION_FILE:path.join(runDir,'private-location.json'),VRC_LIBRARY_NO_NETWORK:'1',VRC_LIBRARY_NO_AUTOSCAN:'1',VRC_LIBRARY_NO_RELAUNCH:'1',VRC_LIBRARY_NO_EDITOR_LAUNCH:'1',VRC_LIBRARY_TEST_HIDDEN:'1'};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath,args:packaged?[]:[repo],env});
 runtime=await app.evaluate(({app,BrowserWindow,net,shell})=>{const qa=globalThis.__reviewLocalImageQA={publicFetches:[],external:[],trash:[],openPaths:[]},original=net.fetch.bind(net);net.fetch=async(raw,init)=>{const url=typeof raw==='string'?raw:raw?.url||String(raw);if(url.startsWith('file:'))return original(raw,init);qa.publicFetches.push(url);throw new Error('Only private cached product pages and local images may be used')};shell.openExternal=async url=>{qa.external.push(url);throw new Error('No external browser in local-image QA')};shell.trashItem=async file=>{qa.trash.push(file);throw new Error('No recycling in local-image QA')};shell.openPath=async file=>{qa.openPaths.push(file);throw new Error('No Unity or native file launch in local-image QA')};const win=BrowserWindow.getAllWindows()[0];if(win){win.setSize(1480,940);win.webContents.setBackgroundThrottling(false)}return{version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData'),appPath:app.getAppPath()}});
 assert.equal(runtime.version,'1.2.9');assert.equal(runtime.packaged,packaged);assert.equal(path.resolve(runtime.userData).toLowerCase(),path.resolve(profile).toLowerCase());
 page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',error=>renderErrors.push(error.stack||error.message));await page.locator('.asset-card').first().waitFor();
 await page.evaluate(()=>window.library.setViewPreferences({language:'zh-CN',theme:'x',reviewHeaderPinned:false}));await page.evaluate(()=>window.library.setZoom(1));
 await page.locator('.sidebar .nav-item').filter({hasText:'匹配确认'}).click();await page.locator('.review-row').first().waitFor();
}
async function audit(){const qa=await app.evaluate(()=>globalThis.__reviewLocalImageQA);for(const values of Object.values(qa))assert.deepEqual(values,[]);const snapshot=await page.evaluate(()=>window.library.snapshot());assert.deepEqual(snapshot.settings.roots,[source]);assert.deepEqual(tree(source),beforeSources);return qa}
async function close(){if(app){audits.push(await audit());await app.close();app=undefined}}
async function toggle(enabled){
 await page.locator('.settings-button').click();const settings=page.getByRole('dialog',{name:'设置与备份',exact:true});await settings.waitFor();const checkbox=settings.locator('[data-setting="review-local-image"] input[type="checkbox"]');await checkbox.scrollIntoViewIfNeeded();if(await checkbox.isChecked()!==enabled)await checkbox.click();
 await wait(async()=>(await page.evaluate(()=>window.library.snapshot())).settings.reviewShowLocalImage===enabled&&await checkbox.isEnabled()&&await checkbox.isChecked()===enabled,'The real Settings checkbox did not persist');
 await settings.getByRole('button',{name:'关闭弹窗',exact:true}).click();await settings.waitFor({state:'hidden'});
}
async function imageLoaded(key,file){const opener=local(key).locator('button');await opener.scrollIntoViewIfNeeded();const image=local(key).locator('img');await wait(async()=>await image.evaluate(image=>image.complete&&image.naturalWidth===800),'Local cache image did not load: '+key);assert.equal(await image.getAttribute('src'),'library-cover://cache/'+encodeURIComponent(file));assert.equal(await local(key).locator('.review-local-image-info h4').innerText(),fixtures[key].name);return opener}
async function openLocal(language='zh-CN',key='manual'){
 const opener=local(key).locator('button');await opener.scrollIntoViewIfNeeded();await opener.focus();await opener.click();await dialog().waitFor();await wait(async()=>await dialog().locator('img').evaluate(image=>image.complete&&image.naturalWidth===800),'The full-size local preview did not load');
 assert.equal(await dialog().getAttribute('aria-label'),copy[language].dialog);assert.equal(await dialog().getAttribute('aria-modal'),'true');
 assert.equal(await dialog().locator('img').getAttribute('src'),'library-cover://cache/manual-blue.png');assert.equal(await dialog().locator('[data-review-action="accept"],[data-candidate-url]').count(),0);return opener;
}
async function closePreview(language,opener,escape=false){if(escape)await page.keyboard.press('Escape');else await dialog().getByRole('button',{name:copy[language].close,exact:true}).click();await dialog().waitFor({state:'hidden'});assert.equal(await opener.evaluate(element=>document.activeElement===element),true,'Closing must restore focus to the local-image opener')}
function report(ok,error){return{ok,error,phase,checks,screenshots,renderErrors,measurements,audits,runtime,packaged,executablePath,profile,source,runDir,beforeSources,afterSources:tree(source),sourceUnchanged:JSON.stringify(tree(source))===JSON.stringify(beforeSources),genuineRendererPreloadIPC:true,syntheticCachedProductConfirmation:true,noPublicNetwork:true,unityLaunched:false,recycledFiles:0,targetDurationMs:180000,durationMs:Date.now()-startedAt}}

(async()=>{
 phase='default off';await launch();await expectRows(expectedIds);assert.equal((await page.evaluate(()=>window.library.snapshot())).settings.reviewShowLocalImage,false);assert.equal(await page.locator('[data-review-local-image]').count(),0);const before=await allStates();await capture('review-local-image-default-off');pass('default-setting-is-off-and-original-product-order-and-count-are-unchanged');
 phase='real settings checkbox and local provenance';await toggle(true);await expectRows(expectedIds);assert.equal(await page.locator('[data-review-local-image]').count(),6);
 for(const key of ['manual','scanner','missing','localOnly','merged','confirm'])assert.equal(await row(key).locator('.review-candidates').evaluate(element=>element.firstElementChild.hasAttribute('data-review-local-image')),true);
 assert.equal(await local('manual').locator('[data-candidate-url],[data-review-action="accept"]').count(),0);assert.equal(await local('manual').evaluate(element=>element.classList.contains('review-candidate')),false);
 await imageLoaded('manual','manual-blue.png');await imageLoaded('scanner','scanner-green.png');await imageLoaded('merged','member-purple.png');assert.equal(await local('onlineOnly').count(),0);
 await local('missing').scrollIntoViewIfNeeded();await wait(async()=>await local('missing').locator('.review-local-image-unavailable').count()===1,'A missing local file did not show its unavailable placeholder');assert.equal(await local('missing').locator('img').count(),0);assert.equal(await local('missing').locator('button').isDisabled(),true);
 assert.equal(await row('localOnly').locator('[data-candidate-url],[data-review-action="accept"]').count(),0);assert.equal(await row('localOnly').locator('.review-no-candidates').count(),1);await capture('review-local-image-provenance-and-empty-state');
 pass('settings-checkbox-adds-local-first-with-manual-and-member-priority-scanner-preview-no-online-fallback-and-honest-missing-or-no-candidate-states');

 phase='local-only dialog keyboard and unchanged source';const opener=await openLocal();const closeButton=dialog().getByRole('button',{name:copy['zh-CN'].close,exact:true}),region=dialog().locator('[role="region"][tabindex="0"]');
 assert.equal(await closeButton.evaluate(element=>document.activeElement===element),true);await page.keyboard.press('Tab');assert.equal(await region.evaluate(element=>document.activeElement===element),true);await page.keyboard.press('Tab');assert.equal(await closeButton.evaluate(element=>document.activeElement===element),true);await page.keyboard.press('Shift+Tab');assert.equal(await region.evaluate(element=>document.activeElement===element),true);await capture('review-local-image-preview-keyboard');await closePreview('zh-CN',opener,true);assert.deepEqual(await allStates(),before);pass('local-preview-uses-only-cache-image-traps-tab-closes-with-escape-restores-focus-and-does-not-change-any-source');

 phase='enabled preference persists after real restart';await close();await launch();await expectRows(expectedIds);assert.equal((await page.evaluate(()=>window.library.snapshot())).settings.reviewShowLocalImage,true);assert.equal(await page.locator('[data-review-local-image]').count(),6);pass('enabled-setting-and-local-cards-survive-a-real-application-restart');
 phase='three-language four-theme viewing';
 for(const language of ['zh-CN','en','ja'])for(const theme of ['x','x-light','nasa','swiss']){
  await page.evaluate(value=>window.library.setViewPreferences(value),{language,theme});await page.waitForFunction(value=>document.documentElement.lang===value.language&&document.documentElement.dataset.theme===value.theme,{language,theme});
  await imageLoaded('manual','manual-blue.png');assert.equal(await local('manual').locator('.review-local-image-badge').innerText(),copy[language].local);assert.equal(await local('manual').locator('.review-local-image-info>p').innerText(),copy[language].note);assert.equal(await local('manual').locator('button').getAttribute('aria-label'),copy[language].view);
  const opening=await openLocal(language);const state=await dialog().evaluate(element=>({horizontalOverflow:element.scrollWidth>element.clientWidth+1,filter:getComputedStyle(element.querySelector('img')).filter}));assert.equal(state.horizontalOverflow,false);assert.equal(state.filter,'none');
  if((language==='zh-CN'&&['x','x-light'].includes(theme))||(language==='ja'&&theme==='x'))await capture('review-local-image-preview-'+language+'-'+theme);
  await closePreview(language,opening);await expectRows(expectedIds);pass('local-card-and-preview-localized-operable-and-product-order-preserved-'+language+'-'+theme);
 }
 phase='980px at 200 percent';await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(980,800));await page.evaluate(()=>window.library.setZoom(2));
 for(const language of ['zh-CN','en','ja']){
  await page.evaluate(value=>window.library.setViewPreferences(value),{language,theme:'x-light'});await page.waitForFunction(value=>document.documentElement.lang===value,language);
  const opening=await openLocal(language);const geometry=await dialog().evaluate(element=>{const bounds=element.getBoundingClientRect(),button=element.querySelector('button'),rect=button.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return{viewport:{width:innerWidth,height:innerHeight},bounds:{x:bounds.x,y:bounds.y,right:bounds.right,bottom:bounds.bottom},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1||element.scrollWidth>element.clientWidth+1,closeClickable:hit===button||button.contains(hit)}});
  assert.equal(geometry.horizontalOverflow,false);assert(geometry.closeClickable&&geometry.bounds.x>=0&&geometry.bounds.y>=0&&geometry.bounds.right<=geometry.viewport.width+1&&geometry.bounds.bottom<=geometry.viewport.height+1);measurements.push({language,...geometry});await capture('review-local-image-980-200pct-'+language);await closePreview(language,opening,language==='en');
 }
 await page.evaluate(()=>window.library.setZoom(1));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1480,940));await page.evaluate(()=>window.library.setViewPreferences({language:'zh-CN',theme:'x'}));assert.deepEqual(await allStates(),before);pass('three-language-980px-200-percent-images-remain-viewable-closeable-and-do-not-create-horizontal-page-overflow');

 phase='real cached product confirmation';await page.evaluate(()=>window.library.resumeEnrichment());await row('confirm').locator('[data-review-action="accept"]').first().click();
 await wait(async()=>(await page.evaluate(id=>window.library.get(id),fixtures.confirm.id)).online.status==='matched','Real cached product confirmation did not complete');await expectRows(expectedIds.filter(id=>id!==fixtures.confirm.id));await page.evaluate(()=>window.library.pauseEnrichment());
 const afterConfirm=await allStates();for(const key of Object.keys(before).filter(key=>key!=='confirm'))assert.deepEqual(afterConfirm[key],before[key]);pass('real-cached-product-confirmation-removes-only-its-row-and-keeps-other-rows-candidate-order-and-sources');

 phase='disabled preference persists after restart';await toggle(false);assert.equal(await page.locator('[data-review-local-image]').count(),0);await close();await launch();await expectRows(expectedIds.filter(id=>id!==fixtures.confirm.id));assert.equal((await page.evaluate(()=>window.library.snapshot())).settings.reviewShowLocalImage,false);assert.equal(await page.locator('[data-review-local-image]').count(),0);await close();pass('turning-the-setting-off-persists-on-restart-without-restoring-confirmed-rows');
 const persisted=new Store(profile,[source]);for(const fixture of rawFixtures){const manual=persisted.getRaw(fixture.id).manual;assert.deepEqual({notes:manual.notes,tags:manual.tags,favorite:manual.favorite,coverFile:manual.coverFile??null},annotations[fixture.id])}persisted.close();
 assert.deepEqual(tree(source),beforeSources);assert.deepEqual(renderErrors,[]);pass('all-synthetic-source-paths-sha256-manual-covers-notes-and-tags-are-retained-with-no-public-network-unity-recycle-or-render-errors');
 phase='complete';write(path.join(runDir,'report.json'),JSON.stringify(report(true),null,2));console.log(JSON.stringify({ok:true,checks:checks.length,screenshots:screenshots.length,report:path.join(runDir,'report.json')}));
})().catch(async error=>{console.error(error);if(app){await capture('failure').catch(()=>{});try{write(path.join(runDir,'failure-dom.txt'),await page.locator('body').innerText())}catch{}try{audits.push(await app.evaluate(()=>globalThis.__reviewLocalImageQA))}catch{}await app.close().catch(()=>{});app=undefined}write(path.join(runDir,'report.json'),JSON.stringify(report(false,error.stack||String(error)),null,2));process.exitCode=1});
