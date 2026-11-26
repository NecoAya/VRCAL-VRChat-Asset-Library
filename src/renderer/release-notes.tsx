import React, {useEffect, useRef, useState} from 'react';
import type {LibraryAPI} from '../shared/contracts';
import {filterReleaseNotes, type ReleaseChannel} from '../shared/release-notes';
import {localeName, t, useLanguage} from './i18n';

const sectionLabels = {added:'新增功能',improved:'功能改进',fixed:'问题修复',notes:'使用提示'} as const;
const channelLabels = {all:'全部版本',stable:'正式版',preview:'公开预览版',local:'本地试验版'} as const;
function displayDate(value:string) {
  // Noon in local time avoids shifting a date-only release to the previous day.
  return new Intl.DateTimeFormat(localeName(),{year:'numeric',month:'long',day:'numeric'}).format(new Date(value+'T12:00:00'));
}

export function ReleaseNotesPage({api}:{api:Pick<LibraryAPI,'updateState'>}) {
  const [currentVersion,setCurrentVersion]=useState<string>();
  const heading=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let active=true;
    // Read the existing local snapshot only. Opening this page never checks or
    // downloads an update and does not depend on a successful network request.
    api.updateState().then(state=>{if(active)setCurrentVersion(state.currentVersion)}).catch(()=>{if(active)setCurrentVersion('')});
    heading.current?.focus();
    return()=>{active=false};
  },[api]);
  return <div ref={heading} tabIndex={-1} className="release-page-focus"><ReleaseNotesContent currentVersion={currentVersion}/></div>;
}

export function ReleaseNotesContent({currentVersion}:{currentVersion?:string}) {
  const language=useLanguage();
  const [search,setSearch]=useState('');
  const [channel,setChannel]=useState<ReleaseChannel|'all'>('all');
  const entries=filterReleaseNotes({search,channel,language});
  return <section className="release-page" aria-label={t('更新记录')}>
    <div className="release-content">
      <header className="release-intro">
        <h2>{t('版本时间线')}</h2>
        <div className="release-running"><span>{t('当前运行')}</span><strong>{currentVersion===undefined?'…':currentVersion||t('版本暂不可用')}</strong></div>
      </header>
      <div className="release-controls">
        <input className="release-search" type="search" aria-label={t('搜索更新记录')} placeholder={t('搜索版本号或功能关键词…')} value={search} onChange={event=>setSearch(event.target.value)}/>
        <div className="release-channels" role="group" aria-label={t('发布类型')}>
          {(['all','stable','preview','local'] as const).map(value=><button key={value} data-release-channel={value} aria-pressed={channel===value} onClick={()=>setChannel(value)}>{t(channelLabels[value])}</button>)}
        </div>
      </div>
      <p className="release-count" role="status">{t('共 {count} 个版本',{count:entries.length})}</p>
      {entries.length ? <div className="release-timeline">{entries.map(entry=><article className="release-card" key={entry.version} data-release-version={entry.version} data-running={entry.version===currentVersion?'true':undefined}>
        <header className="release-card-header">
          <div className="release-version"><strong>v{entry.version}</strong><span className={`release-channel channel-${entry.channel}`} title={entry.channel==='local'?t('本地试验版，尚未发布到 GitHub。'):undefined}>{t(channelLabels[entry.channel])}</span>{entry.version===currentVersion&&<span className="release-current">{t('当前运行')}</span>}</div>
          <time dateTime={entry.date}>{displayDate(entry.date)}</time>
        </header>
        <h3>{t(entry.title)}</h3>
        <div className="release-sections">{entry.sections.map(section=><section className={`release-section kind-${section.kind}`} key={section.kind}>
          <h4>{t(sectionLabels[section.kind])}</h4><ul>{section.items.map(item=><li key={item}>{t(item)}</li>)}</ul>
        </section>)}</div>
      </article>)}</div> : <div className="release-empty"><h3>{t('没有符合条件的更新记录')}</h3><button className="button" onClick={()=>{setSearch('');setChannel('all')}}>{t('清除更新筛选')}</button></div>}
    </div>
  </section>;
}
