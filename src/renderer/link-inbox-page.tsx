import {PrivacyNotice} from './privacy-notice';
import {t,useLanguage} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import type {LibraryAPI} from '../shared/contracts';
import {recency,type InboxItem,type InboxSettings,type InboxState} from '../shared/link-inbox';
import {BaiduDownloadPanel} from './baidu-download-panel';
import './link-inbox-page.css';

const date=(value?:number,approximate=false)=>value?(approximate?t('约')+' ':'')+new Date(value).toLocaleString():'时间待核对';
export function InboxBadge({api,revision}:{api:LibraryAPI;revision:number}){
 useLanguage();const [count,setCount]=useState(0);
 useEffect(()=>{let active=true;const refresh=()=>api.inboxState().then(s=>{if(active)setCount(s.unread)}).catch(()=>{});void refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer)}},[api,revision]);
 return count>0?<span className="inbox-new" aria-label={`${count} 条新链接`}><i aria-hidden="true"/>{count}</span>:null;
}
export function LinkInboxPage({api,enabled,revision}:{api:LibraryAPI;enabled:boolean;revision:number}){
 useLanguage();const [state,setState]=useState<InboxState>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState<'pending'|'unknown'|'downloads'|'dismissed'>('pending');
 const [selected,setSelected]=useState<InboxItem>(),[code,setCode]=useState('');const downloads=useRef<HTMLDivElement>(null);
 const update=async()=>setState(await api.inboxState());
 useEffect(()=>{let active=true;const refresh=async()=>{try{const s=await api.inboxState();if(active)setState(s)}catch(e){if(active)setError(String(e))}};void refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer)}},[api,revision]);
 const act=async(fn:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{await fn();await update()}catch(e){setError((e instanceof Error?e.message:String(e)).replace(/^Error invoking remote method '[^']+': Error: /,''))}finally{setBusy(false)}};
 const configure=(patch:Partial<InboxSettings>)=>{if(state)void act(()=>api.configureInbox({...state.settings,...patch}))};
 const readLink=(row:InboxItem,confirmedCode:string)=>act(async()=>{await api.readInboxLink(row.id,confirmedCode);setSelected(undefined);downloads.current?.scrollIntoView({behavior:'smooth',block:'start'})});
 const selectLink=(row:InboxItem)=>{if(busy)return;setSelected(row);setCode(row.code);if(!row.codeConflict)void readLink(row,row.code)};
 const unknownCount=(state?.items||[]).filter(row=>!row.dismissed&&(row.codeConflict||recency(row.sourceAt,Date.now(),state!.settings.hours)==='unknown')).length;
 const rows=(state?.items||[]).filter(row=>filter==='dismissed'?row.dismissed:!row.dismissed&&(filter==='downloads'?row.taskIds.length>0:filter==='unknown'?recency(row.sourceAt,Date.now(),state!.settings.hours)==='unknown'||row.codeConflict:!row.completed&&!row.codeConflict&&recency(row.sourceAt,Date.now(),state!.settings.hours)==='recent'));
 return <section className="link-inbox-page" aria-label={t("待下载链接")}>
  <div className="inbox-intro"><h2>{t("近期交付链接")}</h2>
   <p className="help-text" role="note">{t('闲鱼消息和完整后台发现仍待验证。')}</p>
   <div className="inbox-controls"><label><input type="checkbox" checked={state?.settings.enabled??false} disabled={busy||!state||!!state.error} onChange={e=>configure({enabled:e.target.checked})}/>{t("识别交付链接")}</label><label><input type="checkbox" checked={state?.settings.background??false} disabled={busy||!state?.settings.enabled} onChange={e=>configure({background:e.target.checked})}/>{t("后台检查（每 3 分钟）")}</label><label>{t("仅查看最近")}<select aria-label={t("链接时间范围")} disabled={busy||!state} value={state?.settings.hours??24} onChange={e=>configure({hours:Number(e.target.value) as 6|12|24})}><option value={6}>{t("6 小时")}</option><option value={12}>{t("12 小时")}</option><option value={24}>{t("24 小时")}</option></select></label><button className="button small" disabled={busy||!enabled||!state?.settings.enabled} onClick={()=>act(()=>api.checkInbox())}>{t("检查新链接")}</button></div>
  </div>
  {(error||state?.error)&&<p className="inbox-error" role="alert">{error||state?.error}</p>}
  <div className="inbox-accounts">{(['xianyu','booth'] as const).map(platform=>{const status=state?.statuses.find(s=>s.platform===platform);return <article key={platform}><div><strong>{platform==='booth'?'BOOTH 已购':'闲鱼交付消息'}</strong><p role="status">{status?.message||'尚未检查账号页面。'}</p>{status?.checkedAt&&<small>{t("上次检查：")}{date(status.checkedAt)}</small>}</div><button className="button small" disabled={busy||!enabled} onClick={()=>act(()=>api.openInboxAccount(platform))}>{t("登录／查看账号")}</button><button className="button small" disabled={busy} onClick={()=>act(()=>api.clearInboxAccount(platform))}>{t('清除登录状态')}</button></article>})}</div>
  <div className="inbox-filters" role="group" aria-label={t("链接状态")}>{([['pending','待下载'],['unknown','时间／提取码待核对'],['downloads','已有下载'],['dismissed','已忽略']] as const).map(([value,label])=><button key={value} className={`button small ${filter===value?'primary':''}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}{value==='unknown'&&unknownCount>0?'（'+unknownCount+'）':''}</button>)}</div>
  <div className="inbox-items">{!rows.length?<p className="inbox-empty">{t("此列表暂无链接。")}{filter==='pending'?(unknownCount>0?<button className="button small" onClick={()=>setFilter('unknown')}>查看待核对链接</button>:state&&!state.settings.enabled?<span>{t('请登录平台账号并开启交付链接识别。')}</span>:null):''}</p>:rows.map(row=><article key={row.id} className="inbox-item"><div className="inbox-item-head"><span className="inbox-source">{row.platform==='booth'?'BOOTH':'闲鱼'}</span>{!row.read&&recency(row.sourceAt,Date.now(),state!.settings.hours)==='recent'&&!row.codeConflict&&!row.dismissed&&<span className="inbox-new"><i aria-hidden="true"/>{t("新链接")}</span>}<small>{date(row.sourceAt,row.sourceTimeApproximate)}</small></div><h3>{row.title}</h3><p className="inbox-url">{row.url}</p><small>{t("发现于")}{date(row.discoveredAt)}{row.code?' · 已读取提取码':''}{row.completed?' · 已有文件下载完成':''}</small>{row.codeConflict&&<p>{t("发现不同的提取码，请查看原消息后手动填写。")}</p>}<div className="inbox-actions"><button className="button primary small" disabled={busy||!enabled} onClick={()=>selectLink(row)}>{row.kind==='booth'?'查看已购下载':'选择文件下载'}</button>{!row.read&&<button className="button small" disabled={busy} onClick={()=>act(()=>api.markInbox(row.id,'read'))}>{t("标记已读")}</button>}<button className="button small" disabled={busy} onClick={()=>act(()=>api.markInbox(row.id,row.dismissed?'restore':'dismiss'))}>{row.dismissed?'恢复显示':'忽略此链接'}</button></div></article>)}</div>
  {selected&&<section className="inbox-selection" aria-label={t("所选交付链接")}><strong>{t("当前选择：")}{selected.title}</strong><p className="inbox-url">{selected.url}</p>{selected.kind==='baidu'&&<label>{t("提取码（可核对修改）")}<input maxLength={4} value={code} onChange={e=>setCode(e.target.value)} autoComplete="off"/></label>}<div className="inbox-actions"><button className="button primary" disabled={busy||!enabled||selected.codeConflict&&!/^[A-Za-z0-9]{4}$/.test(code)} onClick={()=>readLink(selected,code)}>{selected.kind==='baidu'?'读取分享文件':'打开官方已购条目'}</button><button className="button" disabled={busy} onClick={()=>setSelected(undefined)}>{t("取消选择")}</button></div>{selected.kind==='baidu'&&<p className="help-text">{t("百度下载需先在下方登录。")}</p>}</section>}
  <div ref={downloads}><BaiduDownloadPanel api={api} enabled={enabled}/></div>
  <div className="inbox-actions"><button className="button small" disabled={busy||!state||!!state.error} onClick={()=>act(async()=>{if(await api.clearInbox()){setSelected(undefined);setCode('')}})}>{t('清除链接记录并关闭识别')}</button></div>
  <PrivacyNotice/>
 </section>;
}
