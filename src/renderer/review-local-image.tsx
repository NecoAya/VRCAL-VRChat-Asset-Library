import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t,useLanguage} from './i18n';

const imageUrl=(file:string)=>`library-cover://cache/${encodeURIComponent(file)}`;

export function LocalReviewImagePreview({image,name,onClose}:{image:string;name:string;onClose:()=>void}){
 useLanguage();
 const dialog=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[image]);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose()}
   else if(event.key==='Tab'){
    const stops=[...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')??[])].filter(element=>element.getClientRects().length);
    if(!stops.length)return;
    event.preventDefault();event.stopPropagation();
    const index=stops.indexOf(document.activeElement as HTMLElement),next=index<0?(event.shiftKey?stops.length-1:0):(index+(event.shiftKey?-1:1)+stops.length)%stops.length;
    stops[next]?.focus();
   }
  };
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus({preventScroll:true})};
 },[onClose]);
 return <div className="review-local-image-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div ref={dialog} className="review-local-image-preview" role="dialog" aria-modal="true" aria-label={t('本地图片预览')}>
   <header className="review-local-image-preview-heading"><div><h2 title={name}>{name}</h2></div><button type="button" className="button small" aria-label={t('关闭本地图片预览')} onClick={onClose}>{t('关闭')}</button></header>
   <div className="review-local-image-preview-body" tabIndex={0} role="region" aria-label={t('本地图片')}>
    {failed?<p role="status">{t('本地图片暂不可用')}</p>:<img src={imageUrl(image)} alt={name} onError={()=>setFailed(true)}/>}
   </div>
  </div>
 </div>;
}

export function LocalReviewImageCard({image,name}:{image:string;name:string}){
 useLanguage();
 const [open,setOpen]=useState(false),[failed,setFailed]=useState(false);
 const close=useCallback(()=>setOpen(false),[]);
 useEffect(()=>{setFailed(false);setOpen(false)},[image]);
 return <article className="review-local-image-card" data-review-local-image>
  <button type="button" className="review-local-image-cover" data-review-action="local-image" aria-label={t('查看本地图片')} aria-haspopup="dialog" disabled={failed} onClick={()=>setOpen(true)}>
   {failed?<span className="review-local-image-unavailable">{t('本地图片暂不可用')}</span>:<img src={imageUrl(image)} alt={name} loading="lazy" onError={()=>setFailed(true)}/>}
   <span className="review-local-image-badge">{t('本地')}</span>
  </button>
  <div className="review-local-image-info"><h4 title={name}>{name}</h4><p>{t('仅供对照，不会确认商品来源')}</p></div>
  {open&&createPortal(<LocalReviewImagePreview image={image} name={name} onClose={close}/>,document.body)}
 </article>;
}
