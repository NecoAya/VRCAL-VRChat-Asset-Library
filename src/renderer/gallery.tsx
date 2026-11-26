import {StorageBadge} from './storage-badge';
import { t, useLanguage } from './i18n';
import React from 'react';
import {displayCategory,displayTags,displayTitle,type AssetRecord,type ViewPreferences} from '../shared/contracts';
function Symbol({kind}:{kind:'heart'|'check'|'more'}){
  useLanguage();return <svg className="icon" width={kind==='check'?13:17} height={kind==='check'?13:17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='heart'?<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>:kind==='check'?<path d="m5 12 4 4L19 6"/>:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}</svg>}
const kindLabel=(kind:AssetRecord['kind'])=>({folder:t("素材文件夹"),archive:t("压缩包"),unitypackage:t("Unity 素材包"),file:t("文件"),'unity-project':t("Unity 工程")}[kind]);
function sizeLabel(bytes:number){return bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:bytes<1073741824?`${(bytes/1048576).toFixed(1)} MB`:`${(bytes/1073741824).toFixed(2)} GB`}
interface Props {assets:AssetRecord[];selected:Set<string>;focusId:string;detailId?:string;preferences:ViewPreferences;loading:boolean;cover:(asset:AssetRecord)=>React.ReactNode;onFocus:(id:string)=>void;onClick:(event:React.MouseEvent,asset:AssetRecord)=>void;onKey:(event:React.KeyboardEvent,asset:AssetRecord)=>void;onContext:(event:React.MouseEvent,asset:AssetRecord)=>void;onHover:(event:React.MouseEvent<HTMLElement>,asset:AssetRecord)=>void;onLeave:()=>void;onCheck:(id:string)=>void;onFavorite:(asset:AssetRecord)=>void;onMore:(event:React.MouseEvent<HTMLButtonElement>,asset:AssetRecord)=>void}
export function AssetGallery({assets,selected,focusId,detailId,preferences,loading,cover,onFocus,onClick,onKey,onContext,onHover,onLeave,onCheck,onFavorite,onMore}:Props) {
  useLanguage();
  return <div className={`asset-grid view-${preferences.viewMode??'grid'} density-${preferences.density??'standard'} cover-fit-${preferences.coverFit??'contain'}`} role="group" aria-label={preferences.viewMode==='list'?t("素材列表"):t("素材网格")} aria-busy={loading}>
    {assets.map((asset,index)=>{
      const title=displayTitle(asset);
      const avatars=[...new Set([...asset.localAvatars,...(asset.manual.avatars??[])])];
      const tags=displayTags(asset);
      const status=asset.online.status;
      const reviewBadge=!asset.missing&&status==='review';
      const matchLabel=asset.manual.matchingMode==='manual'?t("手动归类")
        :asset.online.matchEvidence?.method==='booth-download'?t("BOOTH 下载关联")
        :asset.online.confirmedSource?t("人工确认")
        :asset.manual.sourceUrl?t("人工提供")
        :status==='matched'?t("已匹配")
        :status==='review'?(reviewBadge?null:t("待确认"))
        :status==='not-found'?t("未找到")
        :status==='failed'||status==='blocked'?t("需重试"):t("待补全");
      return <article key={asset.id} data-asset-id={asset.id} tabIndex={focusId===asset.id||!focusId&&index===0?0:-1} className={`asset-card ${detailId===asset.id?'focused':''} ${focusId===asset.id?'keyboard-focused':''} ${selected.has(asset.id)?'selected':''} ${asset.missing?'missing':''}`} aria-label={title} onFocus={event=>{if(event.target===event.currentTarget)onFocus(asset.id)}} onMouseEnter={e=>onHover(e,asset)} onMouseLeave={onLeave} onContextMenu={e=>onContext(e,asset)} onClick={e=>{if(!loading)onClick(e,asset)}} onKeyDown={e=>{if(!loading)onKey(e,asset)}}>
        <div className="card-cover">
          {cover(asset)}<span className="card-category">{t(displayCategory(asset))}</span>
          <label className="card-select" onClick={e=>e.stopPropagation()}><input aria-label={t("选择 {v0}", {v0:title})} type="checkbox" disabled={loading} checked={selected.has(asset.id)} onChange={()=>onCheck(asset.id)}/><span><Symbol kind="check"/></span></label>
          <button className={`card-favorite ${asset.manual.favorite?'is-favorite':''}`} title={asset.manual.favorite?t("取消收藏"):t("收藏")} onClick={e=>{e.stopPropagation();onFavorite(asset)}}><Symbol kind="heart"/></button>
          {asset.missing?<span className="card-badge danger">{t("文件缺失")}</span>:reviewBadge?<span className="card-badge">{t("待确认")}</span>:asset.kind==='unity-project'&&asset.manual.projectStatus?<span className="card-badge project-badge">{t(asset.manual.projectStatus)}</span>:null}
        </div>
        <div className="card-body">
          <h3 title={title}>{title}</h3>
          <StorageBadge storage={asset.storage}/><div className="card-author">{asset.online.author||asset.group||t("本地素材")}</div>
          {tags.length>0&&<div className="card-tags" title={tags.join(' · ')}>{tags.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div>}
          {avatars.length>0&&<div className="card-avatars" title={avatars.join('、')}>{avatars.join(' · ')}</div>}
          {asset.searchEvidence?.length?<div className="card-search-evidence" title={asset.searchEvidence.map(e=>`${e.field}: ${e.text}`).join('\n')}>{t("命中：")}{asset.searchEvidence[0].text}</div>:null}
          <div className="card-footer">
            <span>{(asset.members?.length??0)>1?t("{v0} 份本地文件", {v0:asset.members!.length}):asset.kind==='folder'||asset.kind==='unity-project'?kindLabel(asset.kind):sizeLabel(asset.size)}</span>
            {matchLabel&&<span className={`card-status card-status-${status}`}>{matchLabel}</span>}
            <button title={t("更多操作")} onClick={e=>{e.stopPropagation();onMore(e,asset)}}><Symbol kind="more"/></button>
          </div>
        </div>
      </article>;
    })}
  </div>;
}
