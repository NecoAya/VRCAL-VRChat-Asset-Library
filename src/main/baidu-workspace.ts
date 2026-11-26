import {BrowserWindow,WebContentsView,ipcMain,session,safeStorage} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {lookup} from 'node:dns/promises';
import {pathToFileURL} from 'node:url';
import {assertSafeWrite,writeOwnedAtomic} from './safety';
import {isPublicAddress} from './online';
import {normalizeTheme,THEME_BACKGROUNDS,type AppLanguage,type AppTheme} from '../shared/contracts';
import {normalizeLanguage} from '../shared/i18n';
import {snapshotBrowserCookies} from './browser-cookie-migration';
import {BaiduCrawler} from './baidu-crawler';
import {BAIDU_HOME,BAIDU_SCROLL_SCRIPT,BAIDU_DIRECTORY_SNAPSHOT_SCRIPT,currentDirectory,baiduBreadcrumbMatches,BAIDU_VISIBLE_SNAPSHOT_SCRIPT,baiduAccountKey,baiduBrowserUrl,baiduDirectoryUrl,baiduDisplayUrl,parseBaiduVisiblePage,type BaiduDirectoryCapture,type BaiduWorkspaceState,type BaiduVisiblePageInput,type BaiduPageSnapshot} from './baidu-page';

export interface BaiduWorkspaceDependencies {
 parent:()=>BrowserWindow|null;dataDir:string;roots:()=>string[];canNetwork:()=>boolean;getTheme?:()=>AppTheme;getLanguage?:()=>AppLanguage;onChanged:()=>void;
 /** Commits toolbar captures and incremental traversal batches. Direct capture() returns data for its caller to commit. */
 onCapture?:(capture:BaiduDirectoryCapture)=>void|Promise<void>;
 onDownload?:(event:Electron.Event,item:Electron.DownloadItem,contents?:Electron.WebContents)=>boolean;
 allowDownloadNavigation?:(contentsId:number,url:string)=>boolean;
 onSessionInvalidated?:()=>void;
 onShutdown?:()=>Promise<void>;
}
const officialCookieDomain=(domain:string)=>/^\.?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*baidu\.com$/i.test(domain)&&domain.length<=254&&domain.replace(/^\./,'').split('.').every(label=>label.length<=63);
function officialBaiduCookie(cookie:any,now=Date.now()/1000):cookie is Electron.Cookie&{domain:string} {
 if(!cookie||typeof cookie.name!=='string'||!cookie.name||/[\x00-\x20\x7f;=]/.test(cookie.name)||typeof cookie.value!=='string'||/[\x00-\x1f\x7f]/.test(cookie.value)||Buffer.byteLength(cookie.name)+Buffer.byteLength(cookie.value)>16384||typeof cookie.domain!=='string'||!officialCookieDomain(cookie.domain))return false;
 if(cookie.path!==undefined&&(typeof cookie.path!=='string'||!cookie.path.startsWith('/')||cookie.path.length>4096||/[\x00-\x1f\x7f;]/.test(cookie.path)))return false;
 if(['hostOnly','httpOnly','secure','session'].some(key=>cookie[key]!==undefined&&typeof cookie[key]!=='boolean')||cookie.sameSite!==undefined&&!['unspecified','no_restriction','lax','strict'].includes(cookie.sameSite))return false;
 return cookie.expirationDate===undefined?cookie.session===true:cookie.session!==true&&Number.isFinite(cookie.expirationDate)&&cookie.expirationDate>now&&cookie.expirationDate<=8640000000000;
}
function cookieKey(cookie:Electron.Cookie):string {return JSON.stringify([cookie.name,(cookie.domain||'').replace(/^\./,'').toLowerCase(),cookie.path||'/'])}
/** Same owned profile only. Encrypted migration export is never part of an ordinary catalog backup. */
export function prepareBaiduSessionMigration(dataDir:string,roots:string[]){return snapshotBrowserCookies(dataDir,roots,'baidu-session',officialBaiduCookie,cookieKey)}
const TEXT={
 title:['百度网盘 · 目录读取','Baidu Netdisk · folder reader','百度網盤 · フォルダー読み取り'],
 back:['返回','Back','戻る'],reload:['重载','Reload','再読み込み'],capture:['读取当前文件夹','Read visible folder','表示中のフォルダーを読み取る'],close:['关闭','Close','閉じる'],
 scan:['读取此文件夹及所有子文件夹','Read this folder and all subfolders','このフォルダーとすべてのサブフォルダーを読み取る'],pause:['暂停','Pause','一時停止'],resume:['继续读取','Resume','読み取りを再開'],stop:['停止','Stop','停止'],retry:['重试失败目录','Retry failed folders','失敗したフォルダーを再試行'],
 folder:['当前文件夹','Current folder','現在のフォルダー'],scanSummary:['已读 {done} 个目录 · {files} 个文件 · 待处理 {pending} 个目录 · 失败 {failed}','Read {done} folders · {files} files · {pending} folders pending · {failed} failed','{done} フォルダー・{files} ファイル読取済み / 残り {pending} フォルダー / 失敗 {failed}'],scanRunning:['正在逐层读取，页面会自动切换，请不要手动切换目录。','Reading subfolders. The page changes automatically; please do not navigate manually.','フォルダーを順に読み取っています。ページは自動で切り替わります。手動で移動しないでください。'],scanPaused:['读取已暂停，已有记录保留，可继续读取。','Reading paused. Saved entries are retained; you can resume.','読み取りを一時停止しました。保存済みの記録は保持され、再開できます。'],scanCompleted:['本轮读取结束；有失败的目录可单独重试，结果仍以网页列表为准。','This pass has finished. Failed folders can be retried; results reflect the webpage list.','今回の読み取りを終了しました。失敗したフォルダーは再試行できます。結果はウェブ一覧に基づきます。'],scanStopped:['读取已停止，已有记录保留。','Reading stopped. Saved entries are retained.','読み取りを停止しました。保存済みの記録は保持します。'],
 disclaimer:['只读取文件列表。','Reads the file list only.','ファイル一覧のみを読み取ります。'],
 ready:['选择要读取的文件夹。单层读取仅记录当前可见条目。','Open a folder to read. A single folder read records only visible entries.','読み取るフォルダーを開いてください。単一フォルダーの読み取りでは、表示中の項目のみを記録します。'],
 loading:['正在打开官方百度网盘…','Opening official Baidu Netdisk…','百度網盤の公式ページを開いています…'],
 reading:['正在读取当前可见文件行…','Reading currently visible file rows…','表示中のファイル行を読み取っています…'],
 captured:['已读取可见部分；未显示的内容没有同步，网站适配仍需核对。','Visible rows read. Unshown entries were not synced; verify the website layout before relying on them.','表示中の一部を読み取りました。未表示の項目は同期されていません。画面の対応状況を確認してください。'],
 offline:['联网已关闭。已读取的目录信息仍可在素材库查看。','Networking is off. Previously captured metadata remains available in the library.','ネット接続が無効です。読み取り済みの情報は素材庫で確認できます。'],
 login:['未能确认本窗口的登录身份。请在官方网页正常登录并完成验证。','This window’s login identity could not be confirmed. Sign in and finish verification on the official page.','このウィンドウのログイン情報を確認できません。公式ページでログインと認証を完了してください。'],
 changed:['账号或页面已变化，本次读取已取消，请重新读取。','The account or page changed. Capture was cancelled; read the folder again.','アカウントまたはページが変わったため、読み取りを中止しました。再度読み取ってください。'],
 unsupported:['暂时无法读取此页面的文件列表。可能仍在加载、需要验证或网页布局已变化；已有记录保留，不是文件夹选择错误。','The file list could not be read. It may still be loading, require verification, or use a changed layout. Saved entries are retained; the folder choice is not the cause.','ファイル一覧を読み取れません。読み込み中・認証待ち・画面の変更が考えられます。保存済みの記録は保持します。フォルダーの選択ミスではありません。'],
 failed:['网页加载失败，请检查网络并重载，或完成网站登录／验证。','The page could not load. Check the network and reload, or complete website login/verification.','ページを読み込めませんでした。接続を確認して再読み込みするか、ログインと認証を完了してください。'],
 blocked:['已阻止额外窗口、本地链接或不安全跳转。','An extra window, local link, or unsafe navigation was blocked.','追加ウィンドウ、ローカルリンク、または安全でない移動をブロックしました。'],
 download:['此窗口只读取目录，不下载文件。','This window reads directory metadata and does not download files.','このウィンドウはフォルダー情報のみ読み取り、ファイルはダウンロードしません。'],
 source:['浏览器操作来源无效。','Invalid browser command source.','ブラウザー操作の送信元が無効です。'],
 busy:['正在读取，请稍候。','A capture is in progress.','読み取り中です。しばらくお待ちください。'],
 saveFailed:['读取结果未能保存，请回到素材库重试。','The capture could not be saved. Retry from the library.','読み取り結果を保存できませんでした。素材庫から再試行してください。'],
 sessionRestoreFailed:['迁移的登录状态未能完整恢复，请在官方网页重新登录。','The migrated login state could not be fully restored. Sign in again on the official page.','移行したログイン情報を完全に復元できませんでした。公式ページで再度ログインしてください。'],
 closed:['请打开官方网页登录窗口读取目录。','Open the official web login window to read a folder.','公式ログインウィンドウを開いてフォルダーを読み取ってください。']
} as const;
type Message=keyof typeof TEXT;
interface Entry {window:BrowserWindow;view:WebContentsView;channel:string;toolbarUrl:string;loading:boolean;loaded:boolean;httpError:boolean;closed:boolean;status:Message;layoutListener?:(event:Electron.IpcMainEvent)=>void}
interface ToolbarState extends BaiduWorkspaceState {theme:AppTheme;language:AppLanguage;messages:Record<string,string>;canGoBack:boolean;canCapture:boolean;busy:boolean;directory:string}
const HEIGHT=204;

function publicHttps(raw:string):URL {
 let url:URL;try{if(typeof raw!=='string'||raw.length>16384)throw new Error();url=new URL(raw)}catch{throw new Error('unsafe-url')}
 const host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(host))throw new Error('unsafe-url');return url;
}

export class BaiduWorkspace {
 private remoteSession?:Electron.Session;private entry?:Entry;private initializing?:Promise<void>;private stopping=false;private clearing=false;private busy=false;private revision=0;private sessionHooksInstalled=false;private restoringCookies=false;private cookieRestoreFailed=false;
 private proofKey?:string;private recentCapture?:BaiduDirectoryCapture;private dns=new Map<string,{at:number;promise:Promise<void>}>();
 private readonly cookieListener=(_event:Electron.Event,cookie:Electron.Cookie)=>{if(!this.restoringCookies&&['BDUSS','BDUSS_BFESS'].includes(cookie.name)&&officialCookieDomain(cookie.domain||'')){try{this.deps.onSessionInvalidated?.();this.removeCookieMirror();this.cookieRestoreFailed=false}catch{this.cookieRestoreFailed=true}this.invalidate();this.setStatus(this.cookieRestoreFailed?'sessionRestoreFailed':'changed');this.notify()}};
 private readonly downloadListener=(event:Electron.Event,item:Electron.DownloadItem,contents?:Electron.WebContents)=>{if(this.deps.onDownload?.(event,item,contents))return;event.preventDefault();this.setStatus('download')};
 private readonly crawler:BaiduCrawler;
 constructor(private readonly deps:BaiduWorkspaceDependencies){
  const file=()=>assertSafeWrite(path.join(deps.dataDir,'baidu-directory-task.json'),deps.dataDir,deps.roots());
  this.crawler=new BaiduCrawler({identity:()=>this.identity(),readDirectory:(path,accept,check)=>this.readDirectory(path,accept,check),commit:async capture=>{if(!this.deps.canNetwork())throw new Error('baidu-offline');if(!this.deps.onCapture)throw new Error('baidu-save-failed');await this.deps.onCapture(capture);this.proofKey=capture.accountKey},load:()=>{const target=file();if(!fs.existsSync(target))return;const stat=fs.lstatSync(target);if(!stat.isFile()||stat.size>12*1024*1024)throw new Error();return JSON.parse(fs.readFileSync(target,'utf8'))},save:task=>{writeOwnedAtomic(file(),JSON.stringify(task),deps.dataDir,deps.roots())},onChanged:()=>this.notify()});
 }
 async scan(action:'start'|'pause'|'resume'|'stop'|'retry'):Promise<void>{
  if(action==='pause'){this.crawler.pause();return}if(action==='stop'){this.crawler.stop();return}
  if(!this.deps.canNetwork())throw new Error(this.t('offline'));
  const entry=this.entry;if(!entry||entry.closed||!entry.loaded||entry.loading||this.busy)throw new Error(this.t('failed'));
  if(action==='start')await this.crawler.start(currentDirectory(entry.view.webContents.getURL()));
  else if(action==='resume')await this.crawler.resume();else if(action==='retry')await this.crawler.retry();else throw new Error(this.t('source'));
 }
 async waitScanIdle():Promise<void>{await this.crawler.waitIdle()}
 private async readDirectory(directory:string,accept:(capture:BaiduDirectoryCapture)=>Promise<void>,check:()=>void):Promise<void>{
  const entry=this.entry;if(!entry||entry.closed)throw new Error('baidu-page-changed');
  const contents=entry.view.webContents,account=await this.identity();
  const guard=async()=>{check();if(!this.deps.canNetwork())throw new Error('baidu-offline');if(this.entry!==entry||entry.closed||contents.isDestroyed()||await this.identity()!==account)throw new Error('baidu-account-or-page-changed')};
  const delay=async(ms:number)=>{for(let remaining=ms;remaining>0;remaining-=100){await new Promise(resolve=>setTimeout(resolve,Math.min(100,remaining)));await guard()}};
  const evaluate=async(script:string):Promise<any>=>{await guard();let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([contents.executeJavaScript(script,true),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('baidu-page-timeout')),8000)})])}finally{if(timer)clearTimeout(timer)}};
  // Normal official webpage route, never a private list endpoint.
  const current=currentDirectory(contents.getURL());
  const before=current!==directory?await evaluate(BAIDU_DIRECTORY_SNAPSHOT_SCRIPT) as BaiduPageSnapshot:undefined;
  if(current!==directory){await delay(3000);await evaluate('location.hash='+JSON.stringify(new URL(baiduDirectoryUrl(directory)).hash)+';true');}

  const ready=async():Promise<BaiduPageSnapshot>=>{
   const deadline=Date.now()+30000;let last='',stable=0;
   while(Date.now()<deadline){
    await guard();if(currentDirectory(contents.getURL())!==directory)throw new Error('baidu-page-changed');
    const data=await evaluate(BAIDU_DIRECTORY_SNAPSHOT_SCRIPT) as BaiduPageSnapshot;
    const crumbs=(data.breadcrumb??[]).filter(p=>p!=='返回上一级');
    if(data.blocked)throw new Error('baidu-login-or-verification-required');
    if(data.url===contents.getURL()&&!data.loading&&baiduBreadcrumbMatches(directory,crumbs)&&data.html&&(!before||data.html!==before.html||JSON.stringify(data.breadcrumb)!==JSON.stringify(before.breadcrumb))){
     const key=data.html+'|'+JSON.stringify(data.scroll);stable=key===last?stable+1:0;last=key;if(stable>=1)return data;
    }
    await delay(600);
   }
   throw new Error('baidu-layout-or-loading-timeout');
  };
  await ready();await evaluate("(()=>{const e=document.querySelector('.wp-s-pan-table__body');if(e)e.scrollTop=0;return true})()");
  let previous='',bottomStable=0;
  for(let step=0;step<5000;step++){
   const data=await ready();await guard();
   const capture=parseBaiduVisiblePage({url:data.url,html:data.html,accountKey:account!,blocked:data.blocked});
   await accept(capture);await guard();
   const scroll=data.scroll;if(!scroll||scroll.height<=0)throw new Error('baidu-unsupported-scroll');
   if(data.hasNextPage)throw new Error('baidu-pagination-required');
   const signature=JSON.stringify([capture.items.map(i=>i.path),scroll.total,scroll.top]);
   if(scroll.top+scroll.height>=scroll.total-2){bottomStable=signature===previous?bottomStable+1:0;if(bottomStable>=2)return}else bottomStable=0;
   previous=signature;await evaluate(BAIDU_SCROLL_SCRIPT);await delay(1000);
  }
  throw new Error('baidu-directory-scroll-limit');
 }

 state():BaiduWorkspaceState {
  const entry=this.entry,open=!!entry&&!entry.closed;
  return {scan:this.crawler.state(),connected:!!this.proofKey&&open&&this.deps.canNetwork(),open,loading:open&&entry.loading,url:open&&!entry.view.webContents.isDestroyed()?baiduDisplayUrl(entry.view.webContents.getURL()):'',status:this.t(!this.deps.canNetwork()?'offline':entry?.status??'closed'),...(this.proofKey?{accountKey:this.proofKey}:{})};
 }
 /** A toolbar result remains available until consumed; it is never a full-directory synchronization. */
 takeCapture():BaiduDirectoryCapture|undefined {const value=this.recentCapture;this.recentCapture=undefined;return value?structuredClone(value):undefined}
 async open(directoryPath?:string):Promise<void> {
  const target=directoryPath===undefined?BAIDU_HOME:baiduDirectoryUrl(directoryPath);
  if(!this.deps.canNetwork())throw new Error(this.t('offline'));this.stopping=false;await this.initialize();this.installSessionHooks();
  if(this.entry&&!this.entry.closed){if(!process.env.VRC_LIBRARY_TEST_HIDDEN)this.entry.window.show();this.entry.window.focus();if(directoryPath!==undefined)await this.navigate(this.entry,target);return}
  const channel='vrc-baidu:'+randomUUID(),toolbarPath=path.resolve(__dirname,'../../../assets/baidu-workspace.html');
  const window=new BrowserWindow({width:1200,height:900,minWidth:820,minHeight:600,title:this.t('title'),parent:this.deps.parent()??undefined,show:false,autoHideMenuBar:true,backgroundColor:THEME_BACKGROUNDS[this.theme()],webPreferences:{preload:path.join(__dirname,'baidu-workspace-preload.js'),additionalArguments:['--vrc-baidu-channel='+channel,'--vrc-theme='+this.theme(),'--vrc-language='+this.language()],partition:'vrc-baidu-toolbar-'+randomUUID(),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,webviewTag:false,devTools:false}});
  // Deliberately no preload, extension, node integration, or contextBridge for the remote website.
  const view=new WebContentsView({webPreferences:{session:this.remoteSession,contextIsolation:true,nodeIntegration:false,nodeIntegrationInSubFrames:false,sandbox:true,webSecurity:true,webviewTag:false,allowRunningInsecureContent:false,disableDialogs:true,devTools:false}});
  const entry:Entry={window,view,channel,toolbarUrl:pathToFileURL(toolbarPath).href,loading:true,loaded:false,httpError:false,closed:false,status:'loading'};this.entry=entry;
  window.setMenu(null);window.contentView.addChildView(view);view.setBackgroundColor('#ffffff');
  const layout=()=>{if(entry.closed)return;const [width,height]=window.getContentSize();const toolbar=Math.min(Math.round(HEIGHT*window.webContents.getZoomFactor()),Math.max(100,height-160));view.setBounds({x:0,y:toolbar,width,height:Math.max(0,height-toolbar)})};window.on('resize',layout);layout();
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.on('will-attach-webview',event=>event.preventDefault());
  this.protectContents(entry);
  ipcMain.handle(channel,async(event,input:unknown)=>{
   if(this.entry!==entry||entry.closed||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.sender.getURL()!==entry.toolbarUrl)throw new Error(this.t('source'));
   if(typeof input!=='string'||!['state','back','reload','capture','close','scan','pause','resume','stop','retry'].includes(input))throw new Error(this.t('source'));
   if(input==='state')return this.toolbarState();if(input==='close'){this.close();return}
   if(!this.deps.canNetwork())throw new Error(this.t('offline'));
   if(['scan','pause','resume','stop','retry'].includes(input)){await this.scan(input==='scan'?'start':input as 'pause'|'resume'|'stop'|'retry');return this.toolbarState()}
   if(this.crawler.state().phase==='running')throw new Error(this.t('busy'));
   if(input==='capture'){const capture=await this.capture();if(this.deps.onCapture)try{await this.deps.onCapture(structuredClone(capture))}catch{this.setStatus('saveFailed');throw new Error(this.t('saveFailed'))}return this.toolbarState()}
   if(this.busy)throw new Error(this.t('busy'));if(input==='back'&&view.webContents.navigationHistory.canGoBack())view.webContents.navigationHistory.goBack();if(input==='reload')view.webContents.reload();return this.toolbarState();
  });
  entry.layoutListener=event=>{if(!entry.closed&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&event.sender.getURL()===entry.toolbarUrl)layout()};ipcMain.on(channel+':layout',entry.layoutListener);
  window.once('closed',()=>{this.dispose(entry);this.notify()});
  try{await window.loadFile(toolbarPath);if(entry.closed)return;this.emit();if(!process.env.VRC_LIBRARY_TEST_HIDDEN)window.show();await this.navigate(entry,target);this.notify()}catch{this.dispose(entry);throw new Error(this.t('failed'))}
 }
 async capture():Promise<BaiduDirectoryCapture> {
  if(!this.deps.canNetwork())throw new Error(this.t('offline'));const entry=this.entry;if(!entry||entry.closed||!entry.loaded||entry.loading)throw new Error(this.t('failed'));if(this.busy||this.crawler.state().phase==='running')throw new Error(this.t('busy'));
  this.busy=true;this.setStatus('reading');const revision=this.revision,contents=entry.view.webContents,startUrl=contents.getURL();
  try{
   const accountKey=await this.identity();if(!accountKey)throw new Error('baidu-login-identity-required');
   const snapshot:unknown=await contents.executeJavaScript(BAIDU_VISIBLE_SNAPSHOT_SCRIPT,true);
   if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('baidu-unsupported-layout');const data=snapshot as Partial<BaiduVisiblePageInput>;
   if(revision!==this.revision||entry.closed||contents.isDestroyed()||contents.getURL()!==startUrl||data.url!==startUrl||!this.deps.canNetwork()||accountKey!==await this.identity())throw new Error('baidu-account-or-page-changed');
   const pageData=data as Partial<BaiduPageSnapshot>;if(pageData.loading||pageData.breadcrumb&&!baiduBreadcrumbMatches(currentDirectory(startUrl),pageData.breadcrumb))throw new Error('baidu-page-loading');
   const capture=parseBaiduVisiblePage({url:startUrl,html:data.html as string,accountKey,blocked:data.blocked===true});
   if(revision!==this.revision||entry.closed||contents.getURL()!==startUrl||!this.deps.canNetwork())throw new Error('baidu-account-or-page-changed');
   this.proofKey=accountKey;this.recentCapture=structuredClone(capture);this.setStatus('captured');this.notify();return capture;
  }catch(error){this.proofKey=undefined;this.recentCapture=undefined;const code=error instanceof Error?error.message:'';const status:Message=code==='baidu-account-or-page-changed'?'changed':code.includes('login')?'login':'unsupported';this.setStatus(status);throw new Error(this.t(status))}finally{this.busy=false;this.emit()}
 }
 networkChanged():void {if(!this.deps.canNetwork()){this.deps.onSessionInvalidated?.();this.crawler.pause();this.invalidate();if(this.entry&&!this.entry.closed){this.entry.view.webContents.stop();this.entry.loading=false;this.entry.loaded=false;this.entry.status='offline'}}this.notify()}
 refreshTheme():void {if(this.entry&&!this.entry.closed){this.entry.window.setBackgroundColor(THEME_BACKGROUNDS[this.theme()]);this.entry.window.setTitle(this.t('title'));this.emit()}}
 close():void {if(this.entry)this.dispose(this.entry);this.notify()}
 async shutdown():Promise<void> {this.stopping=true;await this.deps.onShutdown?.();this.crawler.pause();await this.crawler.waitIdle();this.close();this.removeSessionHooks();await this.remoteSession?.cookies.flushStore();this.remoteSession?.flushStorageData();await this.remoteSession?.closeAllConnections()}
 async clearSession():Promise<void> {this.clearing=true;try{await this.initialize();await this.shutdown();if(this.remoteSession){await this.remoteSession.closeAllConnections();await this.remoteSession.clearStorageData();await this.remoteSession.clearCache();await this.remoteSession.cookies.flushStore()}this.removeCookieMirror();this.invalidate();this.notify()}finally{this.clearing=false}}

 private theme():AppTheme {return normalizeTheme(this.deps.getTheme?.())}
 private language():AppLanguage {return normalizeLanguage(this.deps.getLanguage?.())}
 private t(message:Message):string {return TEXT[message][this.language()==='en'?1:this.language()==='ja'?2:0]}
 async downloadSession():Promise<Electron.Session> {if(!this.deps.canNetwork()||this.clearing||this.stopping)throw new Error(this.t('offline'));await this.initialize();if(this.stopping||this.clearing)throw new Error(this.t('offline'));this.installSessionHooks();return this.remoteSession!}
 private async identity():Promise<string|undefined> {try{return this.remoteSession?baiduAccountKey(await this.remoteSession.cookies.get({url:'https://pan.baidu.com/'})):undefined}catch{return undefined}}
 private invalidate():void {this.revision++;this.proofKey=undefined;this.recentCapture=undefined}
 private initialize():Promise<void> {if(!this.initializing)this.initializing=this.initializeSession().catch(error=>{this.initializing=undefined;throw error});return this.initializing}
 private async initializeSession():Promise<void> {
  const folder=assertSafeWrite(path.join(this.deps.dataDir,'baidu-session'),this.deps.dataDir,this.deps.roots());
  // An existing native cookie store is authoritative, including logout. A migration snapshot is for a fresh copied profile only.
  const hasCookieDatabase=fs.existsSync(path.join(folder,'Network','Cookies'))||fs.existsSync(path.join(folder,'Cookies'));
  fs.mkdirSync(folder,{recursive:true});const remote=session.fromPath(folder,{cache:true});this.remoteSession=remote;
  // Chromium owns normal persistence. Only this profile's explicit migration snapshot can be restored.
  remote.setPermissionCheckHandler(()=>false);remote.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));remote.setDevicePermissionHandler(()=>false);
  this.installSessionHooks();
  if(!this.clearing&&!hasCookieDatabase)await this.restoreSessionCookies();
 }
 private installSessionHooks():void {
  const remote=this.remoteSession;if(!remote||this.sessionHooksInstalled)return;this.sessionHooksInstalled=true;
  remote.on('will-download',this.downloadListener);remote.cookies.on('changed',this.cookieListener);
  remote.webRequest.onBeforeRequest((details,callback)=>{
   const deny=()=>callback({cancel:true});if(this.stopping||this.clearing||!this.deps.canNetwork()){deny();return}
   if(details.resourceType!=='mainFrame'&&((/^data:/i.test(details.url)&&['image','font','media'].includes(details.resourceType))||details.url==='about:blank')){callback({cancel:false});return}
   try{
    const raw=details.resourceType!=='mainFrame'&&details.url.startsWith('blob:https://')?details.url.slice(5):details.url,url=details.resourceType==='mainFrame'&&!this.deps.allowDownloadNavigation?.(details.webContentsId??-1,raw)?baiduBrowserUrl(raw):publicHttps(raw);
    if(!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(details.method)){deny();return}
    // Subresources may use official CDN assets on other public HTTPS hosts. Main frames remain strictly allowlisted.
    void this.publicHost(url.hostname).then(()=>callback({cancel:this.stopping||this.clearing||!this.deps.canNetwork()})).catch(deny);
   }catch{deny()}
  });
 }
 private removeSessionHooks():void {const remote=this.remoteSession;if(!remote||!this.sessionHooksInstalled)return;remote.off('will-download',this.downloadListener);remote.cookies.off('changed',this.cookieListener);remote.webRequest.onBeforeRequest(null);this.sessionHooksInstalled=false}
 private cookieMirror():string {return assertSafeWrite(path.join(this.deps.dataDir,'baidu-session-cookies.bin'),this.deps.dataDir,this.deps.roots())}
 private removeCookieMirror():void {const file=this.cookieMirror();if(fs.existsSync(file))fs.unlinkSync(file)}
 private async restoreSessionCookies():Promise<void> {
  const remote=this.remoteSession;if(!remote)return;const file=this.cookieMirror();if(!fs.existsSync(file))return;if(!safeStorage.isEncryptionAvailable()){this.cookieRestoreFailed=true;return}this.restoringCookies=true;
  try{
   const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024)throw new Error();
   const payload=JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));if(!payload||!Number.isFinite(payload.at)||payload.at>Date.now()+60000||Date.now()-payload.at>30*86400000||!Array.isArray(payload.cookies)||payload.cookies.length>100||payload.cookies.some((cookie:unknown)=>!officialBaiduCookie(cookie)))throw new Error();
   const existing=await remote.cookies.get({}),nativeIdentity=baiduAccountKey(existing),mirrorIdentity=baiduAccountKey(payload.cookies);
   // A new native login is authoritative; never merge the previous account's auxiliary cookies into it.
   if(nativeIdentity&&mirrorIdentity&&nativeIdentity!==mirrorIdentity){this.removeCookieMirror();return}
   const keys=new Set(existing.map(cookieKey));for(const cookie of payload.cookies as (Electron.Cookie&{domain:string})[]){if(keys.has(cookieKey(cookie)))continue;const domain=cookie.domain.replace(/^\./,'');await remote.cookies.set({url:'https://'+domain+(cookie.path||'/'),domain:cookie.hostOnly?undefined:cookie.domain,path:cookie.path||'/',name:cookie.name,value:cookie.value,secure:cookie.secure,httpOnly:cookie.httpOnly,sameSite:cookie.sameSite,expirationDate:cookie.expirationDate});keys.add(cookieKey(cookie))}
   await remote.cookies.flushStore();
  }catch{this.cookieRestoreFailed=true;this.setStatus('sessionRestoreFailed')}finally{this.restoringCookies=false}
 }
 private async publicHost(host:string):Promise<void> {
  const cached=this.dns.get(host);if(cached&&Date.now()-cached.at<60000)return cached.promise;
  const promise=(async()=>{let timer:ReturnType<typeof setTimeout>|undefined;try{const records=await Promise.race([lookup(host,{all:true,verbatim:true}),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('dns-timeout')),5000)})]);if(!records.length||records.some(record=>!isPublicAddress(record.address)))throw new Error('private-address')}finally{if(timer)clearTimeout(timer)}})();
  this.dns.set(host,{at:Date.now(),promise});void promise.catch(()=>this.dns.delete(host));if(this.dns.size>128)this.dns.delete(this.dns.keys().next().value!);await promise;
 }
 private protectContents(entry:Entry):void {
  const contents=entry.view.webContents;
  contents.setWindowOpenHandler(()=>{this.setStatus('blocked');return {action:'deny'}});contents.on('will-attach-webview',event=>event.preventDefault());
  contents.on('will-frame-navigate',event=>{try{if(!this.deps.canNetwork())throw new Error();if(!event.isMainFrame&&event.url==='about:blank')return;if(event.isMainFrame)baiduBrowserUrl(event.url);else publicHttps(event.url)}catch{event.preventDefault();this.setStatus('blocked')}});
  contents.on('will-redirect',event=>{try{if(!this.deps.canNetwork())throw new Error();if(event.isMainFrame===false)publicHttps(event.url);else baiduBrowserUrl(event.url)}catch{event.preventDefault();this.setStatus('blocked')}});
  contents.on('login',(event,_details,_auth,callback)=>{event.preventDefault();callback();this.setStatus('blocked')});
  contents.on('did-start-navigation',event=>{if(!event.isMainFrame||entry.closed)return;this.invalidate();entry.loading=true;entry.loaded=false;entry.httpError=false;entry.status='loading';this.notify()});
  contents.on('did-navigate',(_event,_url,status)=>{if(status>=400&&!entry.closed){entry.httpError=true;entry.loaded=false;entry.loading=false;entry.status='failed';this.invalidate();this.notify()}});
  contents.on('did-navigate-in-page',(_event,_url,isMainFrame)=>{if(entry.closed||isMainFrame===false)return;this.invalidate();entry.loading=false;entry.loaded=!entry.httpError&&!!baiduDisplayUrl(contents.getURL());this.setStatus(entry.loaded?'ready':'failed');this.notify()});
  contents.on('did-finish-load',()=>{if(entry.closed)return;entry.loading=false;entry.loaded=!entry.httpError&&!!baiduDisplayUrl(contents.getURL());entry.status=entry.loaded?(this.cookieRestoreFailed?'sessionRestoreFailed':'ready'):'failed';this.notify()});
  contents.on('did-fail-load',(_event,_code,_description,_url,isMainFrame)=>{if(!isMainFrame||entry.closed)return;entry.loading=false;entry.loaded=false;this.invalidate();this.setStatus('failed');this.notify()});
  contents.on('render-process-gone',()=>{if(entry.closed)return;entry.loading=false;entry.loaded=false;this.invalidate();this.setStatus('failed');this.notify()});
 }
 private async navigate(entry:Entry,url:string):Promise<void> {if(entry.closed||!this.deps.canNetwork())return;try{await entry.view.webContents.loadURL(baiduBrowserUrl(url).href)}catch{if(!entry.closed){entry.loading=false;entry.loaded=false;this.setStatus('failed')}}}
 private toolbarState():ToolbarState {const entry=this.entry;return {...this.state(),theme:this.theme(),language:this.language(),messages:Object.fromEntries(Object.keys(TEXT).map(key=>[key,this.t(key as Message)])),canGoBack:!!entry&&!entry.closed&&!entry.view.webContents.isDestroyed()&&entry.view.webContents.navigationHistory.canGoBack(),canCapture:!!entry&&entry.loaded&&!entry.loading&&!this.busy&&this.crawler.state().phase!=='running'&&this.deps.canNetwork(),busy:this.busy||this.crawler.state().phase==='running',directory:(()=>{try{return currentDirectory(entry?.view.webContents.getURL()??'')}catch{return ''}})()}}
 private dispose(entry:Entry):void {if(entry.closed)return;this.crawler.pause();entry.closed=true;this.invalidate();ipcMain.removeHandler(entry.channel);if(entry.layoutListener)ipcMain.removeListener(entry.channel+':layout',entry.layoutListener);if(!entry.view.webContents.isDestroyed())entry.view.webContents.close();if(!entry.window.isDestroyed())entry.window.destroy();if(this.entry===entry)this.entry=undefined}
 private setStatus(status:Message):void {if(this.entry&&!this.entry.closed){this.entry.status=status;this.emit()}}
 private emit():void {const entry=this.entry;if(entry&&!entry.closed&&!entry.window.webContents.isDestroyed())entry.window.webContents.send(entry.channel+':state',this.toolbarState())}
 private notify():void {this.emit();this.deps.onChanged()}
}
