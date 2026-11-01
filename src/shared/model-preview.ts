import type {AppTheme} from './contracts';
export const MODEL_FORMATS=['fbx','glb','gltf','obj','prefab'] as const;
export type ModelFormat=typeof MODEL_FORMATS[number];
export const MODEL_MAX_BYTES=64*1024*1024,MODEL_BUNDLE_BYTES=128*1024*1024,MODEL_TEXTURE_BYTES=16*1024*1024;
export const MODEL_TEXTURE_DIMENSION=4096,MODEL_TEXTURE_DECODED_BYTES=128*1024*1024;
export const MODEL_PREFAB_MAX_BYTES=8*1024*1024,MODEL_PREFAB_MAX_NODES=512,MODEL_PREFAB_MAX_MATERIALS=64,MODEL_PREFAB_MAX_MESHES=64;
export interface ModelChoice {token:string;label:string;name:string;format:ModelFormat;size:number}
export interface ModelPreviewState {title:string;theme:AppTheme;choices:ModelChoice[];warnings:string[]}
export interface PrefabTransform {position:[number,number,number];rotation:[number,number,number,number];scale:[number,number,number]}
/** A node keeps the file's own numbers; only the handedness mirror is applied at load. */
export interface PrefabNode {id:string;name:string;parent:string|null;transform:PrefabTransform;mesh?:string;submesh:number;materials:string[]}
export interface PrefabMaterial {file:string;name:string;color:[number,number,number];hasColor:boolean;texture?:string;transparent:boolean;cutoff:number;doubleSided:boolean}
export interface PrefabScene {nodes:PrefabNode[];materials:PrefabMaterial[];warnings:string[]}
export interface ModelBundle {name:string;files:{name:string;bytes:Uint8Array}[];warnings:string[];prefab?:PrefabScene}
export interface ModelReferenceSource {id:string;title:string}
export interface ModelReferenceState {title?:string;choices:ModelChoice[];warnings:string[]}
export interface ModelSceneBundle {primary:ModelBundle;reference?:ModelBundle}
export interface ModelPreviewAPI {state():Promise<ModelPreviewState>;load(token:string):Promise<ModelBundle>;cancel():Promise<void>;sources(query?:string):Promise<ModelReferenceSource[]>;selectReference(id:string|null):Promise<ModelReferenceState>;loadScene(primaryToken:string,referenceToken?:string):Promise<ModelSceneBundle>}
export function modelFormat(name:string):ModelFormat|undefined {const ext=name.split('.').pop()?.toLowerCase();return MODEL_FORMATS.includes(ext as ModelFormat)?ext as ModelFormat:undefined}
export function safeModelPath(value:unknown):string|undefined {
 if(typeof value!=='string'||!value||value.length>4096||/[\x00-\x1f:]/.test(value)||/^[\\/]/.test(value))return;
 const parts=value.replaceAll('\\','/').split('/');if(parts.some(p=>p==='..'||!p||p==='.'||/[. ]$/.test(p)))return;
 return parts.join('/');
}
/** Only maps references to an indexed local resource. Never returns a URL or disk path. */
export function resolveModelResource(raw:string,model:string,names:string[]):string|undefined {
 if(raw.startsWith('vrcal-material/')){const end=raw.indexOf('/',15);if(end<0)return;try{model=decodeURIComponent(raw.slice(15,end));if(!safeModelPath(model))return;raw=raw.slice(end+1)}catch{return}}
 let value=raw;try{value=decodeURIComponent(value)}catch{return}
 if(/[\x00-\x1f]/.test(value)||value.startsWith('//')||/^[a-z][a-z\d+.-]*:/i.test(value)&&!(/^[a-z]:[\\/]/i.test(value)))return;
 value=value.replaceAll('\\','/');
 const exact=(v:string)=>{const found=names.filter(n=>n.toLowerCase()===v.toLowerCase());return found.length===1?found[0]:undefined};
 if(!/^(?:[a-z]:\/|\/)/i.test(value)){
  const parts=model.split('/').slice(0,-1);for(const p of value.split('/')){if(p==='..'){if(!parts.length)return;parts.pop()}else if(p&&p!=='.')parts.push(p)}
  const direct=safeModelPath(value)?exact(value):undefined,relative=exact(parts.join('/'));if(relative||direct)return relative||direct;
 }
 const leaf=value.split('/').pop();if(!leaf||!safeModelPath(leaf))return;
 const candidates=names.filter(n=>n.split('/').pop()?.toLowerCase()===leaf.toLowerCase());return candidates.length===1?candidates[0]:undefined;
}
export const modelMaterialResourceBase=(name:string)=>`vrcal-material/${encodeURIComponent(name)}/`;
/** Reads dimensions before browser decoding, including image data stored inside model files. */
export function modelTextureDimensions(bytes:Uint8Array,name:string):{width:number;height:number} {
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=(at:number,n:number)=>String.fromCharCode(...bytes.subarray(at,at+n));let width=0,height=0;
 if(bytes.length>=24&&ascii(1,3)==='PNG'&&bytes[0]===137){width=v.getUint32(16);height=v.getUint32(20)}
 else if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216){for(let p=2;p+4<=bytes.length;){if(bytes[p++]!==255)throw new Error('JPEG 贴图头无效。');while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;if(p+2>bytes.length)break;const size=v.getUint16(p);if(size<2||p+size>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&size>=7){height=v.getUint16(p+3);width=v.getUint16(p+5);break}p+=size}}
 else if(bytes.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){const kind=ascii(12,4);if(kind==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)}else if(kind==='VP8 '&&ascii(23,3)==='\x9d\x01\x2a'){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383}else if(kind==='VP8L'&&bytes[20]===47){const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1}}
 else if(bytes.length>=26&&ascii(0,2)==='BM'){width=Math.abs(v.getInt32(18,true));height=Math.abs(v.getInt32(22,true))}
 else if(bytes.length>=128&&ascii(0,4)==='DDS '){if(v.getUint32(112,true)!==0||ascii(84,4)==='DX10')throw new Error('轻量预览暂不支持 DDS 数组、立方体或 DX10 贴图。');height=v.getUint32(12,true);width=v.getUint32(16,true)}
 else if(bytes.length>=18&&/\.tga$/i.test(name)&&[2,3,10,11].includes(bytes[2])){width=v.getUint16(12,true);height=v.getUint16(14,true)}
 if(!width||!height)throw new Error('贴图格式或尺寸无法安全识别，请使用 PNG、JPEG、WebP、BMP、TGA 或普通 DDS。');
 if(width>MODEL_TEXTURE_DIMENSION||height>MODEL_TEXTURE_DIMENSION)throw new Error('贴图尺寸超过 4096 × 4096 轻量预览上限。');
 return {width,height};
}
export class ModelTextureBudget {
 private bytes=0;private seen=new Set<string>();
 add(key:string,bytes:Uint8Array,name:string):void {if(this.seen.has(key))return;if(bytes.byteLength>MODEL_TEXTURE_BYTES)throw new Error('嵌入或外部贴图超过 16 MiB 上限。');const {width,height}=modelTextureDimensions(bytes,name);this.bytes+=Math.ceil(width*height*16/3);if(this.bytes>MODEL_TEXTURE_DECODED_BYTES)throw new Error('贴图解码与 mipmap 内存超过 128 MiB 预览预算。');this.seen.add(key);}
}
/** Owns decoder resources even when they arrive after a cancelled asynchronous parse. */
export class ModelPreviewResources {
 private closed=false;private urls=new Set<string>();private bitmaps=new Set<{close:()=>void}>();
 trackURL(url:string):string {if(this.closed)URL.revokeObjectURL(url);else this.urls.add(url);return url;}
 trackBitmap(bitmap:{close:()=>void}):void {if(this.closed)bitmap.close();else this.bitmaps.add(bitmap);}
 captureObjectURLs<T>(parse:()=>T):T {const original=URL.createObjectURL;URL.createObjectURL=blob=>this.trackURL(original.call(URL,blob));try{return parse()}finally{URL.createObjectURL=original}}
 dispose():void {if(this.closed)return;this.closed=true;for(const url of this.urls)URL.revokeObjectURL(url);for(const bitmap of this.bitmaps)bitmap.close();this.urls.clear();this.bitmaps.clear();}
}
