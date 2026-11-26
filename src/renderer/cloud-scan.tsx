import React from 'react';
import type {BaiduScanState} from '../shared/cloud-contracts';
import {t,useLanguage} from './i18n';
export function CloudScanProgress({task,onAction,disabled}:{task?:BaiduScanState;onAction:(action:'pause'|'resume'|'stop'|'retry')=>void;disabled:boolean}){
 useLanguage();if(!task||task.phase==='idle')return null;
 const labels={running:'正在逐层读取子文件夹',paused:'目录读取已暂停',stopped:'目录读取已停止',completed:'本轮目录读取结束'} as const;
 return <section className="cloud-scan-progress" aria-label={t('目录读取进度')}>
  <h4>{t(labels[task.phase])}</h4><p className="selectable">{t('读取范围：{path}',{path:task.rootPath})}</p>
  {task.currentPath&&task.currentPath!==task.rootPath&&<p className="selectable">{t('当前目录：{path}',{path:task.currentPath})}</p>}
  <p role="status">{t('已读取 {done} 个目录 · {files} 个文件 · 待处理 {pending} 个目录',{done:task.directoriesRead,files:task.filesRead,pending:task.directoriesPending})}</p>
  {task.phase==='running'&&<><progress aria-label={t('正在逐层读取子文件夹')}/><p>{t('网页会自动切换目录；请先暂停，再手动浏览。')}</p></>}
  {task.error&&<p className="help-text">{t('读取已中断，请检查登录、网络或页面位置后继续；已有记录保留。')}</p>}
  {!!task.failedDirectories&&<details><summary>{t('有 {count} 个目录待重试',{count:task.failedDirectories})}</summary>{task.failures.map(f=><p className="selectable" key={f.path}>{f.path}</p>)}</details>}
  <div className="cloud-actions">
   {task.phase==='running'&&<button className="button small" disabled={disabled} onClick={()=>onAction('pause')}>{t('暂停读取')}</button>}
   {(task.phase==='paused'||task.phase==='stopped')&&!!task.directoriesPending&&<button className="button small" disabled={disabled} onClick={()=>onAction('resume')}>{t('继续读取')}</button>}
   {(task.phase==='running'||task.phase==='paused')&&<button className="button small" disabled={disabled} onClick={()=>onAction('stop')}>{t('停止读取')}</button>}
   {!!task.failedDirectories&&task.phase!=='running'&&<button className="button small" disabled={disabled} onClick={()=>onAction('retry')}>{t('重试失败目录')}</button>}
  </div>
 </section>;
}
