import type {ProjectReadiness,ImportReviewPatch} from './avatar-workbench';
import type {ProjectProductPage,ProjectProductRegistration} from './project-product-contracts';
import type {ContextMenuPreferences} from './context-menu';
import type {AssetRecycleResult} from './recycle-contracts';
import type {StorageLocation,BaiduState,CloudPage,CloudQuery} from './cloud-contracts';
import type {BaiduDownloadState,DownloadExtractionOptions} from './baidu-download';
import type {ProjectFilePage,ImportSourceChoice,ProjectImportPreview,ProjectImportJob,ProjectImportOptions} from './project-contracts';
export const CATEGORIES = ['未分类','模型','服装','头发','饰品','贴图','动作','特效','工具','工程'] as const;
export type Category = typeof CATEGORIES[number];
export type AssetKind = 'folder'|'archive'|'unitypackage'|'file'|'unity-project';
export type MatchStatus = 'pending'|'matched'|'review'|'not-found'|'failed'|'blocked';
export interface MatchEvidence {method:'filename-id'|'readme-link'|'name-search'|'child-package'|'manual'|'known-source'|'booth-download';signals:string[];ruleVersion:string;recordedAt:string}
export interface SearchEvidence {field:'name'|'item-id'|'author'|'category'|'avatar'|'tag'|'notes'|'description'|'member';text:string}
export interface FileIdentity {device:string;inode:string;birthtime:string}
export interface CategoryEvidence {rawCategory:string;sourceUrl:string;itemId:string;ruleVersion:string}
export interface ProductCandidate { url:string; title:string; titleAliases?:string[];author?:string; authorAliases?:string[]; category?:Category;categoryEvidence?:CategoryEvidence;coverUrl?:string; coverFile?:string; reason?:string }
export interface OnlineInfo {
  title?:string; titleAliases?:string[];author?:string;authorAliases?:string[]; url?:string; category?:Category;categoryEvidence?:CategoryEvidence; tags?:string[]; avatars?:string[];
  coverUrl?:string; coverFile?:string; description?:string; fetchedAt?:string;
  status:MatchStatus; message?:string; candidates?:ProductCandidate[];
  rematchRequested?:boolean;confirmedSource?:boolean;rejectedUrls?:string[];matchEvidence?:MatchEvidence;metadataSourceUrl?:string;
  classificationCheckedVersion?:string;
  classificationPending?:boolean;
  matchingCheckedVersion?:string;
}
export interface ManualInfo { hidden?:boolean; title?:string; category?:Category; tags?:string[]; avatars?:string[]; favorite?:boolean; notes?:string; coverFile?:string; projectStatus?:'制作中'|'已完成'; relatedIds?:string[];sourceUrl?:string;matchingMode?:'auto'|'manual' }
export interface LocalMember {id:string;path:string;name:string;kind:AssetKind;missing:boolean;manual?:ManualInfo;version?:string;mtimeMs?:number}
export interface AvatarEvidence {avatar:string;files:string[];basis:'filename'|'archive-entry'|'manual'}
export interface AssetRecord {
  recycledAt?:string;id:string; path:string; name:string; group:string; kind:AssetKind; size:number; mtimeMs:number; missing:boolean;
  localCategory:Category; localAvatars:string[]; hintUrls:string[]; previewFile?:string;
  manual:ManualInfo; online:OnlineInfo; createdAt:string; updatedAt:string;
  members?:LocalMember[];localEvidence?:AvatarEvidence[];compatibilityComplete?:boolean;aggregationKey?:string;localNameHints?:string[];
  fileIdentity?:FileIdentity;searchEvidence?:SearchEvidence[];storage?:StorageLocation;
  wrapper?:{contentRoot:string;chain:string[]};
}
export interface AssetQuery { view?:'materials'|'projects'|'all'|'manual'; search?:string; category?:string; group?:string; avatar?:string; favorite?:boolean; status?:string; sort?:'name'|'recent'|'size'|'relevance'|'added'|'added-asc'|'modified'|'modified-asc'; offset?:number; limit?:number;collectionId?:string;tag?:string;author?:string;hasCover?:boolean;untagged?:boolean;addedAfter?:string;addedBefore?:string }
export interface LibraryCollection {id:string;name:string;kind:'manual'|'smart';assetIds?:string[];query?:AssetQuery;createdAt:string;updatedAt:string}
export interface CollectionInput {id?:string;name:string;kind:'manual'|'smart';query?:AssetQuery}
export interface TagSummary {name:string;count:number;aliases:string[]}
export const REVIEW_SORTS=['modified','modified-asc','added','added-asc','name'] as const;
export type ReviewSort=typeof REVIEW_SORTS[number];
export const LANGUAGE_IDS=['zh-CN','ja','en'] as const;
export type AppLanguage=typeof LANGUAGE_IDS[number];
export const THEME_IDS=['nasa','swiss','x','x-light'] as const;
export type AppTheme=typeof THEME_IDS[number];
export const THEME_BACKGROUNDS:Readonly<Record<AppTheme,string>>={nasa:'#ece5d6',swiss:'#f5f1e8',x:'#000000','x-light':'#FFFFFF'};
export function normalizeTheme(value:unknown):AppTheme {return THEME_IDS.includes(value as AppTheme)?value as AppTheme:'nasa'}
export interface ViewPreferences {viewMode?:'grid'|'list';density?:'compact'|'standard'|'spacious';coverFit?:'contain'|'cover';reviewSort?:ReviewSort;reviewHeaderPinned?:boolean;reviewShowLocalImage?:boolean;theme?:AppTheme;language?:AppLanguage}
export interface AssetPage { items:AssetRecord[]; total:number }
export interface ProjectMaterialEvidence {path:string;name:string;alias:string;kind:'directory'|'prefab'|'model'}
export interface ProjectMaterialMatch {assetId:string;asset:AssetRecord;relation:'manual'|'detected'|'both'|'uncertain';evidence:ProjectMaterialEvidence[]}
export interface ProjectMaterialPage {projectId:string;items:ProjectMaterialMatch[];inspectedEntries:number;scannedAt:string;truncated:boolean;warnings:string[]}
export interface Stats { total:number; materials:number; projects:number; favorites:number; matched:number; review:number; missing:number; groups:string[]; avatars:string[]; categories:Record<string,number>;manual?:number;hidden?:number }
export interface ManualAddResult {added:number;updated:number;ids:string[];errors:string[];cancelled:boolean}
export interface ScanProgress {mode?:'scan'|'manual'; running:boolean; found:number; current:string; errors:string[]; finishedAt?:string }
export interface TransferProgress {id?:string;taskId?:string;url:string;phase:'connecting'|'downloading'|'cache'|'complete'|'waiting'|'error';kind:'search'|'page'|'cover';label:string;receivedBytes:number;totalBytes?:number;downloadBps:number;uploadBps:number;uploadBytes:number;elapsedMs:number}
export interface TransferSummary {id?:string;taskId?:string;url:string;kind:'search'|'page'|'cover';label:string;receivedBytes:number;fromCache:boolean;finishedAt:string;status:'complete'|'error';downloadBps?:number;durationMs?:number}
export interface SpeedSample {at:number;downloadBps:number;uploadBps:number}
export interface QueueProgress { running:boolean; paused:boolean; pending:number; completed:number; current:string; message?:string;transfer?:TransferProgress;recentTransfers?:TransferSummary[];activeTransfers?:TransferProgress[];speedHistory?:SpeedSample[];downloadedBytes?:number;peakDownloadBps?:number;totalDownloadBps?:number;totalUploadBps?:number;concurrency?:number;activeTasks?:number }
export interface ProxyStatus {mode:'direct'|'proxy'|'unknown';route:string;endpoint?:string;status:'unchecked'|'checking'|'available'|'error'|'disabled';message?:string;checkedAt?:string}
export interface SourceUndoInfo {token:string;assetId:string;title:string;sourceUrl:string;recordedAt:string}
export type BoothTab='login'|'favorites'|'gifts'|'library';
export interface BoothDownload {id:string;name:string;state:'downloading'|'completed'|'interrupted'|'cancelled'|'failed';receivedBytes:number;totalBytes:number;downloadBps:number;startedAt:string;finishedAt?:string;assetId?:string;sourceUrl?:string;error?:string}
export interface BoothState {downloadDir?:string;sessionSaved:boolean;downloads:BoothDownload[];active:boolean}
export interface AppSettings extends ViewPreferences { workbenchProjectId?:string; reviewHeaderPinned:boolean; reviewShowLocalImage:boolean; contextMenu?:ContextMenuPreferences; language:AppLanguage;unityEditorPath?:string;detachedRoots?:string[]; directSources?:string[]; roots:string[]; onlineEnabled:boolean; dataDir:string;backupDir?:string;uiZoom?:number;downloadConcurrency?:number;boothDownloadDir?:string;xThemeIntroduced:boolean;xianyuEnabled:boolean }
export interface UpdateState {status:'idle'|'checking'|'available'|'up-to-date'|'downloading'|'ready'|'installing'|'error'|'unsupported';currentVersion:string;latestVersion?:string;releaseUrl?:string;releaseNotes?:string;receivedBytes:number;totalBytes?:number;downloadBps?:number;message?:string;canInstall:boolean;checkedAt?:string}
export interface Snapshot { stats:Stats; scan:ScanProgress; queue:QueueProgress; settings:AppSettings;proxy?:ProxyStatus;undoAvailable?:boolean;sourceUndo?:SourceUndoInfo;warnings?:string[] }
export interface FileEntry { name:string; size:number; directory:boolean }
export interface FileListing { entries:FileEntry[]; truncated:boolean; message?:string }
export type LibraryEvent = {type:'change'}|{type:'scan';progress:ScanProgress}|{type:'queue';progress:QueueProgress};
export interface LibraryAPI {
  discoveryState():Promise<import('./discovery').DiscoveryState>;
  startDiscovery(request:import('./discovery').DiscoveryRequest):Promise<import('./discovery').DiscoveryState>;
  prepareWebDiscovery(provider:import('./discovery-prompt').DiscoveryWebProvider,request:import('./discovery').DiscoveryRequest):Promise<void>;
  openWebDiscovery(provider:import('./discovery-prompt').DiscoveryWebProvider,request:import('./discovery').DiscoveryRequest):Promise<import('./discovery').WebAiWorkspaceState>;
  webDiscoveryState():Promise<import('./discovery').WebAiWorkspaceState>;
  setWebDiscoveryBounds(token:string,bounds:import('./discovery').WebAiWorkspaceBounds|null):Promise<void>;
  fillWebDiscovery(token:string):Promise<import('./discovery').WebAiWorkspaceState>;
  collectWebDiscovery(token:string):Promise<import('./discovery').WebAiWorkspaceState>;
  copyWebDiscoveryPrompt(token:string):Promise<void>;
  applyWebDiscoveryReply(token:string):Promise<import('./discovery').DiscoveryState>;
  closeWebDiscovery():Promise<void>;
  clearWebDiscoverySession(provider:import('./discovery-prompt').DiscoveryWebProvider):Promise<void>;
  startWebDiscovery(request:import('./discovery').DiscoveryRequest,reply:string):Promise<import('./discovery').DiscoveryState>;
  cancelDiscovery():Promise<import('./discovery').DiscoveryState>;
  openDiscoveryProduct(url:string):Promise<void>;
  openDiscoverySearch(platform:import('./discovery').DiscoveryPlatform):Promise<void>;
  openModelPreview(id:string):Promise<void>;
  aiState():Promise<import('./ai-contracts').AiPublicState>;
  configureAI(value:import('./ai-contracts').AiSettingsUpdate):Promise<import('./ai-contracts').AiPublicState>;
  openAIHelp(provider:import('./ai-contracts').AiProviderId):Promise<void>;
  aiQueueState():Promise<import('./ai-contracts').AiClassificationQueueState>;
  retryAIClassification(id?:string):Promise<void>;
  aiClassification(id:string):Promise<import('./ai-contracts').AiClassificationRecord|null>;
  classifyAsset(id:string):Promise<import('./ai-contracts').AiRunResult<import('./ai-contracts').AiClassificationRecord>>;
  unityDiagnostics(projectId:string):Promise<import('./unity-diagnostics').UnityDiagnosticSnapshot>;
  diagnoseUnity(projectId:string):Promise<import('./ai-contracts').AiRunResult<import('./ai-contracts').AiDiagnosticRecord>>;
  pluginDownloadState():Promise<import('./public-plugins').PluginDownloadState>;
  openPluginLink(id:string,kind:import('./public-plugins').PluginLinkKind):Promise<void>;
  installPublicPlugin(id:string,projectId:string):Promise<ProjectImportJob>;
  cancelPluginDownload():Promise<void>;
  inboxState():Promise<import('./link-inbox').InboxState>;
  configureInbox(settings:import('./link-inbox').InboxSettings):Promise<void>;
  checkInbox():Promise<void>;openInboxAccount(platform:import('./link-inbox').InboxPlatform):Promise<void>;
  clearInbox():Promise<boolean>;clearInboxAccount(platform:import('./link-inbox').InboxPlatform):Promise<boolean>;
  markInbox(id:string,action:'read'|'dismiss'|'restore'):Promise<void>;
  readInboxLink(id:string,code?:string):Promise<void>;
  startupStarInvite():Promise<import('./star-invite').StarInvite|null>;
  dismissStarInvite(count:number):Promise<void>;openStarProject(count:number):Promise<void>;
  baiduState():Promise<BaiduState>;
  baiduDownloadsState():Promise<BaiduDownloadState>;
  openBaiduDownloadVerification():Promise<void>;
  readBaiduShare(text:string,code?:string):Promise<void>;
  openBaiduShareFolder(id:string):Promise<void>;
  backBaiduShare():Promise<void>;
  chooseBaiduDownloadDir():Promise<boolean>;
  downloadBaiduFile(id:string):Promise<void>;
  downloadBaiduFiles(ids:string[]):Promise<void>;
  cancelBaiduDownloadBatch():Promise<void>;
  retryBaiduDownloadImport(id:string):Promise<void>;
  setBaiduExtractionOptions(options:DownloadExtractionOptions):Promise<void>;
  extractBaiduDownloads(ids:string[],recycle:boolean):Promise<void>;
  retryBaiduExtractionImport(id:string):Promise<void>;
  revealBaiduExtraction(id:string):Promise<void>;
  controlBaiduDownload(id:string,action:'pause'|'resume'|'cancel'):Promise<void>;
  revealBaiduDownload(id:string):Promise<void>;
  openBaidu(directoryPath?:string):Promise<void>;
  captureBaiduDirectory():Promise<CloudPage>;
  scanBaiduDirectory(action:'start'|'pause'|'resume'|'stop'|'retry'):Promise<void>;
  cloudCatalog(query?:CloudQuery):Promise<CloudPage>;
  linkCloudEntry(key:string,assetId?:string|null):Promise<void>;
  forgetCloudDirectory(accountKey:string,directoryPath:string):Promise<void>;
  clearBaiduSession():Promise<void>;
  openCommunityLink(id:string):Promise<void>;copyCommunityGroup():Promise<void>;
  readonly initialTheme?:AppTheme;
  readonly initialLanguage?:AppLanguage;
  attemptXianyu(id:string):Promise<void>;openImageSearch(id:string):Promise<void>;setXianyuEnabled(enabled:boolean):Promise<boolean>;
  updateState():Promise<UpdateState>;checkForUpdates():Promise<UpdateState>;downloadUpdate():Promise<UpdateState>;installUpdate():Promise<boolean>;cancelUpdate():Promise<void>;openUpdatePage():Promise<void>;
  removeRoot(root:string):Promise<boolean>;
  removeRoots(roots:string[]):Promise<boolean>;
  snapshot():Promise<Snapshot>; list(query:AssetQuery):Promise<AssetPage>; get(id:string):Promise<AssetRecord|null>;
  setContextMenuPreferences(value:ContextMenuPreferences):Promise<AppSettings>;recycleAssets(ids:string[],scope?:'card'|'file'):Promise<AssetRecycleResult>;
  hiddenAssets(query?:AssetQuery):Promise<AssetPage>;setHidden(ids:string[],hidden:boolean):Promise<void>;forceRematch(ids:string[]):Promise<void>;
  scan():Promise<void>; cancelScan():Promise<void>;
  chooseMaterials():Promise<ManualAddResult|null>;addDroppedMaterials(files:File[]):Promise<ManualAddResult>;
  annotate(ids:string[],patch:ManualInfo):Promise<void>;
  reveal(id:string,memberPath?:string):Promise<void>; copyPath(id:string,memberPath?:string):Promise<void>; openSource(id:string):Promise<void>;
  files(id:string):Promise<FileListing>; setCover(id:string):Promise<boolean>;
  enrich(ids?:string[],retry?:boolean):Promise<void>; pauseEnrichment():Promise<void>; resumeEnrichment():Promise<void>;
  linkSource(id:string,url:string):Promise<void>; acceptCandidate(id:string,url:string):Promise<void>;
  undoSource(token:string):Promise<boolean>;searchBooth(id:string,query:string):Promise<void>;
  boothState():Promise<BoothState>;openBooth(tab:BoothTab):Promise<void>;
  chooseBoothDownloadDir():Promise<boolean>;revealBoothDownload(id:string):Promise<void>;cancelBoothDownload(id:string):Promise<void>;retryBoothImport(id:string):Promise<void>;clearBoothSession():Promise<void>;
  previewSource(id:string,url:string):Promise<void>;
  loadCandidateCovers(ids:string[]):Promise<void>;
  rejectCandidate(id:string,url:string):Promise<void>;restoreRejectedCandidates(id:string):Promise<void>;
  skipMatching(id:string):Promise<void>;restoreMatching(id:string):Promise<void>;
  projectMaterials(id:string,refresh?:boolean):Promise<ProjectMaterialPage>;
  projectProducts(id:string,refresh?:boolean):Promise<ProjectProductPage>;
  registerProjectProduct(projectId:string,key:string):Promise<ProjectProductRegistration>;
  projectFiles(id:string,relativePath?:string,offset?:number):Promise<ProjectFilePage>;
  projectFileAction(id:string,relativePath:string,action:'reveal'|'copy'):Promise<void>;
  importSources(assetId:string):Promise<ImportSourceChoice[]>;
  previewProjectImport(assetId:string,projectId:string,choiceId:string,options?:ProjectImportOptions):Promise<ProjectImportPreview>;
  executeProjectImport(token:string):Promise<ProjectImportJob>;
  projectImportLocation(jobId:string,relative:string,action:'reveal'|'copy'):Promise<void>;
  retryProjectMA(jobId:string):Promise<void>;
  updateProjectMAHelper(projectId:string):Promise<void>;
  projectImportJobs(projectId?:string):Promise<ProjectImportJob[]>;
  projectReadiness(projectId:string):Promise<ProjectReadiness>;
  reviewProjectImport(jobId:string,patch:ImportReviewPatch):Promise<void>;
  selectWorkbenchProject(projectId:string):Promise<void>;
  findProjectImportLocations(jobId:string):Promise<void>;
  cancelProjectImport(id:string):Promise<boolean>;openProjectEditor(id:string):Promise<void>;
  chooseProject():Promise<AssetRecord|null>;addDroppedProject(files:File[]):Promise<AssetRecord|null>;chooseUnityEditor(projectId:string):Promise<boolean>;
  listCollections():Promise<LibraryCollection[]>;saveCollection(input:CollectionInput):Promise<LibraryCollection>;
  updateCollectionMembers(collectionId:string,ids:string[],mode:'add'|'remove'):Promise<void>;deleteCollection(id:string):Promise<void>;
  listTags():Promise<TagSummary[]>;mergeTags(names:string[],target:string):Promise<void>;setTagAliases(name:string,aliases:string[]):Promise<void>;
  updateTags(ids:string[],add:string[],remove:string[]):Promise<void>;
  setViewPreferences(preferences:ViewPreferences):Promise<AppSettings>;undoMetadata():Promise<boolean>;
  backup():Promise<string|null>; restore():Promise<boolean>; chooseRoot():Promise<boolean>; setOnlineEnabled(enabled:boolean):Promise<void>;
  chooseBackupDir():Promise<boolean>;chooseDataDir():Promise<boolean>;openNetworkUrl(url:string):Promise<void>;
  setZoom(factor:number):Promise<number>;checkProxy():Promise<ProxyStatus>;
  setConcurrency(value:number):Promise<number>;
  onEvent(listener:(event:LibraryEvent)=>void):()=>void;
}
export function displayTitle(a:AssetRecord):string {return a.manual.title || a.online.title || a.name}
export function displayCategory(a:AssetRecord):Category {return a.manual.category ?? (a.online.category&&a.online.category!=='未分类'?a.online.category:a.localCategory)}
export function displayTags(a:AssetRecord):string[] {return a.manual.tags ?? a.online.tags ?? []}
export function displayAvatars(a:AssetRecord):string[] {return a.manual.avatars ?? a.online.avatars ?? a.localAvatars}
export function coverUrl(a:AssetRecord):string|undefined {const file=a.manual.coverFile || a.online.coverFile || a.previewFile; return file ? `library-cover://cache/${encodeURIComponent(file)}`:undefined}
