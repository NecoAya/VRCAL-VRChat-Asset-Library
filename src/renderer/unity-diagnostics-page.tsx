import {t} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import {unityDiagnosticAnalysisKey,type UnityDiagnosticAdvice,type UnityDiagnosticIssue,type UnityDiagnosticSnapshot,type UnityDiagnosticsAPI} from '../shared/unity-diagnostics';
import {UnityDiagnosisSession} from './unity-diagnosis-session';
import './unity-diagnostics-page.css';

export interface UnityDiagnosticsPageProps {
 api:UnityDiagnosticsAPI;projects:{id:string;name:string}[];initialProjectId?:string;
 onOpenSettings:()=>void;onDiagnose?:(snapshot:UnityDiagnosticSnapshot)=>Promise<UnityDiagnosticAdvice>;
 autoDiagnose?:boolean;aiConfigured?:boolean;aiUnavailableReason?:string;
}
// Reopening the page restores advice; transient control failures have a bounded retry schedule.
const diagnosisSession=new UnityDiagnosisSession();
const time=(at:number)=>new Date(at).toLocaleString();
const message=(error:unknown)=>(error instanceof Error?error.message:String(error)).replace(/^Error invoking remote method '[^']+': Error: /,'');
function Issue({issue,first}:{issue:UnityDiagnosticIssue;first:boolean}){
 return <article className={`unity-diagnostic-issue ${issue.severity}`}>
  <div className="unity-diagnostic-row"><span className="unity-diagnostic-kind">{issue.severity==='warning'?'警告':issue.kind==='compile'?'编译错误':issue.kind==='exception'?'异常':'错误'}</span>{first&&<span className="unity-diagnostic-priority">{t("优先核对 · 最早观察到的错误")}</span>}{issue.count>1&&<span className="unity-diagnostic-count">{`合并 ${issue.count} 次`}</span>}</div>
  <h3>{issue.message}</h3>{issue.relativePath&&<p className="unity-diagnostic-location">{issue.relativePath}{issue.line?` · 第 ${issue.line} 行`:''}</p>}
  <ul>{issue.suggestions.map((suggestion,index)=><li key={index}>{suggestion}</li>)}</ul>
  <details><summary>{t("查看已脱敏的原始报错")}</summary><pre>{issue.detail}</pre></details>
  <small>{t("首次观察：")}{time(issue.firstObservedAt)}{t(" · 最近观察：")}{time(issue.lastObservedAt)}</small>
 </article>;
}
function AdviceList({title,items}:{title:string;items:string[]}){return items.length>0?<div><h4>{title}</h4><ul>{items.map((item,index)=><li key={index}>{item}</li>)}</ul></div>:null;}
export function UnityDiagnosticsPage({api,projects,initialProjectId,onOpenSettings,onDiagnose,autoDiagnose=false,aiConfigured=!!onDiagnose,aiUnavailableReason}:UnityDiagnosticsPageProps){
 const [projectId,setProjectId]=useState(initialProjectId||projects[0]?.id||'');
 const [snapshot,setSnapshot]=useState<UnityDiagnosticSnapshot>(),[error,setError]=useState(''),[reading,setReading]=useState(false);
 const [advice,setAdvice]=useState<{revision:string;value:UnityDiagnosticAdvice}>(),[aiError,setAiError]=useState(''),[diagnosing,setDiagnosing]=useState(false);
 const selection=useRef(0),readingRef=useRef(false),aiBusy=useRef(false),diagnoseCallback=useRef(onDiagnose);
 diagnoseCallback.current=onDiagnose;
 useEffect(()=>{if(initialProjectId)setProjectId(initialProjectId)},[initialProjectId]);
 useEffect(()=>{if(!projects.some(project=>project.id===projectId))setProjectId(projects.some(project=>project.id===initialProjectId)?initialProjectId!:projects[0]?.id||'')},[projects,projectId,initialProjectId]);
 useEffect(()=>{
  let active=true;const generation=++selection.current;let timer:ReturnType<typeof setTimeout>|undefined;
  setSnapshot(undefined);setAdvice(undefined);setError('');setAiError('');setDiagnosing(false);aiBusy.current=false;
  const refresh=async()=>{
   if(!projectId)return;
   setReading(true);
   try{const next=await api.unityDiagnostics(projectId);if(active&&selection.current===generation){setSnapshot(next);setError('')}}
   catch(e){if(active&&selection.current===generation)setError(message(e))}
   finally{if(active){setReading(false);timer=setTimeout(refresh,5000)}}
  };
  void refresh();return()=>{active=false;selection.current++;if(timer)clearTimeout(timer);};
 },[api,projectId]);
 const refreshNow=async()=>{
  if(!projectId||readingRef.current)return;readingRef.current=true;setReading(true);const generation=selection.current;
  try{const next=await api.unityDiagnostics(projectId);if(selection.current===generation){setSnapshot(next);setError('')}}
  catch(e){if(selection.current===generation)setError(message(e))}
  finally{readingRef.current=false;if(selection.current===generation)setReading(false)}
 };
 const diagnose=async(input:UnityDiagnosticSnapshot,manual=false)=>{
  const callback=diagnoseCallback.current;if(!callback||aiBusy.current||input.status!=='ready')return;
  const generation=selection.current;aiBusy.current=true;setDiagnosing(true);setAiError('');
  const key=unityDiagnosticAnalysisKey(input);
  try{const result=await diagnosisSession.run(key,()=>callback(input),{manual});if(selection.current===generation){if(result?.advice)setAdvice({revision:key,value:result.advice});setAiError(result?.error??'')}}
  catch(e){if(selection.current===generation)setAiError(message(e))}
  finally{if(selection.current===generation){aiBusy.current=false;setDiagnosing(false)}}
 };
 const analysisKey=snapshot?unityDiagnosticAnalysisKey(snapshot):'';
 useEffect(()=>{
  const saved=diagnosisSession.get(analysisKey);
  if(saved?.advice){setAdvice({revision:analysisKey,value:saved.advice});setAiError('');}
  else if(saved?.error)setAiError(saved.error);
 },[analysisKey,snapshot?.checkedAt]);
 useEffect(()=>{
  if(!autoDiagnose||!aiConfigured||!snapshot||snapshot.status!=='ready'||!snapshot.issues.some(issue=>issue.severity==='error')||!diagnoseCallback.current||diagnosing)return;
  const delay=diagnosisSession.delay(analysisKey);if(delay===undefined)return;
  const input=snapshot,timer=setTimeout(()=>{void diagnose(input);},delay);
  return()=>clearTimeout(timer);
 },[analysisKey,snapshot,autoDiagnose,aiConfigured,diagnosing]);
 const errors=snapshot?.issues.filter(issue=>issue.severity==='error')||[],warnings=snapshot?.issues.filter(issue=>issue.severity==='warning')||[];
 const compile=errors.filter(issue=>issue.kind==='compile'),other=errors.filter(issue=>issue.kind!=='compile');
 const first=errors[0]?.id,canDiagnose=!!onDiagnose&&aiConfigured&&snapshot?.status==='ready'&&errors.length>0;
 return <section className="unity-diagnostics-page" aria-label="Unity 问题与解决方法">
  <div className="unity-diagnostics-toolbar"><label>{t("当前工程")}<select aria-label="诊断工程" value={projectId} onChange={event=>setProjectId(event.target.value)} disabled={!projects.length}>{!projects.length&&<option value="">{t("暂无已登记工程")}</option>}{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button className="button small" disabled={!projectId||reading} onClick={()=>void refreshNow()}>{reading?'检查中…':'立即检查'}</button><span className="unity-diagnostic-count">{errors.length}{t(" 类错误 · ")}{warnings.length}{t(" 类警告")}</span></div>
  {!projects.length&&<p className="unity-diagnostics-empty">{t("请先在工程页登记 Unity 工程。登记后可在这里查看对应的问题。")}</p>}
  {error&&<p className="unity-diagnostics-error" role="alert">{error}</p>}
  {snapshot&&<div className={`unity-diagnostics-status ${snapshot.status}`} role="status"><strong>{snapshot.status==='ready'?'已核对工程归属':'等待可核对的 Unity 输出'}</strong><p>{snapshot.message}</p>{snapshot.projectVersion&&<small>Unity {snapshot.projectVersion}{t(" · 上次检查 ")}{time(snapshot.checkedAt)}</small>}{snapshot.truncated&&<p>{t("日志已按容量限制截取或丢弃超长内容，此处可能不包含全部问题。")}</p>}</div>}
  <div className="unity-diagnostics-ai"><div><h3>{t("AI 排障建议")}</h3><p>{!aiConfigured?(aiUnavailableReason||'尚未配置 AI。可以先查看本地错误和基础建议，在 AI 设置中连接服务并开启日志诊断。'):autoDiagnose?'已启用自动诊断：新错误稳定后合并分析，重复计数或新增警告不会重复发送同一错误。':'可分析下面已脱敏的错误摘要；在 AI 设置中启用后，也可以自动分析新的报错。'}</p><p className="help-text">{t("建议中的原因需要核实。任何修改都由你决定；此页面只读工程日志，不执行 AI 文本中的命令。")}</p></div><button className="button primary" disabled={!canDiagnose||diagnosing} onClick={()=>{if(snapshot)void diagnose(snapshot,true)}}>{diagnosing?'正在分析…':aiError?'重新分析':'分析这些错误'}</button></div>
  {aiError&&<p className="unity-diagnostics-error" role="alert">{aiError} <button className="button small" onClick={onOpenSettings}>{t("查看 AI 设置")}</button></p>}
  {advice&&<article className="unity-diagnostics-advice"><small>{t("AI 建议 · 需要核实")}</small><h3>{advice.value.summary}</h3>{advice.revision!==analysisKey&&<p>{t("这是上一份报错记录的分析，当前输出已有变化。")}</p>}<AdviceList title="已观察到的事实" items={advice.value.facts}/><AdviceList title="可能原因" items={advice.value.causes}/><AdviceList title="建议处理顺序" items={advice.value.steps}/><AdviceList title="如何验证" items={advice.value.verification}/><AdviceList title="还缺少的信息" items={advice.value.missingInformation}/></article>}
  {snapshot?.status==='ready'&&!snapshot.issues.length&&<p className="unity-diagnostics-empty">{t("当前读取范围内没有识别到错误或警告。这不能单独证明工程已修复；请在 Unity 中重新执行之前出错的操作。")}</p>}
  {compile.length>0&&<div className="unity-diagnostics-group"><h3>{t("脚本编译 · ")}{compile.length}{t(" 类错误")}</h3><p className="help-text">{t("先处理最早的错误，避免把同一编译失败产生的后续提示逐个当成独立原因。")}</p>{compile.map(issue=><Issue key={issue.id} issue={issue} first={issue.id===first}/>)}</div>}
  {other.length>0&&<div className="unity-diagnostics-group"><h3>{t("异常与其他错误")}</h3>{other.map(issue=><Issue key={issue.id} issue={issue} first={issue.id===first}/>)}</div>}
  {warnings.length>0&&<details className="unity-diagnostics-warnings"><summary>{t("展开 ")}{warnings.length}{t(" 类警告")}</summary>{warnings.map(issue=><Issue key={issue.id} issue={issue} first={false}/>)}</details>}
  <p className="help-text unity-diagnostics-footnote">{t("显示内容已过滤常见账号、凭据和个人路径，但插件可能输出无法自动识别的信息。可展开报错检查内容；自动上传的范围与开关可在 AI 设置中调整。时间表示素材库观察到输出的时刻，不用于判断素材是否导致问题。")}</p>
 </section>;
}
