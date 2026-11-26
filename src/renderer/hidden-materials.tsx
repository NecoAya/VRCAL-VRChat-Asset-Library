import React,{useEffect,useRef,useState} from 'react';
import type {AssetRecord,LibraryAPI} from '../shared/contracts';
import {displayTitle} from '../shared/contracts';
import {t,useLanguage} from './i18n';
import './hidden-materials.css';

type Runner=(action:()=>Promise<unknown>,message?:string)=>Promise<boolean>;
export function HiddenMaterials({onRecycle,api,run,revision,disabled=false}:{onRecycle:(ids:string[])=>Promise<void>;api:LibraryAPI;run:Runner;revision:number;disabled?:boolean}){
 useLanguage();
 const page=useRef<HTMLElement>(null);
 const [search,setSearch]=useState(''),[limit,setLimit]=useState(50),[items,setItems]=useState<AssetRecord[]>([]),[total,setTotal]=useState(0),[selected,setSelected]=useState(new Set<string>()),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{page.current?.focus()},[]);
 useEffect(()=>{let active=true;setLoading(true);api.hiddenAssets({search,limit}).then(result=>{if(!active)return;setItems(result.items);setTotal(result.total);setError('');setSelected(previous=>new Set([...previous].filter(id=>result.items.some(item=>item.id===id))))}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[api,revision,search,limit,retry]);
 const locked=disabled||busy||loading||!!error;
 const restore=async(ids:string[])=>{if(locked||!ids.length)return;setBusy(true);try{await run(()=>api.setHidden(ids,false),t('素材已恢复显示'))}finally{setBusy(false)}};
 const recycle=async(ids:string[])=>{if(locked||!ids.length)return;setBusy(true);try{await onRecycle(ids)}finally{setBusy(false)}};
 return <section ref={page} tabIndex={-1} className="hidden-page hidden-materials" aria-label={t('已隐藏素材')}>
  <div className="hidden-page-content">
   <div className="hidden-controls"><input className="hidden-search" type="search" value={search} maxLength={500} aria-label={t('搜索已隐藏素材')} placeholder={t('搜索名称或路径')} onChange={event=>{setLoading(true);setSearch(event.target.value);setLimit(50)}}/>
   <p className="hidden-count" role="status">{loading?t('正在读取…'):t('共 {v0} 个条目',{v0:total.toLocaleString()})}</p>
   {items.length>0&&<div className="hidden-bulk"><label><input type="checkbox" disabled={locked} checked={items.every(item=>selected.has(item.id))} onChange={event=>setSelected(event.target.checked?new Set(items.map(item=>item.id)):new Set())}/>{t('选择已显示条目')}</label><button className="button small" disabled={locked||!selected.size} onClick={()=>restore([...selected])}>{t('恢复所选')} ({selected.size})</button><button className="button small recycle-danger" disabled={locked||!selected.size} onClick={()=>recycle([...selected])}>{t('批量删除（移入回收站）')}</button></div>}</div>
   {error&&<div className="hidden-read-error" role="alert"><p className="error-text">{t(error)}</p><button className="button small" onClick={()=>setRetry(value=>value+1)}>{t('重新读取资料库')}</button></div>}
   <div className="hidden-list" aria-busy={loading}>{items.map(item=><article key={item.id} className="hidden-entry" data-hidden-id={item.id}><label><input type="checkbox" disabled={locked} checked={selected.has(item.id)} onChange={event=>setSelected(previous=>{const next=new Set(previous);event.target.checked?next.add(item.id):next.delete(item.id);return next})}/><strong>{displayTitle(item)}</strong></label><span className="hidden-path">{item.path}</span>{item.members&&item.members.length>1&&<details><summary>{t('本地文件 · {count} 份',{count:item.members.length})}</summary>{item.members.map(member=><p key={member.id}>{member.path}</p>)}</details>}<div className="hidden-entry-actions"><button className="text-button" disabled={locked} onClick={()=>run(()=>api.reveal(item.id))}>{t('打开所在文件夹')}</button><button className="button small" data-restore-hidden={item.id} disabled={locked} onClick={()=>restore([item.id])}>{t('恢复显示')}</button><button className="text-button recycle-danger" disabled={locked||item.kind==='unity-project'} onClick={()=>recycle([item.id])}>{t('删除（移入回收站）')}</button></div></article>)}</div>
   {!error&&!loading&&!items.length&&<div className="hidden-empty"><h2>{t(search?'没有找到相符的条目':'没有已隐藏的素材')}</h2>{search&&<button className="button" onClick={()=>{setLoading(true);setSearch('');setLimit(50)}}>{t('清空搜索')}</button>}</div>}
   {!error&&items.length<total&&(limit<5000?<button className="button hidden-load-more" disabled={locked} onClick={()=>setLimit(value=>Math.min(5000,value+50))}>{t('加载更多 · 已显示 {v0} / {v1}',{v0:items.length,v1:total})}</button>:<p className="hidden-count">{t('已显示前 5000 项，请按名称或路径缩小范围。')}</p>)}
  </div>
 </section>;
}
