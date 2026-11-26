'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio');
const prior=new Map(['.ts','.tsx','.css'].map(extension=>[extension,require.extensions[extension]]));
let ReviewCandidates,LocalReviewImagePreview;
try{
 for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:filename}).outputText,filename);
 require.extensions['.css']=module=>{module.exports={}};
 ({ReviewCandidates}=require(path.resolve(__dirname,'../src/renderer/review.tsx')));
 ({LocalReviewImagePreview}=require(path.resolve(__dirname,'../src/renderer/review-local-image.tsx')));
}finally{for(const [extension,handler]of prior){if(handler)require.extensions[extension]=handler;else delete require.extensions[extension]}}
const urls=['https://example.org/first-product','https://example.org/second-product'];
function asset(){return{id:'local-ui-fixture',name:'Local material name',path:'W:\\Synthetic\\local.zip',kind:'archive',group:'Synthetic',size:1,mtimeMs:1,missing:false,localCategory:'服装',localAvatars:[],hintUrls:[],createdAt:'2026-10-23T00:00:00Z',updatedAt:'2026-10-23T00:00:00Z',manual:{coverFile:'manual local.png'},previewFile:'scanned local.png',online:{status:'review',title:'A different online product title',coverFile:'remote-only.png',coverUrl:'https://example.org/remote-image.png',candidates:urls.map((url,index)=>({url,title:'Product '+index}))}}}
function render(record,preferences={}){const calls=[],api=new Proxy({},{get:(_target,key)=>()=>{calls.push(String(key));throw Error('Rendering must not call library API')}});const $=load(renderToStaticMarkup(React.createElement(ReviewCandidates,{asset:record,api,run:async fn=>fn(),enabled:true,...preferences})));assert.deepEqual(calls,[]);return $}
test('default review rendering keeps the original product candidates without a local card',()=>{
 const $=render(asset());assert.equal($('[data-review-local-image]').length,0);assert.deepEqual($('[data-candidate-url]').map((_index,element)=>$(element).attr('data-candidate-url')).get(),urls);
});
test('enabled local comparison is first, uses the manual cache image and has no product confirmation action',()=>{
 const $=render(asset(),{showLocalImage:true}),cards=$('.review-candidates > article'),local=cards.first();
 assert.equal(cards.length,3);assert.equal(local.is('[data-review-local-image]'),true);assert.equal(local.hasClass('review-candidate'),false);assert.equal(local.attr('data-candidate-url'),undefined);
 assert.equal(local.find('[data-review-action="accept"],[data-candidate-url]').length,0);assert.equal(local.find('button').length,1);assert.equal(local.find('button').attr('aria-haspopup'),'dialog');assert.equal(local.find('button').attr('aria-label'),'查看本地图片');
 assert.equal(local.find('img').attr('src'),'library-cover://cache/manual%20local.png');assert.equal(local.find('h4').text(),'Local material name');assert(local.text().includes('仅供对照，不会确认商品来源'));
 assert.deepEqual($('[data-candidate-url]').map((_index,element)=>$(element).attr('data-candidate-url')).get(),urls);assert.equal($('[data-review-action="accept"]').length,2);
});
test('online cover metadata alone cannot create a local comparison card',()=>{
 const record=asset();record.manual={};delete record.previewFile;const $=render(record,{showLocalImage:true});assert.equal($('[data-review-local-image]').length,0);assert.equal($('[data-candidate-url]').length,2);
});
test('a local image can be compared without claiming that any product candidate was found',()=>{
 const record=asset();record.online.candidates=[];const $=render(record,{showLocalImage:true});assert.equal($('[data-review-local-image]').length,1);assert.equal($('[data-candidate-url],[data-review-action="accept"]').length,0);assert.equal($('.review-no-candidates').length,1);
});
test('the actual local preview renders a named modal and a keyboard scroll region without confirmation controls',()=>{
 const $=load(renderToStaticMarkup(React.createElement(LocalReviewImagePreview,{image:'manual local.png',name:'Local material name',onClose(){}}))),dialog=$('[role="dialog"]');
 assert.equal(dialog.attr('aria-modal'),'true');assert.equal(dialog.attr('aria-label'),'本地图片预览');assert.equal(dialog.find('img').attr('src'),'library-cover://cache/manual%20local.png');assert.equal(dialog.find('[role="region"][tabindex="0"]').length,1);
 assert.equal(dialog.find('button').length,1);assert.equal(dialog.find('button').attr('aria-label'),'关闭本地图片预览');assert.equal(dialog.find('[data-review-action="accept"],[data-candidate-url]').length,0);
});
