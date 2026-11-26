'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio');
const prior=new Map(['.ts','.tsx','.css'].map(extension=>[extension,require.extensions[extension]]));
let BaiduDownloadPanel,BaiduExtractionSettings,BaiduExtractionHistory;
try{
 const target=path.resolve(__dirname,'../src/renderer/baidu-download-panel.tsx');
 for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8')+(filename===target?'\nexport {BaiduExtractionSettings,BaiduExtractionHistory};':''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:filename}).outputText,filename);
 require.extensions['.css']=module=>{module.exports={}};
 ({BaiduDownloadPanel,BaiduExtractionSettings,BaiduExtractionHistory}=require(target));
}finally{for(const [extension,handler]of prior){if(handler)require.extensions[extension]=handler;else delete require.extensions[extension]}}
function task(id,name,extra={}){return{id,name,state:'completed',receivedBytes:32,totalBytes:32,downloadBps:0,startedAt:'2026-10-28T00:00:00Z',assetId:id,...extra}}
function fixture(extra={}){return{phase:'idle',title:'',message:'',files:[],tasks:[task('model','model.zip'),task('texture','texture.ZIP'),task('rar','extra.rar'),task('unity','model.unitypackage'),task('old','old.zip',{archived:true}),task('pending','pending.zip',{state:'downloading'})],canGoBack:false,busy:false,loggedIn:false,...extra}}
function withPanelState(state,run,{busy=false,selectedArchives=[]}={}){
 const original={useState:React.useState,useEffect:React.useEffect,useSyncExternalStore:React.useSyncExternalStore};let index=0;
 const values=[state,'','',busy,'',false,new Set(),new Set(selectedArchives)];
 React.useState=initial=>[index<values.length?values[index++]:typeof initial==='function'?initial():initial,()=>{}];React.useEffect=()=>{};React.useSyncExternalStore=(_subscribe,get)=>get();
 try{return run()}finally{Object.assign(React,original)}
}
function find(node,predicate){if(!node||typeof node!=='object')return undefined;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match}}
const render=(Component,props)=>load(renderToStaticMarkup(React.createElement(Component,props)));
test('ZIP controls show saved choices and explain conditional recycling and unsupported formats',()=>{
 const $=render(BaiduExtractionSettings,{options:{autoExtract:false,recycleArchives:false},busy:false,onChange(){}});
 assert.equal($('input[type=checkbox]').length,2);assert.equal($('input[checked]').length,0);assert.equal($('input[disabled]').length,0);
 assert($('body').text().includes('解压并入库成功后'));assert($('body').text().includes('失败时保留原压缩包'));assert($('body').text().includes('自动解压仅支持 ZIP'));
 const saved=render(BaiduExtractionSettings,{options:{autoExtract:true,recycleArchives:true},busy:true,onChange(){}});assert.equal(saved('input[checked]').length,2);assert.equal(saved('input[disabled]').length,2);
});
test('offline logged-out history permits only completed unrecycled ZIP files and uses safe defaults',()=>{
 const state=fixture({busy:false});const $=withPanelState(state,()=>render(BaiduDownloadPanel,{api:{},enabled:false}));
 const controls=$('input[aria-label^="选择解压 "]');assert.deepEqual(controls.map((_i,element)=>$(element).attr('aria-label')).get(),['选择解压 model.zip','选择解压 texture.ZIP']);assert.equal(controls.filter('[disabled]').length,0);
 assert.equal($('.baidu-extraction-settings input[checked]').length,0);assert.equal($('.baidu-extraction-settings input[disabled]').length,0);
 const archived=$('.baidu-download-task').filter((_i,element)=>$(element).find('strong').text()==='old.zip');assert(archived.text().includes('原压缩包已移至回收站'));assert.equal(archived.find('button').length,0);
 assert($('body').text().includes('各压缩包解压到独立子目录'));assert.equal($('textarea[disabled]').length,1);
});
test('selected model and material archives submit as one local job while offline',async()=>{
 const state=fixture(),calls=[];const api={extractBaiduDownloads:async(ids,recycle)=>{calls.push([ids,recycle])},baiduDownloadsState:async()=>state};
 const tree=withPanelState(state,()=>BaiduDownloadPanel({api,enabled:false}),{selectedArchives:['model','texture']});
 const button=find(tree,node=>node.type==='button'&&String(node.props.children?.[0]??node.props.children).includes('解压所选并入库'));
 assert(button);assert.equal(button.props.disabled,false);button.props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[[['model','texture'],false]]);
});
test('an active extraction prevents submitting a second archive job',()=>{
 const state=fixture({extractions:[{id:'active',taskIds:['model'],name:'model',state:'extracting',files:1,bytes:8,recycledNames:[],message:'正在处理',startedAt:'2026-10-28T00:00:00Z'}]});
 const $=withPanelState(state,()=>render(BaiduDownloadPanel,{api:{},enabled:false}),{selectedArchives:['texture']});
 assert.equal($('input[aria-label^="选择解压 "]:disabled').length,2);assert.equal($('button').filter((_i,element)=>$(element).text().startsWith('解压所选并入库')).is(':disabled'),true);
});
test('extraction jobs expose phase, output and retained-archive retry only when a directory exists',()=>{
 const base={taskIds:['model','texture'],files:7,bytes:1024,recycledNames:[],startedAt:'2026-10-28T00:00:00Z'};
 const jobs=[{...base,id:'failed',name:'Model with materials',state:'failed',directory:'D:/Synthetic/model',message:'入库未完成，原包保留'},{...base,id:'no-output',name:'Invalid archive',state:'failed',message:'ZIP 无效'},{...base,id:'ok',name:'Complete',state:'completed',directory:'D:/Synthetic/complete',assetId:'asset',recycledNames:['model.zip','texture.zip'],message:'解压并入库成功'}];
 const $=render(BaiduExtractionHistory,{jobs,busy:false,onReveal(){},onRetry(){}}),rows=$('.baidu-download-task');
 assert(rows.eq(0).text().includes('2 个压缩包 · 已解压 7 个文件 · 1.0 KB'));assert(rows.eq(0).text().includes('D:/Synthetic/model'));assert.equal(rows.eq(0).find('button').length,2);assert(rows.eq(0).text().includes('重试入库（保留原包）'));
 assert.equal(rows.eq(1).find('button').length,0);assert.equal(rows.eq(2).find('button').length,1);assert(rows.eq(2).text().includes('已移至回收站：model.zip、texture.zip'));
});
