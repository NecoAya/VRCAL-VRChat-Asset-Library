// Exercise the real Electron UI offline with an isolated library and source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {_electron}=require('playwright'),{Store}=require('../dist/main/main/store');
const {RELEASE_NOTES}=require('../dist/main/shared/release-notes');
const repo=path.resolve(__dirname,'..'),run=fs.mkdtempSync(path.resolve(repo,'../ui-release-notes-'));
const root=path.join(run,'素材 日本語 😀'),profile=path.join(run,'Library');
fs.mkdirSync(root,{recursive:true});
const store=new Store(profile,[root]);
store.saveSettings({theme:'x',language:'zh-CN',onlineEnabled:false,xThemeIntroduced:true});
let first;
for(let i=0;i<24;i++){
  const name=`Dress ${String(i).padStart(2,'0')} 日本語 😀.txt`,file=path.join(root,name);
  fs.writeFileSync(file,'SYNTHETIC READ-ONLY SOURCE '+i);
  const asset=store.upsertScan({path:file,name,kind:'file',group:'Synthetic',size:20,mtimeMs:1,localCategory:'服装',localAvatars:[],hintUrls:[]});
  first??=asset;
}
store.updateManual([first.id],{notes:'KEEP ANNOTATIONS',favorite:true});store.close();
function manifest(){return Object.fromEntries(fs.readdirSync(root).sort().map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]))}
const before=manifest(),checks=[],requests=[];let app,page;
async function launch(){
  app=await _electron.launch({executablePath:process.env.VRC_TEST_APP_EXECUTABLE||process.env.VRC_TEST_ELECTRON||require('electron'),args:process.env.VRC_TEST_APP_EXECUTABLE?[]:[repo],env:{...process.env,VRC_LIBRARY_DATA_DIR:profile,VRC_LIBRARY_ROOT:root,VRC_LIBRARY_NO_NETWORK:'1',VRC_LIBRARY_NO_AUTOSCAN:'1',VRC_LIBRARY_NO_RELAUNCH:'1',VRC_LIBRARY_TEST_HIDDEN:'1'}});
  page=await app.firstWindow();page.on('request',request=>{if(/^https?:/i.test(request.url()))requests.push(request.url())});
  await page.locator('.asset-card').first().waitFor({timeout:25000});
  await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
}
async function capture(name){await app.evaluate(async({BrowserWindow},file)=>{
  const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/renderer/index.html'));
  await w.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});
  await new Promise(resolve=>setTimeout(resolve,100));
  process.mainModule.require('node:fs').writeFileSync(file,(await w.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());
},path.join(run,name+'.png'))}
async function size(width,height){await app.evaluate(({BrowserWindow},{width,height})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/renderer/index.html')).setSize(width,height),{width,height})}
async function appearance(){
  if(!await page.locator('#workspace-appearance').isVisible())await page.locator('.appearance-toggle').click();
}
async function language(value){
  await appearance();
  await page.locator('[data-language-selector="header"]').selectOption(value);
  await page.waitForFunction(value=>document.documentElement.lang===value,value);
  await page.keyboard.press('Escape');
}
async function changeTheme(value){
  await appearance();
  await page.locator('.theme-switch select').selectOption(value);
  await page.waitForFunction(value=>document.documentElement.dataset.theme===value,value);
  await page.keyboard.press('Escape');
}
(async()=>{
  await launch();await size(1480,940);
  await page.locator('[data-asset-search]').fill('Dress');
  // The gallery debounces a changed query and restores that query's own
  // selection. Wait for actual search evidence before selecting its results.
  await page.locator('.card-search-evidence').first().waitFor();
  await page.waitForFunction(()=>document.querySelector('.asset-grid')?.getAttribute('aria-busy')==='false');
  await page.locator('.asset-card').first().locator('.card-select input').check();
  await page.locator('.asset-card.selected').waitFor();
  await page.locator('.updates-nav').click();await page.locator('.release-running strong').filter({hasText:require('../package.json').version}).waitFor();
  assert.equal(await page.locator('.release-card').count(),RELEASE_NOTES.length);
  assert.equal(await page.locator('.release-card[data-running="true"]').count(),1);
  assert.equal(await page.locator('.updates-nav').getAttribute('aria-current'),'page');
  checks.push('Sidebar opens offline bundled history with actual runtime version and bundled chronological records');
  await page.locator('[data-release-channel="stable"]').click();assert.equal(await page.locator('.release-card').count(),RELEASE_NOTES.filter(note=>note.channel==='stable').length);
  assert.equal(await page.locator('.release-card[data-running="true"]').count(),1);
  await page.locator('.release-search').fill('1.1.0');assert.equal(await page.locator('.release-card').count(),1);
  await page.locator('[data-release-channel="local"]').click();await page.locator('.release-empty').waitFor();
  await page.locator('.release-empty button').click();assert.equal(await page.locator('.release-card').count(),RELEASE_NOTES.length);
  checks.push('Version search, channel filtering, empty state and filter reset work through actual controls');
  await page.locator('.sidebar-scroll nav .nav-item').first().click();
  assert.equal(await page.locator('[data-asset-search]').inputValue(),'Dress');
  assert.equal(await page.locator('.asset-card.selected').count(),1);
  assert.equal((await page.evaluate(id=>window.library.get(id),first.id)).manual.notes,'KEEP ANNOTATIONS');
  checks.push('Returning to the gallery preserves its query, selection and existing annotations');
  await page.locator('.settings-button').click();await page.locator('[data-update-action="history"]').click();
  await page.locator('.release-page').waitFor();assert.equal(await page.getByRole('dialog').count(),0);
  checks.push('Settings > App updates opens the same history page and closes the settings dialog');
  const titles={'zh-CN':'版本时间线',en:'Version timeline',ja:'バージョンの歩み'};
  for(const locale of ['zh-CN','en','ja'])for(const theme of ['x','x-light','nasa','swiss']){
    await language(locale);await changeTheme(theme);
    assert.equal(await page.locator('.release-intro h2').innerText(),titles[locale]);
    assert.equal(await page.locator('.release-page').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
    assert.equal(await page.locator('.release-card').count(),RELEASE_NOTES.length);
    await capture('history-'+locale+'-'+theme);
    checks.push(locale+' '+theme+' history is translated, readable and fits its viewport');
  }
  await language('en');await page.locator('.release-search').fill('hierarchy');
  assert.equal(await page.locator('[data-release-version="1.2.0-local.2"]').count(),1);
  await page.locator('.release-search').fill('');await size(980,800);await page.evaluate(()=>window.library.setZoom(2));
  assert.equal(await page.locator('.release-page').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  await page.locator('[data-release-version="1.0.0"] h3').scrollIntoViewIfNeeded();
  await page.locator('.release-search').scrollIntoViewIfNeeded();await page.locator('.release-search').fill('1.1.0');
  assert.equal(await page.locator('.release-card').count(),1);
  await capture('history-980-200pct');
  checks.push('980px at 200% keeps history scrollable and its search usable without horizontal overflow');
  await page.evaluate(()=>window.library.setZoom(1));await size(1480,940);await language('ja');await changeTheme('x-light');
  await app.close();app=null;await launch();
  assert.equal(await page.locator('html').getAttribute('lang'),'ja');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'x-light');
  await page.locator('.updates-nav').click();await page.locator('.release-running strong').filter({hasText:require('../package.json').version}).waitFor();
  assert.equal(await page.locator('.release-card').count(),RELEASE_NOTES.length);
  assert.equal((await page.evaluate(id=>window.library.get(id),first.id)).manual.notes,'KEEP ANNOTATIONS');
  assert.deepEqual(manifest(),before);assert.deepEqual(requests,[]);
  checks.push('Restart keeps preferences and annotations; history remains available offline and synthetic source names/hashes are unchanged');
  await app.close();app=null;
  fs.writeFileSync(path.join(run,'report.json'),JSON.stringify({ok:true,checks,run,sourceUnchanged:true,httpRequests:requests,packaged:!!process.env.VRC_TEST_APP_EXECUTABLE},null,2));
  console.log(JSON.stringify({ok:true,checks:checks.length,report:path.join(run,'report.json')}));
})().catch(async error=>{console.error(error);fs.writeFileSync(path.join(run,'report.json'),JSON.stringify({ok:false,checks,error:error.stack},null,2));if(app){await capture('failure').catch(()=>{});await app.close()}process.exitCode=1});
