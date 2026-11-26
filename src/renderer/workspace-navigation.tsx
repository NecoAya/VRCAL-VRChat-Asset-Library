import React,{useEffect,useRef,type ReactNode} from 'react';
import {NAV_GROUPS,type NavigationId,type NavigationItem,navigationContext} from '../shared/navigation';
import {t} from './i18n';

export function TaskNavigation({context,onSelect,counts,icon,inbox,collections}:{context:ReturnType<typeof navigationContext>;onSelect:(id:NavigationId)=>void;counts:Partial<Record<NavigationId,number>>;icon:(name:NavigationItem['icon'])=>ReactNode;inbox:ReactNode;collections:ReactNode}) {
 return <div className="task-navigation">{NAV_GROUPS.map(group=><section key={group.id} className={`navigation-group ${context.group===group.id?'current-group':''}`} data-navigation-group={group.id}>
  <nav aria-label={t(group.label)}>{group.items.map(item=><button key={item.id} data-nav={item.id} className={`nav-item ${item.className??''} ${context.id===item.id?'active':''}`} aria-current={context.id===item.id?'page':undefined} onClick={()=>onSelect(item.id)}>{icon(item.icon)}<span>{t(item.label)}</span>{item.id==='inbox'?inbox:(counts[item.id]??0)>0?<small>{counts[item.id]}</small>:null}</button>)}</nav>
  {group.id==='organize'&&context.group==='organize'&&collections}
 </section>)}</div>;
}

export function NavigationShell({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;
  ref.current?.querySelector<HTMLButtonElement>('.navigation-close')?.focus();
  const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current()}else if(e.key==='Tab'){
   const targets=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary,select,input,[tabindex="0"]')??[])].filter(n=>n.getClientRects().length);
   const first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }};
  const resize=()=>{if(window.matchMedia('(min-width: 701px)').matches)close.current()};
  document.addEventListener('keydown',handler);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('keydown',handler);window.removeEventListener('resize',resize);if(previous?.isConnected)previous.focus({preventScroll:true})};
 },[open]);
 return <>{open&&<button className="navigation-backdrop" tabIndex={-1} aria-label="关闭功能导航" onClick={onClose}/>}<aside id="workspace-navigation" ref={ref} className={`sidebar task-sidebar ${open?'navigation-open':''}`} role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label="功能导航"><button className="navigation-close button small" onClick={onClose}>关闭导航</button>{children}</aside></>;
}

export function AppearanceMenu({children,contextKey}:{children:ReactNode;contextKey:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{ref.current?.hidePopover()},[contextKey]);
 return <><button className="button small appearance-toggle" popoverTarget="workspace-appearance" aria-label="主题与语言">外观</button><div ref={ref} id="workspace-appearance" popover="auto" className="appearance-popover" aria-label="主题与语言"><div className="appearance-heading"><button className="icon-button" popoverTarget="workspace-appearance" popoverTargetAction="hide" aria-label="关闭外观设置">×</button></div>{children}</div></>;
}
