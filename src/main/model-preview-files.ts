import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {createGunzip,inflateSync} from 'node:zlib';
import * as yauzl from 'yauzl';
import {noLinks} from './project-access';
import {modelFormat,safeModelPath,resolveModelResource,ModelTextureBudget,MODEL_MAX_BYTES,MODEL_BUNDLE_BYTES,MODEL_TEXTURE_BYTES,MODEL_PREFAB_MAX_BYTES,MODEL_PREFAB_MAX_MATERIALS,MODEL_PREFAB_MAX_MESHES,type ModelBundle,type ModelFormat,type ModelSceneBundle,type PrefabMaterial,type PrefabScene} from '../shared/model-preview';
import {buildMetaIndex,mirrorPrefabTransform,parseMaterial,parsePrefab} from './unity-prefab';

const MAX_ENTRIES=12000,MAX_UNPACKED=512*1024*1024,MODEL_META_MAX=2048;
const renderFile=(name:string)=>!!modelFormat(name)||/\.(png|jpe?g|webp|bmp|tga|dds|bin|mtl|mat|meta)$/i.test(name);
const imageFile=(name:string)=>/\.(png|jpe?g|webp|bmp|tga|dds)$/i.test(name);
interface Entry {name:string;key:string;size:number}
export interface ModelSource extends Entry {source:string;stamp:string;format:ModelFormat;label:string;scope?:'file'|'container'}
export interface ModelIndex {models:ModelSource[];warnings:string[];sourceCount?:number}
const stamp=(s:fs.Stats)=>`${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}`;
async function checkedFile(file:string,limit=MODEL_MAX_BYTES,expectedSize?:number):Promise<Buffer>{
 await noLinks(file);const handle=await fsp.open(file,'r');try{const before=await handle.stat();if(!before.isFile()||before.size>limit)throw new Error('预览资源超过大小上限。');if(expectedSize!==undefined&&before.size!==expectedSize)throw new Error('资源已变化，请重新打开预览。');const bytes=Buffer.alloc(before.size);let offset=0;while(offset<bytes.length){const read=await handle.read(bytes,offset,bytes.length-offset,offset);if(!read.bytesRead)throw new Error('资源已变化，请重新打开预览。');offset+=read.bytesRead}if(stamp(before)!==stamp(await handle.stat()))throw new Error('资源已变化，请重新打开预览。');return bytes}finally{await handle.close()}
}
async function tarRead(source:string,wanted?:Set<string>,expectedSizes?:Map<string,number>):Promise<{entries:Entry[];bytes:Map<string,Buffer>}>{
 const input=fs.createReadStream(source),zip=createGunzip(),bytes=new Map<string,Buffer>(),paths=new Map<string,string>(),sizes=new Map<string,number>(),seen=new Set<string>();
 let buffer=Buffer.alloc(0),remaining=0,padding=0,name='',parts:Buffer[]=[],capture=false,unpacked=0,totalSaved=0,headers=0,ended=false;
 input.on('error',e=>zip.destroy(e));input.pipe(zip);const timer=setTimeout(()=>zip.destroy(new Error('读取素材包超时，请选择较小的素材包或已解压目录。')),20000);
 const finish=()=>{if(!capture)return;const data=Buffer.concat(parts);if(name.endsWith('/pathname')){const value=safeModelPath(data.toString('utf8').replace(/\0+$/,'').trim());if(!value)throw new Error('包内路径无效。');paths.set(name.split('/')[0],value)}else bytes.set(name,data);parts=[]};
 try{for await(const chunk of zip){unpacked+=(chunk as Buffer).length;if(unpacked>MAX_UNPACKED)throw new Error('素材包解压数据超过 512 MB 预览上限，请选择已解压的模型。');buffer=Buffer.concat([buffer,chunk as Buffer]);
  while(buffer.length){
   if(remaining){const count=Math.min(remaining,buffer.length);if(capture)parts.push(Buffer.from(buffer.subarray(0,count)));buffer=buffer.subarray(count);remaining-=count;if(remaining)break;finish()}
   if(padding){const count=Math.min(padding,buffer.length);buffer=buffer.subarray(count);padding-=count;if(padding)break}
   if(buffer.length<512)break;const header=buffer.subarray(0,512);buffer=buffer.subarray(512);if(header.every(b=>b===0)){ended=true;break}
   if(++headers>MAX_ENTRIES*4)throw new Error('素材包文件数量超过预览上限。');
   const expected=parseInt(header.subarray(148,156).toString('ascii').replace(/\0/g,'').trim(),8);let sum=0;for(let i=0;i<512;i++)sum+=i>=148&&i<156?32:header[i];if(expected!==sum)throw new Error('素材包校验失败。');
   name=header.subarray(0,100).toString('utf8').replace(/\0.*$/s,'');const prefix=header.subarray(345,500).toString('utf8').replace(/\0.*$/s,'');if(prefix)name=prefix+'/'+name;
   if(header[156]===53){name=name.replace(/\/$/,'');if(!safeModelPath(name))throw new Error('包内路径无效。')}else if(![0,48].includes(header[156])||!safeModelPath(name))throw new Error('包内路径或文件类型不支持。');
   const sizeText=header.subarray(124,136).toString('ascii').replace(/\0/g,'').trim();if(!/^[0-7]+$/.test(sizeText))throw new Error('素材包大小记录无效。');remaining=parseInt(sizeText,8);if(remaining>MAX_UNPACKED)throw new Error('素材包资源超过预览上限。');padding=(512-remaining%512)%512;
   if(seen.has(name))throw new Error('包内存在重复文件。');seen.add(name);capture=name.endsWith('/pathname')||!!wanted?.has(name);parts=[];
   if(name.endsWith('/pathname')&&remaining>8192)throw new Error('包内路径过长。');if(name.endsWith('/asset'))sizes.set(name.split('/')[0],remaining);
   if(wanted?.has(name)&&expectedSizes&&remaining!==expectedSizes.get(name))throw new Error('素材读取期间发生变化，请重新打开预览。');
   if(capture){totalSaved+=remaining;if(totalSaved>MODEL_BUNDLE_BYTES||wanted?.has(name)&&remaining>MODEL_MAX_BYTES)throw new Error('预览资源超过大小上限。')}
   if(!remaining)finish();
  }if(ended)break;
 }if(!ended)throw new Error('素材包不完整，无法预览。');}finally{clearTimeout(timer);input.destroy();zip.destroy()}
 const entries:Entry[]=[],names=new Set<string>();for(const [id,value] of paths){const key=value.toLowerCase();if(names.has(key))throw new Error('包内存在重复路径。');names.add(key);if(sizes.has(id)&&renderFile(value))entries.push({name:value,key:id+'/asset',size:sizes.get(id)!})}return {entries,bytes};
}
async function zipRead(source:string,wanted?:Set<string>,expected?:Map<string,number>):Promise<{entries:Entry[];bytes:Map<string,Buffer>}>{
 return new Promise((resolve,reject)=>yauzl.open(source,{lazyEntries:true,decodeStrings:true},(error,zip)=>{
  if(error||!zip){reject(error||new Error('压缩包无法读取。'));return}const entries:Entry[]=[],bytes=new Map<string,Buffer>(),seen=new Set<string>();let count=0,total=0,done=false;
  const timer=setTimeout(()=>fail(new Error('读取压缩包超时。')),20000);const fail=(error:Error)=>{if(done)return;done=true;clearTimeout(timer);zip.close();reject(error)};
  zip.on('error',fail);zip.on('end',()=>{if(done)return;done=true;clearTimeout(timer);zip.close();resolve({entries,bytes})});
  zip.on('entry',(entry:yauzl.Entry)=>{void(async()=>{
   if(++count>MAX_ENTRIES)throw new Error('压缩包文件数量超过预览上限。');const directory=entry.fileName.endsWith('/'),name=safeModelPath(directory?entry.fileName.slice(0,-1):entry.fileName);
   if(!name)throw new Error('包内路径无效。');const key=name.toLowerCase();if(seen.has(key))throw new Error('包内存在重复路径。');seen.add(key);
   if(directory){zip.readEntry();return}const mode=(entry.externalFileAttributes>>>16)&0o170000;if(mode===0o120000)throw new Error('包内目录链接不支持预览。');
   if(entry.generalPurposeBitFlag&1)throw new Error('加密压缩包不能直接预览，请使用已有解压目录。');
   if(renderFile(name))entries.push({name,key:entry.fileName,size:entry.uncompressedSize});
   if(wanted?.has(entry.fileName)){
    if(expected&&entry.uncompressedSize!==expected.get(entry.fileName))throw new Error('素材读取期间发生变化，请重新打开预览。');
    total+=entry.uncompressedSize;if(entry.uncompressedSize>MODEL_MAX_BYTES||total>MODEL_BUNDLE_BYTES)throw new Error('预览资源超过大小上限。');
    const data=await new Promise<Buffer>((yes,no)=>zip.openReadStream(entry,(error,stream)=>{if(error||!stream){no(error||new Error('资源读取失败'));return}const parts:Buffer[]=[];let length=0;stream.on('data',chunk=>{length+=chunk.length;if(length>entry.uncompressedSize){stream.destroy(new Error('压缩包大小不一致。'));return}parts.push(chunk)});stream.on('error',no);stream.on('end',()=>yes(Buffer.concat(parts)))}));bytes.set(entry.fileName,data);
   }zip.readEntry();
  })().catch(fail)});zip.readEntry();
 }));
}
async function directoryEntries(root:string):Promise<{entries:Entry[];archives:string[];warnings:string[]}>{
 const entries:Entry[]=[],archives:string[]=[],warnings:string[]=[];let count=0;const start=Date.now();
 const walk=async(dir:string,depth:number)=>{if(depth>10||count>MAX_ENTRIES||Date.now()-start>15000){if(!warnings.includes('目录过深、文件过多或读取超时，仅显示已找到的模型。'))warnings.push('目录过深、文件过多或读取超时，仅显示已找到的模型。');return}
  const handle=await fsp.opendir(dir);try{for await(const item of handle){if(++count>MAX_ENTRIES)break;const file=path.join(dir,item.name);if(item.isSymbolicLink())continue;if(item.isDirectory()){if(!/^(Library|Packages|Temp|Logs|obj|node_modules|\.git)$/i.test(item.name))await walk(file,depth+1);continue}if(!item.isFile())continue;
   const name=path.relative(root,file).replaceAll('\\','/');if(!safeModelPath(name))continue;
   if(renderFile(name)){const stat=await fsp.lstat(file);entries.push({name,key:name,size:stat.size})}else if(/\.(unitypackage|zip)$/i.test(name)&&archives.length<16)archives.push(file);else if(/\.(rar|7z)$/i.test(name)&&!warnings.includes('RAR／7z 请使用已解压目录；预览不会自动解压到素材目录。'))warnings.push('RAR／7z 请使用已解压目录；预览不会自动解压到素材目录。');
  }}finally{/* for-await closes its directory handle */}
 };await walk(root,0);return {entries,archives,warnings};
}
async function entriesAt(source:string):Promise<Entry[]>{const stat=await fsp.lstat(source);if(stat.isDirectory())return (await directoryEntries(source)).entries;if(/\.unitypackage$/i.test(source))return (await tarRead(source)).entries;if(/\.zip$/i.test(source))return (await zipRead(source)).entries;throw new Error('暂不支持此素材包，请使用 FBX／GLB／glTF／OBJ 或已解压目录。')}
export async function indexModels(input:string,sourceLimit=16):Promise<ModelIndex>{
 await noLinks(input);const stat=await fsp.lstat(input),warnings:string[]=[];let sources:string[]=[];const models:ModelSource[]=[];
 const directFormat=modelFormat(input);if(stat.isFile()&&directFormat){if(stat.size>MODEL_MAX_BYTES)throw new Error('模型超过 64 MiB 预览上限。');const name=path.basename(input);return {models:[{name,key:name,size:stat.size,source:input,stamp:stamp(stat),format:directFormat,label:name,scope:'file'}],sourceCount:1,warnings:['单文件预览只读取该文件；如需外部贴图或依赖，请选择已登记的素材文件夹。']};}
 if(stat.isDirectory()){const listing=await directoryEntries(input);warnings.push(...listing.warnings);sources=[input,...listing.archives];}else if(stat.isFile())sources=[modelFormat(input)?path.dirname(input):input];else throw new Error('请选择普通模型文件或素材文件夹。');
 const limit=Math.max(1,Math.min(16,Number.isSafeInteger(sourceLimit)?sourceLimit:16));if(sources.length>limit){sources=sources.slice(0,limit);warnings.push('每个素材最多读取 16 个来源，部分包内来源已跳过。')}let sourceCount=0;
 for(const source of sources){sourceCount++;await noLinks(source);try{const entries=await entriesAt(source),sourceStat=await fsp.lstat(source);for(const entry of entries){const format=modelFormat(entry.name);if(!format||!stat.isDirectory()&&modelFormat(input)&&path.basename(input)!==entry.name)continue;if(models.length>=200){warnings.push('最多展示 200 个模型，请选择更小的素材目录。');break}if(entry.size>MODEL_MAX_BYTES){warnings.push(`${entry.name} 超过 64 MB 模型上限，已跳过。`);continue}
   const s=sourceStat.isDirectory()?await fsp.lstat(path.join(source,entry.key)):sourceStat;models.push({...entry,source,stamp:stamp(s),format,label:source===input||modelFormat(input)?entry.name:`${path.relative(input,source).replaceAll('\\','/')} / ${entry.name}`});
  }}catch(error){if(sources.length===1)throw error;warnings.push(`${path.basename(source)}：${error instanceof Error?error.message:String(error)}`)}
 }return {models:models.sort((a,b)=>a.label.localeCompare(b.label,'zh-CN')),sourceCount,warnings:[...new Set(warnings)].slice(0,30)};
}
interface SceneReadBudget {bytes:number;files:number;arrayBytes:number;textures:ModelTextureBudget}
const sceneBudget=():SceneReadBudget=>({bytes:0,files:0,arrayBytes:0,textures:new ModelTextureBudget()});
export async function prepareModelScene(primary:ModelSource,reference?:ModelSource):Promise<ModelSceneBundle>{
 const budget=sceneBudget(),first=await prepareWithBudget(primary,budget,'primary');
 return {primary:first,...(reference?{reference:await prepareWithBudget(reference,budget,'reference')}:{})};
}
export async function prepareModel(model:ModelSource):Promise<ModelBundle>{return prepareWithBudget(model,sceneBudget(),'primary')}
async function prepareWithBudget(model:ModelSource,scene:SceneReadBudget,slot:string):Promise<ModelBundle>{
 await noLinks(model.source);const single=model.scope==='file',directory=(await fsp.lstat(model.source)).isDirectory(),modelPath=directory?path.join(model.source,model.key):model.source;await noLinks(modelPath);if(stamp(await fsp.lstat(modelPath))!==model.stamp)throw new Error('模型文件已变化，请关闭并重新打开预览。');
 const entries=single?[{name:model.name,key:model.key,size:model.size}]:await entriesAt(model.source),current=entries.find(e=>e.name===model.name&&e.key===model.key);if(!current||current.size!==model.size)throw new Error('模型文件已变化，请重新打开预览。');
 const cache=new Map<string,Buffer>();
 const read=async(selected:Entry[])=>{const missing=selected.filter(e=>!cache.has(e.key));if(missing.length){let found:Map<string,Buffer>;if(single)found=new Map([[model.key,await checkedFile(model.source,MODEL_MAX_BYTES,current.size)]]);else if(directory){found=new Map();for(const e of missing)found.set(e.key,await checkedFile(path.join(model.source,e.key),imageFile(e.name)?MODEL_TEXTURE_BYTES:MODEL_MAX_BYTES,e.size));}else{const wanted=new Set(missing.map(e=>e.key)),expected=new Map(missing.map(e=>[e.key,e.size]));found=/\.unitypackage$/i.test(model.source)?(await tarRead(model.source,wanted,expected)).bytes:(await zipRead(model.source,wanted,expected)).bytes}for(const [key,bytes] of found)cache.set(key,bytes)}return cache};
 const selected:Entry[]=[],warnings:string[]=[];const names=entries.map(e=>e.name);
 const add=(entry:Entry,required=false)=>{if(selected.some(e=>e.key===entry.key))return;if(!Number.isSafeInteger(entry.size)||entry.size<0||entry.size>(imageFile(entry.name)?MODEL_TEXTURE_BYTES:MODEL_MAX_BYTES)||scene.bytes+entry.size>MODEL_BUNDLE_BYTES||scene.files>=96){if(required)throw new Error('组合模型依赖超过预览总大小或文件数量预算。');warnings.push('部分贴图过多或过大，已跳过；可使用素模查看形状。');return}selected.push(entry);scene.bytes+=entry.size;scene.files++};
 add(current,true);const raw=(await read([current])).get(current.key);if(!raw)throw new Error('素材包缺少模型数据。');
 const textureNames=new Set<string>();
 const dependency=(uri:string,base=model.name,required=false,texture=false)=>{if(uri.startsWith('data:'))return;const name=resolveModelResource(uri,base,names),entry=entries.find(e=>e.name===name);if(!entry){if(required)throw new Error('模型缺少本地依赖，或引用了外部网络资源。');warnings.push(`未找到本地贴图：${uri.slice(0,160)}`);return}if(texture)textureNames.add(entry.name);add(entry,required)};
 const embedded=new Set<string>(),reserveEmbedded=(key:string)=>{if(embedded.has(key))return;if(scene.files>=96)throw new Error('嵌入图片超过组合预览文件数量预算。');scene.files++;embedded.add(key)};
 let gltf:any,glbBinary:Buffer|undefined,prefab:PrefabScene|undefined;const budget:Pick<ModelTextureBudget,'add'>={add:(key,bytes,name)=>scene.textures.add(slot+':'+key,bytes,name)};
 if(model.format==='prefab'){
  if(current.size>MODEL_PREFAB_MAX_BYTES)throw new Error('Prefab 超过 8 MiB 轻量预览上限，请选择更小的预制件。');
  const metaEntries=entries.filter(entry=>/\.meta$/i.test(entry.name)&&entry.size>0&&entry.size<=64*1024).slice(0,MODEL_META_MAX);
  for(const entry of metaEntries)add(entry);
  const meta=await read(metaEntries),index=buildMetaIndex(metaEntries.map(entry=>({name:entry.name,text:meta.get(entry.key)!.toString('utf8')})));
  const parsed=parsePrefab(raw.toString('utf8'),index);warnings.push(...parsed.warnings);
  if(!parsed.draft)throw new Error(parsed.warnings[0]??'这个文件不是可读取的 Unity Prefab。');
  const draft=parsed.draft;
  const named=new Map(entries.map(entry=>[entry.name.toLowerCase(),entry])),basenames=new Map<string,Entry|undefined>();
  for(const entry of entries){const leaf=entry.name.toLowerCase().split('/').pop()!;basenames.set(leaf,basenames.has(leaf)?undefined:entry)}
  /** A prefab references assets by path; a unique basename is only a fallback for packages whose stored prefix differs. */
  const locate=(relative:string)=>named.get(relative.toLowerCase())??basenames.get(relative.toLowerCase().split('/').pop()!);
  const materialPaths=new Set<string>();
  for(const node of draft.nodes){
   if(node.mesh){const entry=locate(node.mesh);if(entry)add(entry,true);else warnings.push(`Prefab 引用的模型 ${node.mesh.slice(0,160)} 不在此素材的读取范围内。`)}
   for(const path of node.materials)materialPaths.add(path);
  }
  if(materialPaths.size>MODEL_PREFAB_MAX_MATERIALS)throw new Error(`Prefab 引用了超过 ${MODEL_PREFAB_MAX_MATERIALS} 个材质，请选择更小的预制件。`);
  const materialEntries=[...materialPaths].map(locate).filter((entry):entry is Entry=>!!entry);
  for(const entry of materialEntries)add(entry);
  const content2=await read(materialEntries),materials:PrefabMaterial[]=[];
  for(const path of materialPaths){
   const entry=locate(path);if(!entry){warnings.push(`Prefab 引用的材质 ${path.slice(0,160)} 不在此素材的读取范围内。`);continue}
   const parsed2=parseMaterial(content2.get(entry.key)!.toString('utf8'),index),item=parsed2.material;
   if(!item)continue;
   item.file=entry.name;warnings.push(...parsed2.warnings);
   if(item.texture){const texture=locate(item.texture);if(texture){add(texture);textureNames.add(texture.name)}else warnings.push(`材质 ${path.slice(0,120)} 的贴图 ${item.texture.slice(0,120)} 不在此素材的读取范围内。`)}
   materials.push(item);
  }
  prefab={nodes:draft.nodes.map(node=>({id:node.id,name:node.name,parent:node.parent,transform:mirrorPrefabTransform(node.raw),mesh:node.mesh,submesh:node.submesh,materials:node.materials})),materials,warnings:[]};
  if(draft.meshes.size>MODEL_PREFAB_MAX_MESHES)throw new Error(`Prefab 引用了超过 ${MODEL_PREFAB_MAX_MESHES} 个模型文件，请选择更小的预制件。`);
 }
 else if(model.format==='gltf'||model.format==='glb'){
  let data:unknown;if(model.format==='gltf')data=JSON.parse(raw.toString('utf8'));else{if(raw.length<20||raw.toString('ascii',0,4)!=='glTF'||raw.readUInt32LE(4)!==2||raw.readUInt32LE(8)!==raw.length||raw.readUInt32LE(16)!==0x4e4f534a||raw.readUInt32LE(12)>raw.length-20)throw new Error('GLB 文件头无效。');data=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString('utf8'))}
  gltf=data;if(!gltf||typeof gltf!=='object'||!Array.isArray(gltf.images??[])||!Array.isArray(gltf.buffers??[])||(gltf.images?.length||0)>96)throw new Error('glTF 图片或依赖定义超出预览限制。');
  if((gltf.extensionsRequired||[]).some((name:string)=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(name)))throw new Error('轻量预览暂不支持 Draco、Meshopt 或 KTX2 压缩资源，请使用普通 FBX／OBJ／glTF。');
  for(const b of gltf.buffers||[])if(b.uri)dependency(b.uri,model.name,true);for(const i of gltf.images||[])if(i.uri)dependency(i.uri,model.name,false,true);
  if(model.format==='glb'){const at=20+raw.readUInt32LE(12);if(at+8<=raw.length&&raw.readUInt32LE(at+4)===0x004e4942){const size=raw.readUInt32LE(at);if(at+8+size>raw.length)throw new Error('GLB 二进制块无效。');glbBinary=raw.subarray(at+8,at+8+size)}}
 }else if(model.format==='obj'){
  for(const match of raw.toString('utf8').matchAll(/^mtllib\s+(.+)$/gm))dependency(match[1].trim());
  const mtls=selected.filter(e=>/\.mtl$/i.test(e.name));if(mtls.length)for(const e of mtls){const bytes=(await read([e])).get(e.key);for(const match of bytes?.toString('utf8').matchAll(/^(?:map_\w+|bump|disp|decal|norm)\s+(.+)$/gmi)||[]){const reference=match[1].trim();if(!reference.startsWith('-'))dependency(reference,e.name,false,true);else warnings.push('部分 OBJ 贴图参数暂不支持。')}}
 }else{for(const reference of inspectFbx(raw,budget,scene,reserveEmbedded))dependency(reference,model.name,false,true);warnings.push('FBX 只使用模型自身引用的贴图；Unity .mat、lilToon 和预制件配置暂不还原。')}
 const content=selected.length===1?new Map([[current.key,raw]]):await read(selected);if(stamp(await fsp.lstat(modelPath))!==model.stamp)throw new Error('素材读取期间发生变化，请重新打开预览。');
 for(const entry of selected)if(imageFile(entry.name)||textureNames.has(entry.name)){const bytes=content.get(entry.key);if(bytes)budget.add(entry.name,bytes,entry.name)}
 if(gltf)for(let index=0;index<(gltf.images||[]).length;index++){
  const image=gltf.images[index];if(image.uri?.startsWith('data:')){reserveEmbedded(`embedded:${index}`);budget.add(`embedded:${index}`,decodeData(image.uri,MODEL_TEXTURE_BYTES),image.mimeType||image.uri.slice(0,32));}
  else if(image.bufferView!==undefined){const view=gltf.bufferViews?.[image.bufferView];if(!view||!Number.isSafeInteger(view.byteLength)||view.byteLength<0||view.byteLength>MODEL_TEXTURE_BYTES)throw new Error('嵌入贴图数据范围无效。');reserveEmbedded(`view:${image.bufferView}`);const buffer=gltf.buffers?.[view.buffer];let bytes:Buffer|undefined;if(buffer?.uri?.startsWith('data:'))bytes=decodeData(buffer.uri,MODEL_MAX_BYTES);else if(buffer?.uri){const name=resolveModelResource(buffer.uri,model.name,names),entry=selected.find(e=>e.name===name);bytes=entry&&content.get(entry.key)}else if(view.buffer===0)bytes=glbBinary;
   const offset=view.byteOffset??0;if(!bytes||!Number.isSafeInteger(offset)||offset<0||offset+view.byteLength>bytes.length)throw new Error('嵌入贴图数据范围无效。');budget.add(`view:${image.bufferView}`,bytes.subarray(offset,offset+view.byteLength),image.mimeType||'embedded');}
 }
 /** `.meta` files only build the guid index; the viewer never needs their bytes. */
 return {name:model.name,files:selected.filter(e=>!prefab||!/\.meta$/i.test(e.name)).map(e=>{const bytes=content.get(e.key);if(!bytes)throw new Error('素材包依赖不完整。');return {name:e.name,bytes:new Uint8Array(bytes)}}),warnings:[...new Set(warnings)],...(prefab?{prefab}:{})};
}

function decodeData(value:string,limit:number):Buffer {
 const match=value.match(/^data:[^,]*;base64,([A-Za-z0-9+/=\r\n]*)$/);if(!match||match[1].length>Math.ceil(limit/3)*4+4)throw new Error('嵌入资源编码或大小超出轻量预览限制。');const bytes=Buffer.from(match[1],'base64');if(bytes.length>limit)throw new Error('嵌入资源超出大小限制。');return bytes;
}
/** Inspect FBX metadata without constructing meshes or allowing the browser to decode unchecked images. */
function inspectFbx(raw:Buffer,budget:Pick<ModelTextureBudget,'add'>,scene:SceneReadBudget,reserveEmbedded:(key:string)=>void):string[]{
 const refs=new Set<string>();let imageIndex=0;
 const filename=(value:string)=>{if(/^data:/i.test(value.trimStart()))throw new Error('FBX 贴图文件名不支持 data: 地址，请使用标准 Content 嵌入图片。');if(imageFile(value))refs.add(value)};
 if(raw.toString('ascii',0,23)!=='Kaydara FBX Binary  \0\x1a\0'){
  const text=raw.toString('utf8');if(!/^;\s*FBX\s/i.test(text))throw new Error('FBX 文件头不支持，请使用标准二进制或 ASCII FBX。');
  for(const match of text.matchAll(/(?:RelativeFilename|FileName|Filename):\s*"([^"\r\n]*)"/g))filename(match[1]);
  const contents=[...text.matchAll(/\bContent:\s*,?\s*"([A-Za-z0-9+/=\s]*)"/g)];
  if((text.match(/\bContent:/g)||[]).length!==contents.length)throw new Error('嵌入 FBX 贴图编码暂不支持。');
  for(const match of contents){const encoded=match[1].replace(/\s/g,'');if(!encoded)continue;const key=`fbx:${imageIndex++}`;reserveEmbedded(key);const data=decodeData('data:application/octet-stream;base64,'+encoded,MODEL_TEXTURE_BYTES);budget.add(key,data,[...refs].find(r=>/\.tga$/i.test(r))||'embedded');}
  return [...refs];
 }
 if(raw.length<27)throw new Error('FBX 文件头不完整。');const wide=raw.readUInt32LE(23)>=7500,header=wide?25:13;let nodes=0,arrayBytes=0;
 const number=(at:number)=>{const value=wide?Number(raw.readBigUInt64LE(at)):raw.readUInt32LE(at);if(!Number.isSafeInteger(value))throw new Error('FBX 范围过大。');return value};
 const walk=(start:number,limit:number,depth:number)=>{if(depth>64)throw new Error('FBX 层级超过预览上限。');let at=start;while(at+header<=limit){const end=number(at);if(!end)break;if(++nodes>100000||end>limit||end<=at+header)throw new Error('FBX 节点范围无效。');const count=number(at+(wide?8:4)),length=number(at+(wide?16:8)),nameLength=raw[at+header-1],name=raw.toString('utf8',at+header,at+header+nameLength);let p=at+header+nameLength;const propertiesEnd=p+length;if(propertiesEnd>end||count>100000)throw new Error('FBX 属性范围无效。');
   for(let index=0;index<count;index++){if(p>=propertiesEnd)throw new Error('FBX 属性不完整。');const kind=String.fromCharCode(raw[p++]);if('SR'.includes(kind)){if(p+4>propertiesEnd)throw new Error('FBX 数据不完整。');const n=raw.readUInt32LE(p);p+=4;if(p+n>propertiesEnd)throw new Error('FBX 数据范围无效。');const data=raw.subarray(p,p+n);if(['RelativeFilename','FileName','Filename'].includes(name)&&kind==='S')filename(data.toString('utf8'));if(name==='Content'&&n){const key=`fbx:${imageIndex++}`;reserveEmbedded(key);const image=kind==='R'?data:decodeData('data:application/octet-stream;base64,'+data.toString('ascii'),MODEL_TEXTURE_BYTES);budget.add(key,image,[...refs].find(r=>/\.tga$/i.test(r))||'embedded')}p+=n;}
    else if('fdlibc'.includes(kind)){if(p+12>propertiesEnd)throw new Error('FBX 数组不完整。');const count=raw.readUInt32LE(p),encoding=raw.readUInt32LE(p+4),size=raw.readUInt32LE(p+8),element=kind==='d'||kind==='l'?8:kind==='f'||kind==='i'?4:1,decoded=count*element;p+=12;arrayBytes+=decoded;scene.arrayBytes+=decoded;if(arrayBytes>MODEL_BUNDLE_BYTES||scene.arrayBytes>MODEL_BUNDLE_BYTES||p+size>propertiesEnd||![0,1].includes(encoding))throw new Error('FBX 数组超过解码内存预算。');if(encoding===0&&size!==decoded||encoding===1&&inflateSync(raw.subarray(p,p+size),{maxOutputLength:Math.max(1,decoded)}).length!==decoded)throw new Error('FBX 数组长度不一致。');p+=size;}
    else{const size=({Y:2,C:1,I:4,F:4,D:8,L:8} as Record<string,number>)[kind];if(!size||p+size>propertiesEnd)throw new Error('FBX 属性类型无效。');p+=size;}
   }if(p!==propertiesEnd)throw new Error('FBX 属性长度不一致。');if(propertiesEnd<end)walk(propertiesEnd,end,depth+1);at=end;
  }};walk(27,raw.length,0);return [...refs];
}
