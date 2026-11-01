import {XianyuWorkspace,prepareXianyuSessionMigration} from './xianyu';
import {LinkInboxStore} from './link-inbox-store';
import {LinkInboxMonitor} from './link-inbox-monitor';
import {InboxAccess} from './inbox-access';
import {inboxConsentNotice} from '../shared/inbox-policy';
import type {InboxState} from '../shared/link-inbox';
import {safeStorage} from 'electron';
import {prepareAssetRecycle,executeAssetRecycle} from './asset-recycle';
import type {AssetRecycleResult} from '../shared/recycle-contracts';
import {normalizeContextMenuPreferences} from '../shared/context-menu';
import {XianyuAccess,XIANYU_USAGE_NOTICE} from './xianyu-access';
import {inspectProjectProducts,clearProjectProductCache,projectProductInput} from './project-products';
import type {ProjectImportOptions} from '../shared/project-contracts';
import {BaiduDownloads} from './baidu-downloads';
import {BaiduWorkspace,prepareBaiduSessionMigration} from './baidu-workspace';
import {CloudCatalog} from './cloud-catalog';
import type {CloudCapture,CloudQuery} from '../shared/cloud-contracts';
import {acknowledgeUpdateStartup} from './update-receipt';
import {Updater} from './updater';
import {communityUrl,QQ_GROUP_NUMBER} from '../shared/community';
import {LaunchInvites} from './launch-invites';
import {translate,normalizeLanguage,localizeDialogOptions} from '../shared/i18n';
import {app,BrowserWindow,ipcMain,dialog,clipboard,shell,protocol,net,Menu,session} from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store,safeBoothDownloadPath} from './store';
import {Scanner} from './scanner';
import {assertSourceSeparation,normalizeSourceRoots,sourcePathKey} from './source-roots';
import {assertSafeWrite,safeCoverPath,copyCover} from './safety';
import {EnrichmentQueue,publicHttpsUrl} from './online';
import {ProductPreview} from './preview';
import {BoothWorkspace,prepareBoothSessionMigration} from './booth-workspace';
import {matchingCatalog} from './matching-catalog';
import {assetLocation} from './asset-location';
import {importBoothDownload,importCompletedDownload} from './booth-import';
import {canonicalSourceKey,searchClue,extractBoothIds} from './matching';
import {isOrganizationalAsset} from './organization';
import {inspectProjectMaterials,clearProjectMaterialCache} from './project-materials';
import {ProjectImports,listProjectFiles} from './project-import';
import {registerProject} from './project-registration';
import {PublicPluginDownloads} from './public-plugins';
import {ProductDiscovery} from './discovery';
import {DiscoveryAiWorkspace,prepareAiWebSessionMigration} from './discovery-ai-workspace';
import {createPublicPageFetch,createPublicPluginFetch} from './public-plugin-request';
import {ModelPreviewWindow} from './model-preview-window';
import {AiService} from './ai-service';
import {AiClassificationQueue} from './ai-classification-queue';
import {AI_PROVIDERS,type AiSettingsUpdate} from '../shared/ai-contracts';
import {UnityDiagnosticsMonitor} from './unity-diagnostics';
import {pluginLink,publicPlugin} from '../shared/public-plugins';
import {smallFile,noLinks,relativeAssetPath,validateProject} from './project-access';
import {editorVersion} from './unity-editors';
import {ProxyMonitor} from './proxy';
import {readLocation,writeLocation,rememberLibraryLocation,prepareSessionData,assertUserStorage,copyLibraryData} from './storage';
import {probeLibrary,existingLibraryDirectory} from './library-startup';
import type {BrowserCookieSnapshot} from './storage';
import {CATEGORIES,REVIEW_SORTS,THEME_IDS,LANGUAGE_IDS,normalizeTheme,THEME_BACKGROUNDS} from '../shared/contracts';
import type {AssetRecord,AssetQuery,LibraryEvent,ManualInfo,BoothTab} from '../shared/contracts';

const DEFAULT_ROOT='E:\\VRChat';
const legacyDir=path.join(process.env.LOCALAPPDATA || app.getPath('userData'),'VRChatAssetLibrary');
const testProfile=!!process.env.VRC_LIBRARY_DATA_DIR;
const launcherDir=process.env.PORTABLE_EXECUTABLE_DIR || (app.isPackaged?path.dirname(app.getPath('exe')):path.resolve(__dirname,'../../..'));
const locationFile=process.env.VRC_LIBRARY_LOCATION_FILE || path.join(launcherDir,'VRC-library-location.json');
const fallbackLocationFile=path.join(process.env.LOCALAPPDATA || app.getPath('userData'),'VRC-library-location.json');
const localLocation=readLocation(locationFile);
const location=localLocation.dataDir?localLocation:readLocation(fallbackLocationFile);
let dataDir=path.resolve(process.env.VRC_LIBRARY_DATA_DIR || location.dataDir || legacyDir);
const initialRoots=[process.env.VRC_LIBRARY_ROOT || DEFAULT_ROOT];
const recoverLocation=!testProfile&&!!location.dataDir&&!probeLibrary(dataDir,[DEFAULT_ROOT,...initialRoots]).ok;
// A missing/disconnected remembered profile must not be recreated by Chromium
// before the person has selected or reconnected their actual library.
const chromiumDir=recoverLocation?fs.mkdtempSync(path.join(app.getPath('temp'),'vrcal-location-recovery-')):dataDir;
// Keep the original user library protected even when a test profile or another library is chosen.
function contained(parent:string,child:string){const rel=path.relative(path.resolve(parent),path.resolve(child));return !rel || (!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))}
if(contained(DEFAULT_ROOT,chromiumDir))throw new Error('应用数据目录不能放在素材目录内。');
assertSafeWrite(chromiumDir,chromiumDir,[DEFAULT_ROOT,...initialRoots]);
app.setPath('userData',chromiumDir);
// Chromium captures these paths during ready. Changing them afterwards leaves
// local toolbars and cached images using a different profile from the library.
app.setPath('sessionData',prepareSessionData(chromiumDir,[DEFAULT_ROOT,...initialRoots]));
const crashDir=assertSafeWrite(path.join(chromiumDir,'crashes'),chromiumDir,[DEFAULT_ROOT,...initialRoots]);fs.mkdirSync(crashDir,{recursive:true});app.setPath('crashDumps',crashDir);
protocol.registerSchemesAsPrivileged([{scheme:'library-cover',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('VRC素材库');
let window:BrowserWindow|null=null;
let closing=false;
let migrating=false;
let recycleOperation:Promise<AssetRecycleResult>|undefined;
let proxy:ProxyMonitor;
let preview:ProductPreview;
let booth:BoothWorkspace;let sourceChanges:Promise<void>=Promise.resolve();
let updater:Updater;
const launchInvites=new LaunchInvites({dataDir:()=>dataDir,roots:protectedRoots,openExternal:url=>shell.openExternal(url)});
let xianyu:XianyuWorkspace;let xianyuAccess:XianyuAccess;
let inbox:LinkInboxStore;let inboxAccess:InboxAccess;let inboxMonitor:LinkInboxMonitor;let inboxDownloadId:string|undefined;let inboxReadGeneration=0;let inboxSuspensions=0;
let publicPlugins:PublicPluginDownloads;let pluginCancelGeneration=0;let pluginInstall:Promise<import('../shared/project-contracts').ProjectImportJob>|undefined;
let modelPreview:ModelPreviewWindow;
let discovery:ProductDiscovery;let discoveryAi:DiscoveryAiWorkspace;
let aiService:AiService;let aiQueue:AiClassificationQueue;let unityDiagnostics:UnityDiagnosticsMonitor;
let projectImports:ProjectImports;let baidu:BaiduWorkspace;let baiduDownloads:BaiduDownloads;let cloud:CloudCatalog;
let store:Store;let scanner:Scanner;let queue:EnrichmentQueue;let debounce:ReturnType<typeof setTimeout>|undefined;
function emit(event:LibraryEvent){if(!closing && window && !window.isDestroyed())window.webContents.send('library:event',event)}
function changed(){if(migrating||debounce)return;debounce=setTimeout(()=>{debounce=undefined;emit({type:'change'})},150)}
function uiLanguage(){return normalizeLanguage(store?.settings().language)}
function refreshTheme(){window?.setTitle(translate('VRC素材库',uiLanguage()));window?.setBackgroundColor(THEME_BACKGROUNDS[normalizeTheme(store.settings().theme)]);preview?.refreshTheme();booth?.refreshTheme();baidu?.refreshTheme();xianyu?.refreshTheme()}
function getAsset(id:unknown):AssetRecord{if(typeof id!=='string')throw new Error('请选择一个素材。');const item=store.get(id);if(!item)throw new Error('素材不存在，请刷新列表。');return item}
function getRawAsset(id:unknown):AssetRecord{if(typeof id!=='string')throw new Error('请选择一个素材。');const item=store.getRaw(id);if(!item)throw new Error('素材不存在，请刷新列表。');return item}
function matchingAsset(id:string):AssetRecord|null {return matchingCatalog(store).get(id)}
function protectedRoots(){const settings=store?.settings();return [...new Set([DEFAULT_ROOT,...(settings?.roots??initialRoots),...(settings?.detachedRoots??[])])]}
async function prepareCookieMigration(directory:string,roots:string[]):Promise<BrowserCookieSnapshot[]>{const booth=await prepareBoothSessionMigration(directory,roots),baidu=await prepareBaiduSessionMigration(directory,roots),market=await prepareXianyuSessionMigration(directory,roots);const ai=await prepareAiWebSessionMigration(directory,roots);return [...[booth,baidu,market].filter((v):v is BrowserCookieSnapshot=>!!v),...ai]}
function boothReadRoots(asset:AssetRecord):string[]{const roots=new Set<string>();for(const id of asset.members?.map(member=>member.id)||[asset.id]){const raw=store.getRaw(id);if(raw&&['BOOTH 下载','百度网盘下载'].includes(raw.group))try{roots.add(path.dirname(safeBoothDownloadPath(raw.path,dataDir,protectedRoots())))}catch{/* Invalid references do not widen the read scope. */}}return [...roots]}
async function refreshDownloadAvailability(){const current=store;let updated=false;for(const asset of current.all()){if(closing||migrating||recycleOperation||current!==store)break;if(!['BOOTH 下载','百度网盘下载'].includes(asset.group))continue;try{const file=safeBoothDownloadPath(asset.path,dataDir,protectedRoots()),stat=await fsp.lstat(file);if(!closing&&!migrating&&!recycleOperation&&current===store)updated=current.updateAvailability(asset.id,!stat.isFile()||stat.isSymbolicLink(),asset)||updated}catch(error:any){if(['ENOENT','ENOTDIR'].includes(error.code)&&!closing&&!migrating&&!recycleOperation&&current===store)updated=current.updateAvailability(asset.id,true,asset)||updated}}if(updated)changed()}
function rememberLocation(selected:string,backupDir?:string,roots=protectedRoots()){
 const config={dataDir:selected,backupDir};
 if(testProfile){if(process.env.VRC_LIBRARY_LOCATION_FILE)writeLocation(locationFile,config,roots);return}
 rememberLibraryLocation(locationFile,fallbackLocationFile,config,roots);
}
function setupAI(){
 void aiQueue?.stop();aiService?.close();
 const boundStore=store;
 const permitted=()=>!closing&&!migrating&&store===boundStore&&boundStore.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK;
 const service=new AiService({dataDir,cipher:safeStorage,fetchImpl:async(url,init)=>{if(!permitted())throw new Error('当前未联网。');return net.fetch(typeof url==='string'?url:url instanceof URL?url.href:url.url,init)}});
 aiService=service;
 aiQueue=new AiClassificationQueue({service,assets:()=>boundStore.all(),canRun:()=>aiService===service&&permitted()&&!recycleOperation,changed});aiQueue.start();
}
function setupServices(){
 discovery?.cancel();
 setupAI();
 unityDiagnostics=new UnityDiagnosticsMonitor(testProfile&&process.env.VRC_LIBRARY_TEST_UNITY_LOG?{logPath:process.env.VRC_LIBRARY_TEST_UNITY_LOG}:{});
 modelPreview?.close();
 modelPreview=new ModelPreviewWindow({candidates:()=>store.all(),parent:()=>window,theme:()=>normalizeTheme(store.settings().theme),available:()=>!closing&&!migrating&&!recycleOperation,validate:id=>{const asset=getAsset(id);return {asset,roots:[...store.settings().roots,...(store.settings().directSources||[]),...boothReadRoots(asset)]}}});
 publicPlugins?.cancel();
 publicPlugins=new PublicPluginDownloads({dataDir,roots:protectedRoots,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,fetch:createPublicPluginFetch(net),changed});
 inboxMonitor?.stop();
 inboxAccess?.invalidate();
 invalidateInboxDownload();
 inbox=new LinkInboxStore({dataDir,roots:protectedRoots,changed,cipher:{encrypt:text=>{if(!safeStorage.isEncryptionAvailable())throw new Error('系统加密暂不可用，私人链接未保存。');return safeStorage.encryptString(text)},decrypt:bytes=>{if(!safeStorage.isEncryptionAvailable())throw new Error('系统加密不可用');return safeStorage.decryptString(bytes)}}});
 const boundInbox=inbox;
 inboxAccess=new InboxAccess({settings:()=>boundInbox.state().settings,consent:()=>boundInbox.consent(),save:(settings,consent)=>boundInbox.configure(settings,consent),available:()=>!closing&&!migrating&&inbox===boundInbox,confirm:async background=>{const result=await dialog.showMessageBox(window!,{type:'question',...inboxConsentNotice(background),buttons:['取消','同意并开启'],defaultId:0,cancelId:0,noLink:true});return result.response===1}});
 cloud=new CloudCatalog({read:()=>store.cloudData(),write:data=>store.saveCloudData(data),locals:()=>matchingCatalog(store).all()});
 baiduDownloads?.stop();baidu?.close();baidu=new BaiduWorkspace({onDownload:(event,item,contents)=>baiduDownloads?.accept(event,item,contents)??false,allowDownloadNavigation:(id,url)=>baiduDownloads?.allowNavigation(id,url)??false,onSessionInvalidated:()=>baiduDownloads?.stop(),onShutdown:()=>baiduDownloads?.shutdown(),parent:()=>window,dataDir,roots:protectedRoots,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,getTheme:()=>store.settings().theme||'nasa',getLanguage:()=>store.settings().language,onChanged:changed,onCapture:capture=>{if(closing||migrating)throw new Error('资料库正在关闭或迁移。');cloud.capture(capture as CloudCapture);changed()}});
 const downloadStore=store;
 const downloads=new BaiduDownloads({dataDir,roots:protectedRoots,parent:()=>window,canProcess:()=>!closing&&!migrating&&!recycleOperation&&store===downloadStore,trash:file=>shell.trashItem(file),onRecycled:source=>{if(store!==downloadStore)return;const ids=downloadStore.all().filter(asset=>path.resolve(asset.path).toLowerCase()===path.resolve(source.file).toLowerCase()).map(asset=>asset.id);if(ids.length)downloadStore.markRecycled(ids);changed()},onExtracted:async directory=>{
  if(closing||migrating||recycleOperation||store!==downloadStore)throw new Error('资料库正在关闭或更改，解压文件保留，可稍后重试入库。');
  const result=await scanner.addPaths([directory]);if(result.cancelled||result.errors.length||!result.ids.length)throw new Error('解压完成，但目录尚未完整入库：'+(result.errors.join('；')||'读取已取消。'));
  const record=downloadStore.all().find(asset=>path.resolve(asset.path).toLowerCase()===path.resolve(directory).toLowerCase());if(!record)throw new Error('解压目录尚未登记，文件已保留。');
  if(!record.manual.title)downloadStore.updateManual([record.id],{title:path.basename(directory).split('--vrcal-unpacked-')[0]});changed();
  if(store===downloadStore&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue(result.ids);return {assetId:record.id};
 },session:()=>baidu.downloadSession(),canNetwork:()=>!closing&&!migrating&&store===downloadStore&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,changed,onTaskStarted:id=>{if(baiduDownloads===downloads&&inbox===boundInbox&&inboxDownloadId)boundInbox.attachTask(inboxDownloadId,id)},onDownloaded:async file=>{
  if(closing||migrating||recycleOperation||store!==downloadStore)throw new Error('资料库正在关闭或更改；下载文件保留，可稍后重试入库。');
  const imported=await importCompletedDownload(downloadStore,file,path.dirname(file),'baidu');changed();
  if(store===downloadStore&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue([imported.assetId]);return imported;
 }});baiduDownloads=downloads;
  projectImports=new ProjectImports({dataDir,roots:()=>store.settings().roots,getAsset:id=>store.get(id)??publicPlugins.getAsset(id),readRoots:asset=>publicPlugins.getAsset(asset.id)?[asset.path]:boothReadRoots(asset),selectedEditor:()=>store.settings().unityEditorPath,
    ...(testProfile&&process.env.VRC_LIBRARY_NO_EDITOR_LAUNCH?{findEditor:async()=>undefined}:{}),onChange:changed,onComplete:job=>{
      const project=store.get(job.projectId);if(project&&project.path===job.projectPath&&store.get(job.assetId)){store.updateManual([project.id],{relatedIds:[...new Set([...(project.manual.relatedIds??[]),job.assetId])]});clearProjectMaterialCache(project.path);changed()}
    }});
 updater?.close();
 updater=new Updater({version:app.getVersion(),dataDir,roots:protectedRoots,executable:process.env.PORTABLE_EXECUTABLE_FILE,packaged:app.isPackaged,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,fetch:(url,init)=>net.fetch(url,init),onChange:changed,quit:()=>app.quit()});
 preview?.close();
 booth?.close();
 scanner=new Scanner(store,p=>{emit({type:'scan',progress:p});changed()},()=>!recycleOperation&&!closing&&!migrating);
 proxy=new ProxyMonitor({resolveProxy:url=>session.defaultSession.resolveProxy(url),fetch:(url,init)=>net.fetch(url,init),onChange:changed});
 proxy.setEnabled(store.settings().onlineEnabled && !process.env.VRC_LIBRARY_NO_NETWORK);
 const catalog=matchingCatalog(store);
 queue=new EnrichmentQueue({dataDir,roots:protectedRoots,concurrency:()=>store.settings().downloadConcurrency||3,canonicalId:id=>store.get(id)?.id,all:catalog.all,get:catalog.get,updateOnline:(id,patch)=>{if(!closing){catalog.updateOnline(id,patch);changed()}},fetch:createPublicPageFetch(net),onProgress:progress=>{proxy.observeTransfer(progress);emit({type:'queue',progress})},onChange:changed});
 preview=new ProductPreview({parent:()=>window,getTheme:()=>store.settings().theme||'nasa',getLanguage:()=>store.settings().language,validate:(id,url)=>{if(!store.settings().onlineEnabled)throw new Error('请先开启联网后预览商品网页。');const item=getAsset(id),candidate=item.online.candidates?.find(c=>c.url===url);if(!candidate&&item.online.url!==url)throw new Error('只能预览当前候选或已登记商品来源。');return {title:candidate?.title||item.online.title||item.name,canConfirm:!!candidate};},accept:confirmCandidate});
 booth=new BoothWorkspace({parent:()=>window,getTheme:()=>store.settings().theme||'nasa',getLanguage:()=>store.settings().language,dataDir,roots:protectedRoots,getDownloadDir:()=>store.settings().boothDownloadDir,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,validateAsset:id=>{const item=getAsset(id);if(item.kind==='unity-project')throw new Error('请选择素材后搜索商品。');return {title:item.manual.title||item.name}},applyProduct:(id,url)=>changeSource(id,url,false),onChanged:changed,onDownloaded:async(file,sourceItem)=>{
  if(closing||migrating)throw new Error('资料库正在关闭或迁移；文件已保存，可稍后重试导入。');
  const imported=await importBoothDownload(store,file,sourceItem,path.dirname(file));changed();
  if(store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue([imported.assetId]);return imported;
 }});
 xianyu?.close();xianyu=new XianyuWorkspace({parent:()=>window,dataDir,roots:protectedRoots,getTheme:()=>normalizeTheme(store.settings().theme),getLanguage:()=>store.settings().language,isEnabled:()=>store.settings().xianyuEnabled,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,validateAsset:id=>{const a=getAsset(id);if(a.kind==='unity-project')throw new Error('请选择素材后进行辅助搜图。');const cover=a.manual.coverFile||a.online.coverFile||a.previewFile;return {title:a.manual.title||a.online.title||a.name,coverPath:cover?safeCoverPath(dataDir,cover):undefined}},searchBooth:(id,query)=>booth.open({tab:'search',assetId:id,query,forceKeyword:true}),applyMarketplace:(id,url,capturedHtml)=>changeSource(id,url,false,capturedHtml)});
 const boundXianyu=xianyu,boundStore=store;
 discoveryAi?.close();discoveryAi=new DiscoveryAiWorkspace({parent:()=>window??undefined,dataDir,roots:protectedRoots,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK});
 discovery=new ProductDiscovery({ai:()=>aiService,canNetwork:()=>!closing&&!migrating&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,xianyuEnabled:()=>store.settings().xianyuEnabled===true,booth:(url,signal)=>queue.discoveryPage(url,signal),cover:(url,signal)=>queue.discoveryCover(url,signal),xianyu:(query,signal)=>xianyu.searchProducts(query,signal)});
 xianyuAccess=new XianyuAccess({enabled:()=>store.settings().xianyuEnabled,save:enabled=>{store.saveSettings({xianyuEnabled:enabled})},close:()=>{discovery?.cancel();inboxMonitor?.pause();boundXianyu.networkChanged()},changed,available:()=>!closing&&!migrating&&xianyu===boundXianyu&&store===boundStore,confirm:async()=>{const answer=await dialog.showMessageBox(window!,localizeDialogOptions({type:'warning',...XIANYU_USAGE_NOTICE,buttons:['取消','我已了解，开启'],defaultId:0,cancelId:0,noLink:true},uiLanguage()));return answer.response===1}});
 const boundBooth=booth;
 inboxMonitor=new LinkInboxMonitor({settings:()=>boundInbox.state().settings,canNetwork:()=>!closing&&!migrating&&!inboxSuspensions&&inbox===boundInbox&&store===boundStore&&boundStore.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK,readers:[{platform:'xianyu',read:(mode,signal,context)=>boundXianyu.readInbox(mode,signal,context)},{platform:'booth',read:(mode,signal,context)=>boundBooth.readInbox(mode,signal,context)}],ingest:observation=>boundInbox.ingest(observation),changed});
 inboxMonitor.start();
}
function invalidateInboxDownload(){inboxDownloadId=undefined;return ++inboxReadGeneration}
async function withInboxSuspended<T>(action:()=>Promise<T>):Promise<T>{inboxSuspensions++;inboxMonitor?.pause();invalidateInboxDownload();try{return await action()}finally{inboxSuspensions--}}
function editSource<T>(action:()=>Promise<T>):Promise<T>{const pending=sourceChanges.then(()=>{if(migrating||closing)throw new Error('资料库正在关闭或迁移。');return action()});sourceChanges=pending.then(()=>undefined,()=>undefined);return pending;}
function changeSource(id:string,url:string,candidate:boolean,capturedHtml?:string):Promise<void>{return editSource(async()=>{
 const item=getAsset(id);if(item.kind==='unity-project')throw new Error('工程不参与商品匹配。');if(!store.settings().onlineEnabled)throw new Error('请先开启联网补全。');if(typeof url!=='string'||url.length>2048)throw new Error('商品网址无效。');const source=publicHttpsUrl(url).href;
 if(candidate&&!item.online.candidates?.some(value=>value.url===source))throw new Error('请选择当前候选商品。');const ids=item.members?.map(member=>member.id)||[item.id];
 // Supersede the old workers before taking the undo snapshot. All subsequent callbacks recheck cancellation.
 queue.exclude(ids);store.beginSourceChange(ids,source,item.id,item.manual.title||item.name);
 try{for(const memberId of ids){if(!candidate){const raw=getRawAsset(memberId);store.updateOnline(memberId,{rejectedUrls:(raw.online.rejectedUrls||[]).filter(value=>canonicalSourceKey(value)!==canonicalSourceKey(source))})}}await queue.acceptCandidate(item.id,source,true,capturedHtml)}finally{changed()}
})}
function confirmCandidate(id:string,url:string):Promise<void>{return changeSource(id,url,true)}
async function pickDataLocation(parent?:BrowserWindow):Promise<string|null>{
 const options:Electron.OpenDialogOptions={title:'选择资料库保存的上级文件夹（C盘之外）',defaultPath:path.dirname(DEFAULT_ROOT),properties:['openDirectory','createDirectory']};
 const result=parent?await dialog.showOpenDialog(parent,localizeDialogOptions(options,uiLanguage())):await dialog.showOpenDialog(localizeDialogOptions(options,uiLanguage()));if(result.canceled)return null;
 const target=path.join(await fsp.realpath(result.filePaths[0]),'VRChatAssetLibrary');return assertUserStorage(target,protectedRoots(),testProfile);
}
async function initializeLocation():Promise<boolean>{
 if(testProfile)return true;
 if(location.dataDir){if(recoverLocation)return recoverLibraryLocation();assertUserStorage(dataDir,protectedRoots());if(!probeLibrary(dataDir,protectedRoots()).ok)return recoverLibraryLocation();return true}
 const target=await pickDataLocation();if(!target)return false;
 if(!fs.existsSync(path.join(target,'library.sqlite'))&&fs.existsSync(path.join(legacyDir,'library.sqlite'))){
  const previous=new Store(legacyDir,initialRoots),settings=previous.settings(),roots=[DEFAULT_ROOT,...settings.roots,...(settings.detachedRoots??[])];previous.close();const snapshots=await prepareCookieMigration(legacyDir,roots);await copyLibraryData(legacyDir,target,roots,false,snapshots);
 }
 if(!fs.existsSync(path.join(target,'library.sqlite')))new Store(target,initialRoots).close();
 rememberLocation(target,location.backupDir);
 // The folder picker requires ready, so activate the chosen profile in a fresh
 // process instead of changing Chromium storage underneath a running session.
 app.relaunch({execPath:process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe')});return false;
}
async function recoverLibraryLocation():Promise<boolean>{
 const language=uiLanguage(),t=(text:string)=>translate(text,language);
 for(;;){
  const other=[readLocation(locationFile),readLocation(fallbackLocationFile)].find(record=>record.dataDir&&path.resolve(record.dataDir).toLowerCase()!==dataDir.toLowerCase()&&probeLibrary(record.dataDir,protectedRoots()).ok);
  const buttons=['重试原位置','重新定位已有资料库',...(other?['使用已找到的资料库']:[]),'退出'];
  const detail=[t('上次登记的资料库：'),dataDir,t(probeLibrary(dataDir,protectedRoots()).reason||'资料库文件暂时无法读取。'),...(other?[t('另一个位置记录指向已有资料库：'),other.dataDir!]:[]),t('原记录保留。请重试连接磁盘，或选择包含 library.sqlite 的已有资料库。')].join('\n');
  const answer=await dialog.showMessageBox(localizeDialogOptions({type:'warning',title:'重新定位资料库',message:'无法打开上次使用的资料库',detail,buttons,defaultId:1,cancelId:buttons.length-1,noLink:true},language));
  let selected:string|undefined;
  if(answer.response===0){if(probeLibrary(dataDir,protectedRoots()).ok)selected=dataDir;else continue;}
  else if(answer.response===1){
   const chosen=await dialog.showOpenDialog(localizeDialogOptions({title:'选择已有资料库文件夹（包含 library.sqlite）',defaultPath:path.dirname(dataDir),properties:['openDirectory']},language));
   if(chosen.canceled)return false;
   try{selected=existingLibraryDirectory(chosen.filePaths[0],protectedRoots());}catch(error){await dialog.showMessageBox(localizeDialogOptions({type:'error',title:'重新定位资料库',message:error instanceof Error?error.message:String(error),buttons:['确定']},language));continue;}
  }else if(other&&answer.response===2)selected=other.dataDir;else return false;
  // Recheck immediately before recording it. Do not open a Store here: its
  // constructor creates tables, and Chromium is still using the bootstrap key.
  if(!selected||!probeLibrary(selected,protectedRoots()).ok)continue;
  rememberLocation(selected,location.backupDir);app.relaunch({execPath:process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe')});return false;
 }
}
async function selectBackupLocation():Promise<boolean>{
 const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择备份保存位置（C盘之外）',defaultPath:store.settings().backupDir || path.dirname(dataDir),properties:['openDirectory','createDirectory']},uiLanguage()));if(result.canceled)return false;
 const target=assertUserStorage(await fsp.realpath(result.filePaths[0]),protectedRoots(),testProfile);store.saveSettings({backupDir:target});rememberLocation(dataDir,target);changed();return true;
}
async function ensureBackupLocation():Promise<string|null>{
 const saved=store.settings().backupDir;if(saved){try{return assertUserStorage(saved,protectedRoots(),testProfile)}catch{/* a legacy C location must be reselected */}}
 return await selectBackupLocation()?store.settings().backupDir!:null;
}
function applyZoom(factor:number):number{if(!Number.isFinite(factor))throw new Error('缩放比例无效。');const zoom=Math.max(0.67,Math.min(2,Math.round(factor*100)/100));store.saveSettings({uiZoom:zoom});window?.webContents.setZoomFactor(zoom);changed();return zoom}
function parseIds(input:unknown):string[]{if(!Array.isArray(input)||input.length>5000||input.some(x=>typeof x!=='string'))throw new Error('素材选择无效。');return input as string[]}
function expandedIds(input:unknown):string[]{return [...new Set(parseIds(input).flatMap(id=>getAsset(id).members?.map(member=>member.id)||[id]))]}
function parsePatch(input:unknown):ManualInfo{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('标注内容无效。');
 const p=input as Record<string,unknown>;const result:ManualInfo={};
 for(const field of ['title','notes'] as const){if(p[field]!==undefined){if(typeof p[field]!=='string'||p[field].length>(field==='notes'?20000:1000))throw new Error('文字过长。');result[field]=p[field]}}
 if(p.category!==undefined){if(!CATEGORIES.includes(p.category as any))throw new Error('分类无效。');result.category=p.category as ManualInfo['category']}
 for(const field of ['tags','avatars','relatedIds'] as const){if(p[field]!==undefined){if(!Array.isArray(p[field])||p[field].length>200||p[field].some(x=>typeof x!=='string'||x.length>300))throw new Error('标签或关联内容无效。');result[field]=[...new Set(p[field] as string[])]}}
 if(p.favorite!==undefined){if(typeof p.favorite!=='boolean')throw new Error('收藏状态无效。');result.favorite=p.favorite}
 if(p.projectStatus!==undefined){if(!['制作中','已完成'].includes(p.projectStatus as string))throw new Error('工程状态无效。');result.projectStatus=p.projectStatus as ManualInfo['projectStatus']}
 return result;
}
async function performScan(){if(recycleOperation||closing||migrating)return;await scanner.scan();if(closing)return;await refreshDownloadAvailability();changed();if(store.settings().onlineEnabled && !process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue();}
async function addMaterials(paths:unknown){assertNotRecycling();const result=await scanner.addPaths(paths);if(!closing&&!migrating){changed();if(result.ids.length&&store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue(result.ids)}return {...result,errors:result.errors.map(error=>{const split=error.lastIndexOf("：");return split<0?translate(error,uiLanguage()):error.slice(0,split+1)+translate(error.slice(split+1),uiLanguage())})};}
async function addProject(selected:unknown,current=store){const verify=()=>{assertNotRecycling();if(current!==store||migrating||closing)throw new Error('资料库位置已变化，请重新添加工程。');if(scanner.progress().running)throw new Error('请先停止扫描，再添加工程。')};verify();const project=await registerProject(current,selected,verify);changed();return project;}
function assertNotRecycling(){if(recycleOperation)throw new Error('正在处理回收站操作，请稍候。')}
function handle(name:string,fn:(...args:any[])=>any){ipcMain.handle(`library:${name}`,async(event,...args)=>{try{if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('操作来源无效。');if(migrating)throw new Error('正在更改资料库位置，请稍候。');if(baiduDownloads?.processing&&['chooseDataDir','restore','removeRoot','removeRoots','chooseRoot','scan','chooseMaterials','addMaterials','chooseProject','addDroppedProject','installUpdate','recycleAssets','clearBaiduSession'].includes(name))throw new Error('请等待解压与自动入库完成后再执行此操作。');if(recycleOperation&&['recycleAssets','chooseDataDir','restore','removeRoot','removeRoots','chooseRoot','scan','chooseMaterials','addMaterials','chooseProject','installPublicPlugin','executeProjectImport','setHidden','forceRematch'].includes(name))throw new Error('正在处理回收站操作，请稍候。');if((projectImports?.busy||pluginInstall||publicPlugins?.busy)&&['chooseDataDir','restore','removeRoot','removeRoots','installUpdate','recycleAssets'].includes(name))throw new Error('请等待工程素材导入完成后再执行此操作。');return await fn(...args)}catch(error){if(error instanceof Error)throw new Error(translate(error.message,uiLanguage()));throw error}})}
async function recycleMaterials(input:unknown,scope:'card'|'file'='card'):Promise<AssetRecycleResult> {
 if(closing||migrating||recycleOperation)throw new Error('正在处理回收站操作，请稍候。');
 const activeStore=store,activeScanner=scanner,activeQueue=queue,selected=store.selectedRawIds(parseIds(input),scope),settings=store.settings();
 const scopeKey=()=>JSON.stringify([store.settings().roots,store.settings().directSources,store.settings().detachedRoots,dataDir,store.knownProjectPaths()]);
 let originalScope=scopeKey();
 const stillCurrent=()=>!closing&&!migrating&&store===activeStore&&scopeKey()===originalScope;
 const work=(async()=>{
  // Freeze scanning before collecting the registered children and known projects.
  activeScanner.cancel();await activeScanner.waitIdle();
  if(!stillCurrent())throw new Error('资料库状态已变化，请重新选择素材。');
  const records=activeStore.recycleRecords();originalScope=scopeKey();
  const allowedDownloadFiles:string[]=[];for(const record of records)if(['BOOTH 下载','百度网盘下载'].includes(record.group))try{allowedDownloadFiles.push(safeBoothDownloadPath(record.path,dataDir,protectedRoots()))}catch{/* Invalid download references never widen the delete scope. */}
  const plan=await prepareAssetRecycle({selectedIds:selected,assets:records,roots:settings.roots,protectedPaths:[DEFAULT_ROOT,...(settings.detachedRoots??[])],dataDir,allowedDownloadFiles,allowedSourceRootAssets:(settings.directSources??[]).filter(file=>path.resolve(file).toLowerCase()!==path.resolve(DEFAULT_ROOT).toLowerCase()),knownProjectPaths:records.filter(record=>record.kind==='unity-project').map(record=>record.path)});
  const language=uiLanguage(),detail=[translate('以下路径将移入系统回收站。文件夹包含的文件也会一并处理；隐藏不会执行此操作。',language),...plan.targets.map(target=>target.path),translate('可在 Windows 回收站还原文件，然后刷新素材。不会永久删除，也不会删除 Unity 工程。',language)].join('\n\n');
  if(detail.length>24000)throw new Error('待确认路径过多，请分批选择后删除。');
  const answer=await dialog.showMessageBox(window!,{type:'warning',title:translate('删除素材（移入回收站）',language),message:translate('将 {count} 个路径移入系统回收站？',language,{count:plan.targets.length}),detail,buttons:[translate('取消',language),translate('移入回收站',language)],defaultId:0,cancelId:0,noLink:true});
  if(answer.response!==1)return {cancelled:true,results:[]};
  if(!stillCurrent())throw new Error('资料库状态已变化，请重新选择素材。');
  const covered=[...new Set(plan.targets.flatMap(target=>target.assetIds))];activeQueue.exclude(covered);await sourceChanges;
  const result=await executeAssetRecycle(plan,{trashItem:file=>{if(!stillCurrent())throw new Error('资料库状态已变化，请重新选择素材。');return shell.trashItem(path.resolve(file))},shouldCancel:()=>!stillCurrent()});
  for(const entry of result.results)if(entry.status==='recycled')try{activeStore.markRecycled(entry.assetIds)}catch{entry.error=translate('文件已移入回收站，但资料库记录未能更新，请重新读取资料库后刷新。',language);}
  changed();return result;
 })();
 recycleOperation=work;try{return await work}finally{recycleOperation=undefined}
}

function registerHandlers(){
 handle('openModelPreview',(id:string)=>modelPreview.open(id));
 handle('aiState',()=>aiService.getState());
 handle('discoveryState',()=>discovery.snapshot());
 handle('startDiscovery',(request:unknown)=>discovery.start(request));
 handle('prepareWebDiscovery',async(provider:unknown,request:unknown)=>{await discoveryAi.open(provider,request)});
 handle('openWebDiscovery',(provider:unknown,request:unknown)=>discoveryAi.open(provider,request));
 handle('webDiscoveryState',()=>discoveryAi.snapshot());
 handle('setWebDiscoveryBounds',(token:unknown,bounds:unknown)=>discoveryAi.bounds(token,bounds));
 handle('fillWebDiscovery',(token:unknown)=>discoveryAi.fill(token));
 handle('collectWebDiscovery',(token:unknown)=>discoveryAi.collect(token));
 handle('copyWebDiscoveryPrompt',(token:unknown)=>{clipboard.writeText(discoveryAi.copyPrompt(token))});
 handle('applyWebDiscoveryReply',(token:unknown)=>{if(discovery.snapshot().running)throw new Error('请等待当前搜索结束。');const captured=discoveryAi.takeReply(token,request=>{if(closing||migrating||!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启联网。');if(request.platforms.includes('xianyu')&&!store.settings().xianyuEnabled)throw new Error('请先在设置中启用闲鱼辅助搜索。')});return discovery.startWithWebPlan(captured.request,captured.reply)});
 handle('closeWebDiscovery',()=>discoveryAi.close());
 handle('clearWebDiscoverySession',(provider:unknown)=>discoveryAi.clear(provider));
 handle('startWebDiscovery',(request:unknown,reply:unknown)=>discovery.startWithWebPlan(request,reply));
 handle('cancelDiscovery',()=>{discovery.cancel();return discovery.snapshot()});
 handle('openDiscoveryProduct',async(url:string)=>{if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启联网。');const item=discovery.product(url);if(!item)throw new Error('请从当前搜索结果打开商品。');if(item.platform==='booth')await booth.openDiscovery(item.url);else await xianyu.openDiscovery(item.url)});
 handle('openDiscoverySearch',async(platform:unknown)=>{if(platform!=='booth'&&platform!=='xianyu')throw new Error('平台无效。');if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启联网。');const url=discovery.searchLink(platform);if(platform==='booth')await booth.openDiscovery(url);else await xianyu.openDiscovery(url)});
 handle('configureAI',async(value:AiSettingsUpdate)=>{const state=await aiService.updateSettings(value);discovery?.cancel();changed();return state});
 handle('openAIHelp',async(provider:string)=>{const item=AI_PROVIDERS.find(p=>p.id===provider);if(!item)throw new Error('服务商无效。');await shell.openExternal(item.helpUrl)});
 handle('aiQueueState',()=>aiQueue.state());
 handle('retryAIClassification',(id?:string)=>{if(id)getAsset(id);aiQueue.retry(id);changed()});
 handle('aiClassification',(id:string)=>{getAsset(id);return aiService.getClassification(id)});
 handle('classifyAsset',async(id:string)=>{if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启应用联网。');const asset=getAsset(id);if(asset.kind==='unity-project')throw new Error('请选择一个素材。');const result=await aiService.classify({assetId:asset.id,publicTitle:asset.online.title,publicDescription:asset.online.description,publicTags:asset.online.tags,filenameClue:path.basename(asset.path)});changed();return result});
 handle('unityDiagnostics',(id:string)=>unityDiagnostics.read(getAsset(id),store.settings().roots));
 handle('diagnoseUnity',async(id:string)=>{if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启应用联网。');const report=await unityDiagnostics.read(getAsset(id),store.settings().roots);if(report.status!=='ready'||!report.issues.some(i=>i.severity==='error'))throw new Error('没有已核实属于此工程的错误可供分析。');const excerpt=report.issues.filter(i=>i.severity==='error').slice(0,12).map(i=>`${i.message}\n${i.detail}`).join('\n\n').slice(0,16000);const result=await aiService.diagnose({projectId:id,excerpt,unityVersion:report.projectVersion});changed();return result});
 handle('startupStarInvite',()=>launchInvites.start());
 handle('dismissStarInvite',(count:unknown)=>launchInvites.dismiss(count));
 handle('openStarProject',(count:unknown)=>launchInvites.open(count));
 handle('openCommunityLink',async(id:unknown)=>{await shell.openExternal(communityUrl(id))});
 handle('copyCommunityGroup',()=>clipboard.writeText(QQ_GROUP_NUMBER));
 handle('snapshot',()=>({stats:store.stats(),scan:scanner.progress(),queue:queue.progress,settings:store.settings(),proxy:proxy.status,undoAvailable:store.hasUndo(),sourceUndo:store.sourceUndoInfo(),warnings:store.recoveryWarnings.slice(0,100)}));
 handle('list',(query:AssetQuery={})=>{const page=store.list(query);return {...page,items:cloud.decorate(page.items)}});handle('get',(id:string)=>{const item=store.get(id);return item?cloud.decorate([item])[0]:null});
 handle('inboxState',()=>{
  inbox.syncCompleted(baiduDownloads.state().tasks.filter(task=>task.state==='completed').map(task=>task.id));
  const state=inbox.state();return {...state,statuses:inboxMonitor.statuses()} satisfies InboxState;
 });
 handle('configureInbox',async(value:unknown)=>{await inboxAccess.configure(value);inboxMonitor.pause();if(inbox.state().settings.enabled)await inboxMonitor.check('foreground')});
 handle('clearInbox',async()=>{const current=inbox,result=await dialog.showMessageBox(window!,{type:'warning',title:'清除链接记录',message:'清空本机的待下载链接，并关闭识别？',detail:'将清空链接、提取码、已读／忽略状态和本地同意记录。不会删除已下载文件、素材或平台消息，也不会退出账号。再次启用后，近期链接可能重新出现。',buttons:['取消','清除记录并关闭'],defaultId:0,cancelId:0,noLink:true});if(result.response!==1||closing||migrating||current!==inbox)return false;inboxMonitor.pause();inboxAccess.invalidate();invalidateInboxDownload();current.clearRecords();return true});
 handle('clearInboxAccount',async(platform:unknown)=>{if(platform!=='booth'&&platform!=='xianyu')throw new Error('账号类型无效。');const current=inbox,platformName=platform==='booth'?'BOOTH':'闲鱼',result=await dialog.showMessageBox(window!,{type:'warning',title:'清除账号登录状态',message:`清除应用内的 ${platformName} 登录状态？`,detail:'会关闭该平台窗口并清除其 Cookie、网页存储、缓存和登录快照，同时关闭交付链接识别。进行中的该平台下载可能中断。现有链接记录、已下载文件和平台账号保持原样；此操作不注销平台账号。',buttons:['取消','清除登录状态'],defaultId:0,cancelId:0,noLink:true});if(result.response!==1||closing||migrating||current!==inbox)return false;inboxMonitor.pause();inboxAccess.invalidate();if(!current.state().error)await inboxAccess.configure({...current.state().settings,enabled:false});invalidateInboxDownload();if(closing||migrating||current!==inbox)return false;if(platform==='booth')await booth.clearSession();else await xianyu.clearSession();changed();return true});
 handle('checkInbox',()=>inboxMonitor.check('foreground'));
 handle('markInbox',(id:string,action:'read'|'dismiss'|'restore')=>inbox.mark(id,action));
 handle('openInboxAccount',async(platform:unknown)=>{if(platform==='booth')return booth.open({tab:'library'});if(platform==='xianyu'){if(!store.settings().xianyuEnabled&&!await xianyuAccess.setEnabled(true))return;return xianyu.openMessages()}throw new Error('请选择 BOOTH 或闲鱼账号。')});
 handle('readInboxLink',async(id:string,code?:string)=>{
  const target=inbox.downloadTarget(id,code),current=inbox,generation=inboxReadGeneration;
  const active=()=>generation===inboxReadGeneration&&current===inbox&&!closing&&!migrating;
  if(target.kind==='booth'){if(target.boothLibraryItem)await booth.openInboxLibraryItem(target.boothLibraryItem,target.accountKey);else await booth.openInboxPurchase(target.url);if(active())current.mark(id,'read');return}
  // Commit the new binding only after the downloader accepts and reads the share.
  // A busy/invalid request must preserve the current share's in-flight downloads.
  await baiduDownloads.read(target.url,target.code);
  if(active()){invalidateInboxDownload();inboxDownloadId=id;current.mark(id,'read')}
 });
 handle('baiduDownloadsState' ,()=>baiduDownloads.refreshState());
 handle('openBaiduDownloadVerification',async()=>{if(!baiduDownloads.openVerification())await baidu.open()});
 handle('readBaiduShare',async(text:unknown,code:unknown)=>{
  const current=inbox,generation=inboxReadGeneration;
  await baiduDownloads.read(text,code);
  if(current===inbox&&generation===inboxReadGeneration&&!closing&&!migrating)invalidateInboxDownload();
 });
 handle('openBaiduShareFolder',(id:string)=>baiduDownloads.folder(id));handle('backBaiduShare',()=>baiduDownloads.parent());
 handle('downloadBaiduFile',(id:string)=>baiduDownloads.download(id));
 handle('downloadBaiduFiles',(ids:unknown)=>baiduDownloads.downloadMany(ids));
 handle('cancelBaiduDownloadBatch',()=>baiduDownloads.cancelBatch());
 handle('retryBaiduDownloadImport',(id:string)=>baiduDownloads.retryImport(id));
 handle('setBaiduExtractionOptions',(options:unknown)=>baiduDownloads.setExtractionOptions(options));
 handle('extractBaiduDownloads',(ids:unknown,recycle:unknown)=>{assertNotRecycling();return baiduDownloads.extractMany(ids,recycle)});
 handle('retryBaiduExtractionImport',(id:string)=>{assertNotRecycling();return baiduDownloads.retryExtractionImport(id)});
 handle('revealBaiduExtraction',async(id:string)=>{const error=await shell.openPath(baiduDownloads.revealExtraction(id));if(error)throw new Error('解压目录无法打开，请检查文件是否仍在原位置。')});
 handle('controlBaiduDownload',(id:string,action:'pause'|'resume'|'cancel')=>baiduDownloads.control(id,action));
 handle('revealBaiduDownload',(id:string)=>shell.showItemInFolder(baiduDownloads.reveal(id)));
 handle('chooseBaiduDownloadDir',async()=>{const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择百度网盘下载保存文件夹',defaultPath:baiduDownloads.state().downloadDir||path.dirname(dataDir),properties:['openDirectory','createDirectory']},uiLanguage()));if(result.canceled)return false;const target=assertUserStorage(await fsp.realpath(result.filePaths[0]),protectedRoots(),testProfile);baiduDownloads.setDirectory(target);return true});
 handle('baiduState',()=>baidu.state());handle('openBaidu',(directoryPath?:string)=>baidu.open(directoryPath));
 handle('scanBaiduDirectory',async(action:unknown)=>{if(typeof action!=='string'||!['start','pause','resume','stop','retry'].includes(action))throw new Error('云端目录操作无效。');await baidu.scan(action as 'start'|'pause'|'resume'|'stop'|'retry');changed()});
 handle('captureBaiduDirectory',async()=>{const capture=await baidu.capture();if(closing||migrating)throw new Error('资料库正在关闭或迁移。');cloud.capture(capture as CloudCapture);changed();return cloud.list({})});
 handle('cloudCatalog',(query:CloudQuery={})=>cloud.list(query));
 handle('linkCloudEntry',(key:string,id?:string|null)=>{cloud.link(key,id);changed()});
 handle('forgetCloudDirectory',(accountKey:string,directoryPath:string)=>{if(typeof accountKey!=='string'||typeof directoryPath!=='string')throw new Error('云端目录无效。');cloud.forget(accountKey,directoryPath);changed()});
 handle('clearBaiduSession',async()=>{invalidateInboxDownload();await baidu.clearSession();changed()});
 handle('scan',performScan);handle('cancelScan',()=>scanner.cancel());
 handle('addMaterials',addMaterials);
 handle('chooseMaterials',async()=>{if(scanner.progress().running)throw new Error('正在扫描或读取素材，请完成后再添加。');const current=store,result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择素材文件夹（可多选）',properties:['openDirectory','multiSelections']},uiLanguage()));if(result.canceled)return null;if(current!==store||migrating||closing)throw new Error('资料库位置已变化，请重新添加素材。');return addMaterials(result.filePaths)});
 handle('annotate',(ids:unknown,patch:unknown)=>{const clean=parsePatch(patch);const views=parseIds(ids).map(getAsset);const shared={...clean};delete shared.title;delete shared.notes;
  store.updateManual([...new Set(views.flatMap(a=>a.members?.map(m=>m.id)||[a.id]))],shared);
  const singular:ManualInfo={};if(clean.title!==undefined)singular.title=clean.title;if(clean.notes!==undefined)singular.notes=clean.notes;if(Object.keys(singular).length)store.updateManual([...new Set(views.map(a=>a.id))],singular);changed()});
 handle('reveal',async(id:string,requested?:string)=>{const target=requested===undefined?getRawAsset(id).path:assetLocation(getAsset(id),requested);await fsp.access(target);shell.showItemInFolder(target)});
 handle('copyPath',(id:string,requested?:string)=>clipboard.writeText(requested===undefined?getRawAsset(id).path:assetLocation(getAsset(id),requested)));
 handle('openSource',async(id:string)=>{const url=getAsset(id).online.url;if(!url)throw new Error('还没有商品来源链接。');const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('商品链接无效。');await shell.openExternal(parsed.href)});
 handle('files',(id:string)=>{const asset=getAsset(id);return scanner.files(asset.id,boothReadRoots(asset))});
 handle('setCover',async(id:string)=>{
  const item=getAsset(id);const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:item.kind==='unity-project'?'选择工程截图':'选择素材封面',properties:['openFile'],filters:[{name:'图片',extensions:['png','jpg','jpeg','webp','gif','bmp']}]},uiLanguage()));
  if(result.canceled)return false;const coverFile=await copyCover(result.filePaths[0],dataDir,protectedRoots());store.updateManual(item.members?.map(m=>m.id)||[item.id],{coverFile});changed();return true;
 });
 handle('enrich',async(ids?:unknown,retry?:boolean)=>{if(!store.settings().onlineEnabled)throw new Error('请先开启联网补全。');await queue.enqueue(ids===undefined?undefined:expandedIds(ids),!!retry)});
 handle('loadCandidateCovers',async(ids:unknown)=>{if(!store.settings().onlineEnabled)throw new Error('请先开启联网补全。');await queue.enqueueCandidateCovers(expandedIds(ids))});
 handle('pauseEnrichment',()=>queue.pause());handle('resumeEnrichment',async()=>{if(!store.settings().onlineEnabled)throw new Error('请先开启联网补全。');await booth.restoreDownloadAssociations();await queue.enqueue();await queue.resume()});
 handle('linkSource',(id:string,url:string)=>changeSource(id,url,false));
 handle('acceptCandidate',confirmCandidate);
 handle('undoSource',(token:string)=>editSource(async()=>{if(typeof token!=='string'||token.length>100)throw new Error('撤回记录无效。');const ids=store.sourceUndoIds(token);if(!ids)throw new Error('最近的来源确认已变化，请刷新后重试。');queue.exclude(ids);const restored=store.undoSource(token);if(restored){try{if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)queue.pause();for(const id of new Set(ids.map(id=>store.get(id)?.id).filter((id):id is string=>!!id))){const asset=matchingAsset(id);if(asset?.online.status==='pending'&&asset.manual.sourceUrl)await queue.acceptCandidate(id,asset.manual.sourceUrl,true)}}finally{changed()}}return restored}));
 handle('searchBooth',async(id:string,query:string)=>{getAsset(id);if(typeof query!=='string'||!query.trim()||query.length>300)throw new Error('请输入 1 至 300 字的搜索词。');const ids=extractBoothIds(query),term=/^(?:https:\/\/|\d{1,12}$)/i.test(query.trim())?query.trim():ids.length===1?ids[0]:searchClue(query).query;await booth.open({tab:'search',assetId:id,query:term||query.trim()})});
 handle('openImageSearch',(id:string)=>xianyu.open(id));handle('setXianyuEnabled',(enabled:unknown)=>xianyuAccess.setEnabled(enabled));
 handle('attemptXianyu',(id:string)=>{const a=getAsset(id),clue=searchClue(a.manual.title||a.localNameHints?.[0]||a.name).query;return xianyu.search(id,clue||a.name)});
 handle('boothState',()=>booth.snapshot());
 handle('openBooth',async(tab:BoothTab)=>{if(!['login','favorites','gifts','library'].includes(tab))throw new Error('BOOTH 页面无效。');await booth.open({tab})});
 handle('chooseBoothDownloadDir',async()=>{const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择 BOOTH 下载保存文件夹（C盘之外）',defaultPath:store.settings().boothDownloadDir||dataDir,properties:['openDirectory','createDirectory']},uiLanguage()));if(result.canceled)return false;const target=assertUserStorage(await fsp.realpath(result.filePaths[0]),protectedRoots(),testProfile);store.saveSettings({boothDownloadDir:target});changed();return true});
 handle('revealBoothDownload',async(id:string)=>{if(typeof id!=='string')throw new Error('下载记录无效。');const file=booth.downloadPath(id);if(!file)throw new Error('下载文件还未完成或无法找到。');await fsp.access(file);shell.showItemInFolder(file)});
 handle('cancelBoothDownload',(id:string)=>{if(typeof id!=='string')throw new Error('下载记录无效。');booth.cancelDownload(id);changed()});
 handle('retryBoothImport',async(id:string)=>{if(typeof id!=='string')throw new Error('下载记录无效。');await booth.retryImport(id);changed()});
 handle('clearBoothSession',()=>withInboxSuspended(async()=>{await booth.clearSession();changed()}));
 handle('previewSource',async(id:string,url:string)=>{if(typeof url!=='string'||url.length>2048)throw new Error('商品网址无效。');await preview.open(id,publicHttpsUrl(url).href)});
 handle('rejectCandidate',(id:string,url:string)=>{const asset=getAsset(id),source=publicHttpsUrl(url).href,key=canonicalSourceKey(source);if(!asset.online.candidates?.some(candidate=>canonicalSourceKey(candidate.url)===key))throw new Error('请选择当前候选商品。');for(const memberId of asset.members?.map(member=>member.id)||[asset.id]){const raw=getRawAsset(memberId);store.updateOnline(memberId,{rejectedUrls:[...new Set([...(raw.online.rejectedUrls||[]),source])],candidates:(raw.online.candidates||[]).filter(candidate=>canonicalSourceKey(candidate.url)!==key),message:'已排除此商品；后续匹配会记住你的选择，可随时恢复排除记录'});}changed()});
 handle('restoreRejectedCandidates',async(id:string)=>{const ids=expandedIds([id]);for(const memberId of ids)store.updateOnline(memberId,{rejectedUrls:[],status:'pending',message:'已恢复排除记录，等待重新匹配'});if(store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK)await queue.enqueue(ids,true);changed()});
 handle('listCollections',()=>store.listCollections());
 handle('setContextMenuPreferences',(value:unknown)=>{const settings=store.saveSettings({contextMenu:normalizeContextMenuPreferences(value,true)});changed();return settings});
 handle('recycleAssets',recycleMaterials);
 handle('hiddenAssets',(query:AssetQuery={})=>store.hiddenAssets(query));
 handle('setHidden',(input:unknown,hidden:boolean)=>{if(typeof hidden!=='boolean')throw new Error('隐藏状态无效。');const ids=parseIds(input);if(hidden)queue.exclude(expandedIds(ids));store.setHidden(ids,hidden);changed()});
 handle('forceRematch',(input:unknown)=>{const ids=expandedIds(input);for(const id of ids)if(getRawAsset(id).kind==='unity-project')throw new Error('工程不参与商品匹配。');queue.exclude(ids);store.requestRematch(ids);changed()});
 handle('skipMatching',(id:string)=>{const asset=getAsset(id);if(asset.kind==='unity-project')throw new Error('工程不参与商品匹配。');const ids=expandedIds([id]);store.updateManual(ids,{matchingMode:'manual'});queue.exclude(ids);changed()});
 handle('restoreMatching',(id:string)=>{const asset=getAsset(id);if(asset.kind==='unity-project')throw new Error('工程不参与商品匹配。');store.updateManual(expandedIds([id]),{matchingMode:'auto'});changed()});
 handle('projectMaterials',async(id:string,refresh=false)=>{if(typeof refresh!=='boolean')throw new Error('刷新选项无效。');const project=getAsset(id);if(project.kind!=='unity-project')throw new Error('请选择一个 Unity 工程。');if(refresh)clearProjectMaterialCache(project.path);const catalog=store.list({view:'materials',limit:5000});const result=await inspectProjectMaterials(project,catalog.items,store.settings().roots);if(catalog.total>catalog.items.length){result.truncated=true;result.warnings.push('素材库较大，本次只核对前 5,000 个素材；未覆盖全部来源包。')}return result;});
 handle('projectProducts',async(id:string,refresh=false)=>{
  if(typeof refresh!=='boolean')throw new Error('刷新选项无效。');const project=getAsset(id);if(refresh)clearProjectProductCache(project.path);
  const catalog=store.list({view:'materials',limit:5000}),jobs=await projectImports.productImportRecords(project.id),page=await inspectProjectProducts(project,catalog.items,store.settings().roots,jobs);
  page.onlineEnabled=store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK;
  if(catalog.total>catalog.items.length){page.truncated=true;page.warnings.push('素材库较大，本次只核对前 5,000 个素材；未覆盖全部来源包。')}return page;
 });
 handle('registerProjectProduct',(id:string,key:string)=>editSource(async()=>{
  if(typeof key!=='string'||!/^[a-f0-9]{32}$/.test(key))throw new Error('工程商品选择已失效，请刷新后重试。');const activeStore=store,project=getAsset(id);
  const catalog=store.list({view:'materials',limit:5000}),page=await inspectProjectProducts(project,catalog.items,store.settings().roots,await projectImports.productImportRecords(project.id)),item=page.items.find(p=>p.key===key);
  if(!item)throw new Error('工程商品选择已失效，请刷新后重试。');const input=await projectProductInput(project,item,store.settings().roots);
  if(closing||migrating||store!==activeStore||store.get(id)?.path!==project.path||!store.isPathActive(input.path))throw new Error('工程目录已变化，请重新选择工程。');
  const reuse=item.asset&&!item.asset.missing&&(item.state==='identified'||item.evidence.some(e=>e.kind==='import-record')||[item.asset.path,...(item.asset.members??[]).map(m=>m.path)].some(p=>path.resolve(p).toLowerCase()===path.resolve(input.path).toLowerCase()));
  const asset=reuse?store.get(item.asset!.id):store.upsertScan(input);if(!asset)throw new Error('工程商品选择已失效，请刷新后重试。');
  store.updateManual([project.id],{relatedIds:[...new Set([...(store.get(project.id)?.manual.relatedIds??[]),asset.id])]});
  for(const memberId of asset.members?.map(m=>m.id)||[asset.id]){const raw=store.getRaw(memberId);store.updateManual([memberId],{relatedIds:[...new Set([...(raw?.manual.relatedIds??[]),project.id])]})}
  clearProjectMaterialCache(project.path);const queued=!!(store.settings().onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK&&asset.online.status!=='matched'&&asset.manual.matchingMode!=='manual');
  if(queued)await queue.enqueue([asset.id]);changed();return {asset:store.get(asset.id)??asset,queued};
 }));
 handle('projectFiles',(id:string,relative='',offset=0)=>listProjectFiles(getAsset(id),store.settings().roots,relative,offset));
 handle('projectFileAction',async(id:string,relative:string,action:string)=>{if(!['reveal','copy'].includes(action))throw new Error('工程文件操作无效。');const access=await validateProject(getAsset(id),store.settings().roots),file=relativeAssetPath(access.assets,relative);await noLinks(file);await fsp.access(file);if(action==='copy')clipboard.writeText(file);else shell.showItemInFolder(file)});
 handle('pluginDownloadState',()=>({...publicPlugins.state(),busy:publicPlugins.busy||!!pluginInstall}));
 handle('cancelPluginDownload',()=>{pluginCancelGeneration++;publicPlugins.cancel()});
 handle('openPluginLink',async(id:string,kind:string)=>{if(!store.settings().onlineEnabled||process.env.VRC_LIBRARY_NO_NETWORK)throw new Error('请先开启联网。');await shell.openExternal(pluginLink(id,kind));});
 handle('installPublicPlugin',async(id:string,projectId:string)=>{
  if(pluginInstall||projectImports.busy||publicPlugins.busy)throw new Error('正在处理插件或工程导入，请稍候。');
  const descriptor=publicPlugin(id);if(!descriptor.directPackage)throw new Error('此插件请使用官方 VCC／ALCOM 安装入口。');
  const current=store,service=publicPlugins,imports=projectImports,generation=pluginCancelGeneration;
  const operation=(async()=>{
   const project=await validateProject(getAsset(projectId),store.settings().roots);
   if(project.packages.some(p=>p.name===descriptor.packageId))throw new Error('此工程已在包管理器中登记此插件，请在 VCC／ALCOM 中更新。');
   let hasAvatars=project.packages.some(p=>p.name==='com.vrchat.avatars');
   try{const manifest=JSON.parse(await smallFile(path.join(project.root,'Packages','vpm-manifest.json')));if(manifest.dependencies?.[descriptor.packageId]||manifest.locked?.[descriptor.packageId])throw new Error('此工程已通过 VPM 安装此插件，请在 VCC／ALCOM 中更新。');hasAvatars=hasAvatars||!!(manifest.dependencies?.['com.vrchat.avatars']||manifest.locked?.['com.vrchat.avatars'])}catch(error:any){if(error.code!=='ENOENT')throw error}
   if(!hasAvatars)throw new Error('此插件用于 VRChat 角色工程，请先通过 VCC／ALCOM 添加 Avatars SDK。');
   if((await imports.jobs(projectId)).some(j=>!['completed','failed','cancelled'].includes(j.state)))throw new Error('此工程已有等待中的导入，请先处理。');
   if(generation!==pluginCancelGeneration||closing||migrating)throw new Error('插件导入已取消。');
   const asset=await service.download(id);
   if(generation!==pluginCancelGeneration||closing||migrating||store!==current||!store.settings().onlineEnabled)throw new Error('操作已停止；安装包已保留，尚未导入工程。');
   await service.verifySource(asset.id);const choices=await imports.sources(asset.id);if(choices.length!==1)throw new Error('插件安装包选择无效。');
   const preview=await imports.preview(asset.id,projectId,choices[0].id);
   if(generation!==pluginCancelGeneration||closing||migrating||store!==current||!store.settings().onlineEnabled)throw new Error('操作已停止，未导入工程。');
   return imports.execute(preview.token);
  })();pluginInstall=operation;changed();try{return await operation}finally{if(pluginInstall===operation)pluginInstall=undefined;changed()}
 });
 handle('importSources',(id:string)=>projectImports.sources(id));
 handle('previewProjectImport',async(assetId:string,projectId:string,choiceId:string,options?:ProjectImportOptions)=>{if(typeof assetId==='string'&&assetId.startsWith('plugin:'))await publicPlugins.verifySource(assetId);return projectImports.preview(assetId,projectId,choiceId,options)});
 handle('executeProjectImport',(token:string)=>projectImports.execute(token));
 handle('projectImportLocation',async(id:string,relative:string,action:string)=>{if(!['reveal','copy'].includes(action))throw new Error('导入位置操作无效。');const file=await projectImports.importLocation(id,relative);if(action==='copy')clipboard.writeText(relative);else shell.showItemInFolder(file)});
 handle('retryProjectMA',(id:string)=>projectImports.retryMa(id));
 handle('updateProjectMAHelper',(id:string)=>projectImports.updateMaHelper(id));
 handle('projectReadiness',(id:string)=>projectImports.readiness(id));
 handle('reviewProjectImport',(id:string,patch:any)=>projectImports.review(id,patch));
 let workbenchSelection=0;
 handle('selectWorkbenchProject',async(id:string)=>{if(typeof id!=='string'||id.length>128||id.includes('\0'))throw new Error('工程选择无效。');const selection=++workbenchSelection,selectedStore=store;if(id)await validateProject(getAsset(id),store.settings().roots);if(selection!==workbenchSelection||selectedStore!==store)return;store.saveSettings({workbenchProjectId:id||undefined});changed()});
 handle('projectImportJobs',(id?:string)=>projectImports.jobs(id));
 handle('findProjectImportLocations',(id:string)=>projectImports.findLocations(id));
 handle('cancelProjectImport',(id:string)=>projectImports.cancel(id));
 handle('openProjectEditor',(id:string)=>projectImports.openProject(id));
 handle('chooseUnityEditor',async(id:string)=>{const project=await validateProject(getAsset(id),store.settings().roots);const picked=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择相同版本的 Unity Editor',properties:['openFile'],filters:[{name:'Unity Editor',extensions:['exe']}]},uiLanguage()));if(picked.canceled)return false;const file=path.resolve(picked.filePaths[0]),version=await editorVersion(file);if(!project.version||version!==project.version)throw new Error('编辑器版本与工程不一致，未启动或修改工程。');store.saveSettings({unityEditorPath:file});changed();return true;});
 handle('chooseProject',async()=>{if(scanner.progress().running)throw new Error('请先停止扫描，再添加工程。');const current=store,result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'选择 Unity 工程文件夹',properties:['openDirectory']},uiLanguage()));if(result.canceled)return null;return addProject(result.filePaths[0],current)});
 handle('addProject',(selected:unknown)=>addProject(selected));
 handle('saveCollection',(input:unknown)=>{const result=store.saveCollection(input as any);changed();return result});
 handle('updateCollectionMembers',(id:string,ids:unknown,mode:'add'|'remove')=>{if(mode!=='add'&&mode!=='remove')throw new Error('集合操作无效。');store.updateCollectionMembers(id,expandedIds(ids),mode);changed()});
 handle('deleteCollection',(id:string)=>{store.deleteCollection(id);changed()});
 handle('listTags',()=>store.listTags());
 handle('mergeTags',(names:unknown,target:string)=>{store.mergeTags(names as any,target);changed()});
 handle('setTagAliases',(name:string,aliases:unknown)=>{store.setTagAliases(name,aliases as any);changed()});
 handle('updateTags',(ids:unknown,add:unknown,remove:unknown)=>{store.updateTags(expandedIds(ids),add as any,remove as any);changed()});
 handle('setViewPreferences',(preferences:unknown)=>{if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))throw new Error('显示设置无效。');const value=preferences as any;if(Object.keys(value).some(key=>!['viewMode','density','coverFit','reviewSort','reviewHeaderPinned','reviewShowLocalImage','theme','language'].includes(key))||value.viewMode!==undefined&&!['grid','list'].includes(value.viewMode)||value.density!==undefined&&!['compact','standard','spacious'].includes(value.density)||value.coverFit!==undefined&&!['contain','cover'].includes(value.coverFit)||value.reviewSort!==undefined&&!REVIEW_SORTS.includes(value.reviewSort)||Object.hasOwn(value,'theme')&&!THEME_IDS.includes(value.theme)||Object.hasOwn(value,'language')&&!LANGUAGE_IDS.includes(value.language)||Object.hasOwn(value,'reviewHeaderPinned')&&typeof value.reviewHeaderPinned!=='boolean'||Object.hasOwn(value,'reviewShowLocalImage')&&typeof value.reviewShowLocalImage!=='boolean')throw new Error('显示设置无效。');const settings=store.saveSettings(value);if(Object.hasOwn(value,'theme')||Object.hasOwn(value,'language'))refreshTheme();changed();return settings});
 handle('undoMetadata',()=>{const restored=store.undoMetadata();if(restored)changed();return restored});
 handle('setOnlineEnabled',async(enabled:boolean)=>{if(typeof enabled!=='boolean')throw new Error('设置无效。');inboxMonitor.pause();discovery?.cancel();store.saveSettings({onlineEnabled:enabled});if(!enabled)discoveryAi?.close();if(enabled)void inboxMonitor.check('foreground');proxy.setEnabled(enabled);booth.networkChanged();baidu.networkChanged();xianyu.networkChanged();if(enabled){await proxy.inspect();await booth.restoreDownloadAssociations();await queue.resume();await queue.enqueue()}else{await aiQueue.stop();setupAI();publicPlugins.cancel();updater.cancel();preview.close();booth.close();queue.pause()}changed()});
 handle('setZoom',applyZoom);handle('checkProxy',()=>proxy.check());
 handle('setConcurrency',(value:number)=>{if(!Number.isInteger(value)||value<1||value>6)throw new Error('并发数量必须是 1 到 6 的整数。');store.saveSettings({downloadConcurrency:value});queue.setConcurrency(value);changed();return value});
 handle('openNetworkUrl',async(url:string)=>{if(typeof url!=='string'||url.length>4000)throw new Error('网址无效。');const visible=[queue.progress.transfer?.url,...(queue.progress.activeTransfers||[]).map(x=>x.url),...(queue.progress.recentTransfers||[]).map(x=>x.url)];if(!visible.includes(url))throw new Error('只能打开当前网络任务中的链接。');await shell.openExternal(publicHttpsUrl(url).href)});
 handle('chooseBackupDir',selectBackupLocation);
 handle('chooseDataDir',()=>withInboxSuspended(async()=>{
  const target=await pickDataLocation(window!);if(!target||path.resolve(target).toLowerCase()===dataDir.toLowerCase())return false;
  updater.cancel();
  if(fs.existsSync(target)&&(await fsp.readdir(target)).length)throw new Error('目标资料库文件夹已有内容，请选择一个新位置。');
  const old=dataDir,settings=store.settings();inboxMonitor.pause();invalidateInboxDownload();await sourceChanges;await discoveryAi?.shutdown();await booth.shutdown();await baidu.shutdown();await xianyu.shutdown();const snapshots=await prepareCookieMigration(old,[DEFAULT_ROOT,...settings.roots,...(settings.detachedRoots??[])]);await aiQueue.stop();aiService.close();discovery?.cancel();migrating=true;modelPreview?.close();preview.close();if(debounce){clearTimeout(debounce);debounce=undefined}
  proxy.setEnabled(false);queue.stop();scanner.cancel();await Promise.all([queue.waitIdle(),scanner.waitIdle(),recycleOperation]);store.close();
  try{
   await copyLibraryData(old,target,[DEFAULT_ROOT,...settings.roots,...(settings.detachedRoots??[])],testProfile,snapshots);rememberLocation(target,settings.backupDir,[DEFAULT_ROOT,...settings.roots,...(settings.detachedRoots??[])]);
   if(process.env.VRC_LIBRARY_NO_RELAUNCH){dataDir=target;store=new Store(dataDir,settings.roots);setupServices();migrating=false;changed();return true}
   if(testProfile)process.env.VRC_LIBRARY_DATA_DIR=target;
   app.relaunch({execPath:process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe')});setTimeout(()=>app.quit(),250);return true;
  }catch(error){store=new Store(old,settings.roots);setupServices();migrating=false;if(settings.onlineEnabled&&!process.env.VRC_LIBRARY_NO_NETWORK){await queue.resume()}changed();throw error}
 }));
 handle('removeRoot',async(root:unknown)=>{
  if(scanner.progress().running)throw new Error('请先停止扫描，再修改素材目录。');
  if(typeof root!=='string'||!path.isAbsolute(root)||!store.settings().roots.some(value=>path.resolve(value).toLowerCase()===path.resolve(root).toLowerCase()))throw new Error('素材目录未登记。');
  const affected=store.all().filter(asset=>contained(root,asset.path)).flatMap(asset=>asset.members?.map(member=>member.id)||[asset.id]);store.removeRoot(root);queue.exclude(affected.filter(id=>{const raw=store.getRaw(id);return !raw||!store.isPathActive(raw.path)}));preview.close();changed();return true;
 });
 handle('removeRoots',async(input:unknown)=>{
  if(scanner.progress().running)throw new Error('请先停止扫描，再修改素材目录。');
  const roots=normalizeSourceRoots(input),registered=new Set(store.settings().roots.map(sourcePathKey));
  if(!roots.length||roots.some(root=>!registered.has(sourcePathKey(root))))throw new Error('素材目录未登记。');
  const affected=store.all().flatMap(asset=>asset.members??[asset]).filter(asset=>roots.some(root=>contained(root,asset.path))).map(asset=>asset.id);
  store.removeRoots(roots);
  // Once settings commit, ancillary failures must not report a failed removal.
  try{queue.exclude(affected.filter(id=>{const raw=store.getRaw(id);return !raw||!store.isPathActive(raw.path)}))}catch{
   try{queue.pause()}catch{/* Pausing updates memory before attempting to save. */}
   const warning='素材位置已移除，但联网补全队列未能保存；已暂停补全，请检查资料库磁盘后重试。';if(!store.recoveryWarnings.includes(warning))store.recoveryWarnings.push(warning);
  }
  try{preview.close()}catch{
   const warning='素材位置已移除，但商品预览未能关闭；请手动关闭预览窗口。';if(!store.recoveryWarnings.includes(warning))store.recoveryWarnings.push(warning);
  }
  changed();return true;
 });
 handle('updateState',()=>updater.state());
 handle('checkForUpdates',()=>updater.check());
 handle('downloadUpdate',()=>updater.download());
 handle('cancelUpdate',()=>updater.cancel());
 handle('openUpdatePage',()=>shell.openExternal('https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/releases/latest'));
 handle('installUpdate',async()=>{
  if(scanner.progress().running||queue.progress.running||booth.snapshot().downloads.some(value=>value.state==='downloading'))throw new Error('请先停止扫描、联网补全和下载，再安装更新。');
  if(updater.state().status!=='ready')throw new Error('请先下载并校验更新。');
  const answer=await dialog.showMessageBox(window!,localizeDialogOptions({type:'question',title:'重启并更新',message:'现在关闭程序并安装已校验的更新？',detail:'更新只替换当前免安装程序，资料库与原素材保持原样。更新失败时会尝试还原旧程序。',buttons:['重启并更新','取消'],defaultId:1,cancelId:1,noLink:true},uiLanguage()));
  if(answer.response!==0)return false;return updater.install();
 });
 handle('chooseRoot',async()=>{
  if(scanner.progress().running)throw new Error('请先停止扫描，再修改素材目录。');
  const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'添加素材目录',defaultPath:DEFAULT_ROOT,properties:['openDirectory']},uiLanguage()));if(result.canceled)return false;
  const root=await fsp.realpath(result.filePaths[0]);assertNotRecycling();assertSourceSeparation(dataDir,[root],store.settings().backupDir);
  const roots=store.settings().roots;if(roots.some(x=>contained(x,root))&&store.isPathActive(root))throw new Error('此文件夹已包含在素材范围内，无需再次添加。');
  const nextRoots=[...roots.filter(value=>!contained(root,value)),root];store.saveSettings({roots:nextRoots});changed();setTimeout(()=>void performScan().catch(error=>emit({type:'scan',progress:{running:false,found:0,current:'',errors:[error.message]}})),0);return true;
 });
 handle('backup',async()=>{
  const folder=await ensureBackupLocation();if(!folder)return null;
  const result=await dialog.showSaveDialog(window!,localizeDialogOptions({title:'备份分类、备注和封面',defaultPath:path.join(folder,`VRC素材库-${new Date().toLocaleDateString('sv-SE')}.vrclib.json`),filters:[{name:'素材库备份',extensions:['vrclib.json','json']}]},uiLanguage()));
  if(result.canceled||!result.filePath)return null;
  const target=assertUserStorage(result.filePath,protectedRoots(),testProfile);
  store.exportData(target);store.saveSettings({backupDir:path.dirname(target)});rememberLocation(dataDir,path.dirname(target));changed();return target;
 });
 handle('restore',()=>withInboxSuspended(async()=>{
  if(scanner.progress().running)throw new Error('请先停止扫描，再恢复资料库。');
  const result=await dialog.showOpenDialog(window!,localizeDialogOptions({title:'恢复素材库备份',properties:['openFile'],filters:[{name:'素材库备份',extensions:['json']}]},uiLanguage()));if(result.canceled)return false;
  const stat=await fsp.stat(result.filePaths[0]);if(stat.size>512*1024*1024)throw new Error('备份文件超过 512 MB。');
  const contents=JSON.parse(await fsp.readFile(result.filePaths[0],'utf8'));
  if(contents.format!=='vrchat-asset-library'||![1,2].includes(contents.version)||!Array.isArray(contents.assets))throw new Error('不是有效的素材库备份。');
  const result2=await dialog.showMessageBox(window!,localizeDialogOptions({type:'question',title:'恢复资料库',message:'合并恢复备份中的分类、备注和封面？',detail:'会更新备份里对应的资料库记录，保留现有的其他记录。原素材保持原样；当前资料库会先自动备份。',buttons:['恢复','取消'],defaultId:1,cancelId:1},uiLanguage()));if(result2.response!==0)return false;
  const backup=await ensureBackupLocation();if(!backup)return false;
  discovery?.cancel();inboxMonitor.pause();invalidateInboxDownload();await sourceChanges;await recycleOperation;await discoveryAi?.shutdown();await booth.shutdown();await baidu.shutdown();await xianyu.shutdown();preview.close();queue.pause();scanner.cancel();await Promise.all([queue.waitIdle(),scanner.waitIdle()]);store.exportData(assertUserStorage(path.join(backup,`before-restore-${Date.now()}.json`),protectedRoots(),testProfile));
  store.importData(result.filePaths[0]);queue.exclude(store.all().map(asset=>asset.id));store.saveSettings({backupDir:backup});rememberLocation(dataDir,backup);window?.webContents.setZoomFactor(store.settings().uiZoom||1);refreshTheme();changed();return true;
 }));
}
async function createWindow(){
 window=new BrowserWindow({width:1480,height:940,minWidth:980,minHeight:660,backgroundColor:THEME_BACKGROUNDS[normalizeTheme(store.settings().theme)],title:translate('VRC素材库',uiLanguage()),icon:path.resolve(__dirname,'../../../assets/library.png'),autoHideMenuBar:true,show:false,
  webPreferences:{preload:path.join(__dirname,'preload.js'),additionalArguments:['--vrc-theme='+normalizeTheme(store.settings().theme),'--vrc-language='+uiLanguage()],contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 window.setMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
 window.webContents.on('context-menu',(_event,params)=>{if(params.isEditable)Menu.buildFromTemplate([{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{type:'separator'},{role:'selectAll'}]).popup({window:window!})});
 window.once('ready-to-show',()=>{if(!process.env.VRC_LIBRARY_TEST_HIDDEN)window?.show()});
 await window.loadFile(path.resolve(__dirname,'../../renderer/index.html'));
 window.webContents.setZoomFactor(store.settings().uiZoom||1);
 await proxy.inspect();
 if(process.env.VRC_LIBRARY_SMOKE){
  const report=assertSafeWrite(path.join(dataDir,'smoke-ready.json'),dataDir,[DEFAULT_ROOT,...store.settings().roots]);
  await fsp.writeFile(report,JSON.stringify({version:app.getVersion(),electron:process.versions.electron,node:process.versions.node,packaged:app.isPackaged,stats:store.stats(),sqlite:true}));
  if(process.env.VRC_LIBRARY_SMOKE_EXIT)setTimeout(()=>app.quit(),1200);
 }
 if(process.env.VRC_LIBRARY_NO_NETWORK)queue.pause();else if(store.settings().onlineEnabled && !queue.progress.paused){await booth.restoreDownloadAssociations();await queue.resume();await queue.enqueue()}
 if(!process.env.VRC_LIBRARY_NO_AUTOSCAN && (store.stats().total===0||store.all().some(a=>!a.fileIdentity||a.kind!=='unity-project'&&(!Array.isArray(a.localEvidence)||!Array.isArray(a.localNameHints)))))setTimeout(()=>void performScan().catch(e=>emit({type:'scan',progress:{running:false,found:0,current:'',errors:[e.message]}})),700);
}
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}});
if(primary)app.whenReady().then(async()=>{
 if(!await initializeLocation()){app.quit();return}
 store=new Store(dataDir,initialRoots);
 rememberLocation(dataDir,store.settings().backupDir);
 store.introduceXTheme();
 setupServices();
 protocol.handle('library-cover',async request=>{
  try{const url=new URL(request.url);if(url.hostname!=='cache')return new Response('',{status:404});const file=safeCoverPath(dataDir,decodeURIComponent(url.pathname.slice(1)));const actual=await fsp.realpath(file);const cache=await fsp.realpath(path.join(dataDir,'cache'));if(!contained(cache,actual))return new Response('',{status:403});return net.fetch(pathToFileURL(actual).href)}catch{return new Response('',{status:404})}
 });
 registerHandlers();await refreshDownloadAvailability();await createWindow();
 try{await acknowledgeUpdateStartup(dataDir,protectedRoots(),app.getVersion())}catch(error){console.error(translate('更新启动确认无效；将保留或恢复原版本。',uiLanguage()),error instanceof Error?error.message:String(error))}
}).catch(error=>{dialog.showErrorBox('素材库启动失败',error instanceof Error?error.message:String(error));app.quit()});
app.on('window-all-closed',()=>app.quit());
let exitReady=false;
app.on('before-quit',event=>{if(exitReady)return;event.preventDefault();closing=true;discovery?.cancel();void aiQueue?.stop();aiService?.close();modelPreview?.close();publicPlugins?.cancel();inboxMonitor?.stop();invalidateInboxDownload();updater?.close();preview?.close();scanner?.cancel();if(!migrating){proxy?.setEnabled(false);queue?.stop()}void Promise.allSettled([pluginInstall,publicPlugins?.waitIdle(),recycleOperation,projectImports?.waitIdle(),sourceChanges,discoveryAi?.shutdown(),booth?.shutdown(),baidu?.shutdown(),xianyu?.shutdown(),queue?.waitIdle(),scanner?.waitIdle()]).then(()=>{exitReady=true;app.quit()})});
