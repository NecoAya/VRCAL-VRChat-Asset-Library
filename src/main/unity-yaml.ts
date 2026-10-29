/**
 * A bounded parser for the YAML subset Unity writes into `.prefab`, `.mat` and `.meta`.
 * It is deliberately not a general YAML implementation: these files are machine generated,
 * so only the shapes Unity's serializer emits are accepted, and anything else fails loudly
 * instead of guessing. Written by hand so the preview keeps its existing dependency set.
 */
export interface YamlMap {[key:string]:YamlValue|undefined}
export type YamlValue=string|number|null|YamlValue[]|YamlMap;
export interface YamlDocument {classId:number;fileId:number;body:Record<string,YamlValue>|undefined;binary:boolean}
const MAX_LINES=400000,MAX_DEPTH=40,MAX_ITEMS=4000;
const isDash=(value:string)=>value==='-'||value.startsWith('- ');
const mapping=/^([^:]{1,160}):(.*)$/;

function scalar(raw:string):string|number|null {
  if(!raw||raw==='~'||raw==='null')return null;
  if(raw==='true'||raw==='yes')return 1;
  if(raw==='false'||raw==='no')return 0;
  const single=/^'([\s\S]*)'$/.exec(raw);if(single)return single[1].replace(/''/g,"'");
  const double=/^"([\s\S]*)"$/.exec(raw);if(double)return double[1].replace(/\\(["\\])/g,'$1');
  if(/^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+)$/.test(raw))return Number(raw);
  return raw;
}

/** `{x: 1, y: -2}` and `[a, b]` never nest deeply enough to need a real grammar. */
function flow(raw:string,depth=0):YamlValue|null|undefined {
  if(depth>8||!raw)return undefined;
  if(raw.startsWith('{')&&raw.endsWith('}')){const out:Record<string,YamlValue>={},inner=raw.slice(1,-1).trim();if(!inner)return out;for(const part of splitTop(inner)){const at=part.indexOf(':');if(at<0)return;out[part.slice(0,at).trim()]=part.slice(at+1).trim()?flow(part.slice(at+1).trim(),depth+1)??null:null;}return out;}
  if(raw.startsWith('[')&&raw.endsWith(']')){const out:YamlValue[]=[],inner=raw.slice(1,-1).trim();if(inner)for(const part of splitTop(inner))out.push(flow(part.trim(),depth+1)??null);return out;}
  return scalar(raw);
}

/** Commas separate entries; a space inside `key: value` has to stay with its pair. */
function splitTop(value:string):string[]{
  const parts:string[]=[];let depth=0,current='',quote=false;
  for(const character of value){
    if(character==="'"){quote=!quote;current+=character;continue}
    if(quote){current+=character;continue}
    if('{(['.includes(character))depth++;else if('})]'.includes(character))depth--;
    if(!depth&&character===','){parts.push(current);current='';continue}
    current+=character;
  }
  if(current.trim())parts.push(current);
  return parts.slice(0,MAX_ITEMS);
}

interface Line {indent:number;text:string}
function rowsOf(source:string):Line[]{
  const rows:Line[]=[];
  for(const raw of source.split(/\r?\n/)){
    if(!raw.trim()||raw.trimStart().startsWith('#'))continue;
    if(/^\t/.test(raw))throw new Error('Unity YAML 不使用制表符缩进。');
    rows.push({indent:raw.length-raw.trimStart().length,text:raw.trim()});
    if(rows.length>MAX_LINES)throw new Error('文件行数超过轻量预览上限。');
  }
  return rows;
}

/** Read one `key: …` pair; the value may be inline, a deeper block, or a same-indent sequence. */
function readPair(target:Record<string,YamlValue|undefined>,key:string,rest:string,rows:Line[],next:number,indent:number,depth:number):number{
  if(depth>MAX_DEPTH)throw new Error('YAML 嵌套超过轻量预览上限。');
  if(rest){
    if(rest==='|'||rest==='|-'||rest==='>'||rest==='>-'){const chunk:string[]=[];let cursor=next;while(cursor<rows.length&&rows[cursor].indent>=indent)chunk.push(rows[cursor++].text);target[key]=chunk.join(' ');return cursor;}
    target[key]=flow(rest,depth+1)??null;return next;
  }
  const line=rows[next];
  if(line&&line.indent>indent){const [value,after]=parseNode(rows,next,line.indent,depth+1);target[key]=value;return after;}
  if(line&&line.indent===indent&&isDash(line.text)){const [value,after]=parseSequence(rows,next,indent,depth+1);target[key]=value;return after;}
  target[key]=null;return next;
}

function parseSequence(rows:Line[],start:number,indent:number,depth:number):[YamlValue[],number]{
  const out:YamlValue[]=[];let index=start;
  while(index<rows.length&&rows[index].indent===indent&&isDash(rows[index].text)){
    if(out.length>=MAX_ITEMS)throw new Error('YAML 列表项超过轻量预览上限。');
    const body=rows[index].text.slice(1),lead=body.length-body.trimStart().length,item=body.trim(),childIndent=indent+1+lead;
    if(!item){
      const line=rows[index+1];
      if(line&&line.indent>indent){const [value,after]=parseNode(rows,index+1,line.indent,depth+1);out.push(value);index=after;continue}
      if(line&&line.indent===indent&&isDash(line.text)){const [value,after]=parseSequence(rows,index+1,indent,depth+1);out.push(value);index=after;continue}
      out.push(null);index++;continue;
    }
    const pair=/^[{[]/.test(item)?undefined:mapping.exec(item);
    if(pair){
      const map:Record<string,YamlValue|undefined>={};index=readPair(map,pair[1],pair[2].trim(),rows,index+1,childIndent,depth);
      while(index<rows.length&&rows[index].indent===childIndent&&!isDash(rows[index].text)){
        const more=mapping.exec(rows[index].text);if(!more)break;
        index=readPair(map,more[1],more[2].trim(),rows,index+1,childIndent,depth);
      }
      out.push(map);continue;
    }
    out.push(flow(item,depth+1)??null);index++;
  }
  return [out,index];
}

function parseNode(rows:Line[],start:number,indent:number,depth:number):[YamlValue,number]{
  const line=rows[start];if(!line)return [null,start];
  if(isDash(line.text))return parseSequence(rows,start,indent,depth);
  return parseMapping(rows,start,indent,depth);
}

function parseMapping(rows:Line[],start:number,indent:number,depth:number):[Record<string,YamlValue|undefined>,number]{
  const out:Record<string,YamlValue|undefined>={};let index=start;
  while(index<rows.length&&rows[index].indent===indent&&!isDash(rows[index].text)){
    const pair=mapping.exec(rows[index].text);if(!pair)break;
    index=readPair(out,pair[1],pair[2].trim(),rows,index+1,indent,depth);
    if(Object.keys(out).length>MAX_ITEMS)throw new Error('YAML 键数量超过轻量预览上限。');
  }
  return [out,index];
}

/** Unity separates documents with `--- !u!<classId> &<fileId>`. */
export function yamlDocuments(source:string):Map<number,YamlDocument>{
  const found=new Map<number,YamlDocument>();let current:{classId:number;fileId:number;body:string[]}|undefined,binary=false;
  const flush=()=>{
    if(!current)return;
    let body:Record<string,YamlValue>|undefined;
    if(!binary&&current.body.length){const rows=rowsOf(current.body.join('\n'));if(rows.length){const [value]=parseNode(rows,0,rows[0].indent,0);if(value&&typeof value==='object'&&!Array.isArray(value))body=value as Record<string,YamlValue>;}}
    found.set(current.fileId,{classId:current.classId,fileId:current.fileId,body,binary});
    current=undefined;binary=false;
  };
  for(const raw of source.split(/\r?\n/)){
    const header=/^---\s*!u!(\d{1,6})\s*&(\d{1,15})(?:\s+|$)/.exec(raw.trim());
    if(header){flush();current={classId:Number(header[1]),fileId:Number(header[2]),body:[]};continue}
    if(/^\.(?:doc|end)$/.test(raw.trim())){flush();continue}
    if(!current){if(!raw.trim()||raw.trimStart().startsWith('%'))continue;throw new Error('文件缺少 Unity 文档头。');}
    if(raw.includes('!!binary'))binary=true;
    current.body.push(raw);
  }
  flush();
  return found;
}

export function field(value:YamlValue|undefined,key:string):YamlValue|undefined {return value&&typeof value==='object'&&!Array.isArray(value)?(value as Record<string,YamlValue>)[key]:undefined;}
export function entries(value:YamlValue|undefined):[string,YamlValue|undefined][]{return value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value as Record<string,YamlValue>):[];}
export function list(value:YamlValue|undefined):YamlValue[]{return Array.isArray(value)?value:[];}
export function number(value:YamlValue|undefined,fallback=0):number{const raw=value===undefined?fallback:value;if(typeof raw==='number')return Number.isFinite(raw)?raw:fallback;if(typeof raw==='string')return /^[-+]?\d+$/.test(raw)?parseInt(raw,10):Number.isFinite(parseFloat(raw))?parseFloat(raw):fallback;return fallback;}
export function text(value:YamlValue|undefined):string{if(typeof value==='string')return value;if(typeof value==='number')return String(value);return '';}
