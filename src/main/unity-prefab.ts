import {field,list,number,text,yamlDocuments,type YamlValue} from './unity-yaml';
import {MODEL_PREFAB_MAX_MATERIALS,MODEL_PREFAB_MAX_MESHES,MODEL_PREFAB_MAX_NODES,type PrefabMaterial,type PrefabNode,type PrefabScene,type PrefabTransform} from '../shared/model-preview';

const ZERO_GUID='00000000000000000000000000000000';
export function metaGuid(source:string):string|undefined {return /^guid:\s*([0-9a-f]{32})\s*$/m.exec(source)?.[1];}

interface AssetRef {fileId:number;guid:string}
function reference(value:YamlValue|undefined):AssetRef|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  const map=value as Record<string,YamlValue>,guid=text(map.guid).toLowerCase();
  return {fileId:number(map.fileID),guid:guid.length===32?guid:ZERO_GUID};
}
const ownerOf=(value:YamlValue|undefined)=>number(field(field(value??undefined,'m_GameObject'),'fileID'));

/** `.meta` files are named after the asset they describe, so the asset path is the meta path minus the suffix. */
export interface MetaIndex {file(guid:string):string|undefined;guidOf(file:string):string|undefined}
export function buildMetaIndex(files:{name:string;text:string}[]):MetaIndex{
  const byGuid=new Map<string,string>(),byFile=new Map<string,string>();
  for(const entry of files){
    if(!/\.meta$/i.test(entry.name))continue;
    const guid=metaGuid(entry.text);if(!guid)continue;
    const target=entry.name.replace(/\.meta$/i,'');
    if(!byGuid.has(guid))byGuid.set(guid,target);
    if(!byFile.has(target.toLowerCase()))byFile.set(target.toLowerCase(),guid);
  }
  return {file:(guid)=>byGuid.get(guid.toLowerCase()),guidOf:(file)=>byFile.get(file.toLowerCase())};
}

/**
 * Unity is left-handed with +Z forward. Mirroring the Z axis on the node transforms keeps
 * parent/child composition exact (conjugation is a homomorphism) while leaving every loaded
 * mesh's own geometry untouched, so a node with an identity transform previews identically to
 * opening that model file on its own.
 */
const flip=(value:number)=>value===0?0:-value;
export const mirrorPrefabTransform=(source:PrefabTransform):PrefabTransform=>({position:[source.position[0],source.position[1],flip(source.position[2])],rotation:[source.rotation[0],source.rotation[1],flip(source.rotation[2]),source.rotation[3]],scale:[source.scale[0],source.scale[1],source.scale[2]]});
const vector3=(value:YamlValue|undefined,fallback:[number,number,number]):[number,number,number]=>[number(field(value,'x'),fallback[0]),number(field(value,'y'),fallback[1]),number(field(value,'z'),fallback[2])];
const quaternion=(value:YamlValue|undefined):[number,number,number,number]=>[number(field(value,'x')),number(field(value,'y')),number(field(value,'z')),number(field(value,'w'),1)];
const localTransform=(node:YamlValue|undefined):PrefabTransform=>({position:vector3(field(node,'m_LocalPosition'),[0,0,0]),rotation:quaternion(field(node,'m_LocalRotation')),scale:vector3(field(node,'m_LocalScale'),[1,1,1])});

/** A node keeps Unity's own numbers; the viewer applies the mirror once, at assembly. */
export interface PrefabDraft {nodes:(Omit<PrefabNode,'transform'>&{raw:PrefabTransform})[];warnings:string[];meshes:Set<string>;hidden:number;builtin:number;missing:number}
export function parsePrefab(source:string,index:MetaIndex):{draft?:PrefabDraft;warnings:string[]} {
  const warnings:string[]=[],documents=yamlDocuments(source);
  if(documents.size>MODEL_PREFAB_MAX_NODES*4)throw new Error('Prefab 对象数量超过轻量预览上限，请选择更小的预制件。');
  const gameObjects=new Map<number,{name:string;active:boolean}>(),transforms=new Map<number,{owner:number;father:number;raw:PrefabTransform}>(),filters=new Map<number,{owner:number;mesh?:AssetRef}>(),renderers=new Map<number,{owner:number;mesh?:AssetRef;materials:AssetRef[];skinned:boolean}>(),skipped=new Set<string>();
  for(const document of documents.values()){
    const body=document.body;if(!body)continue;
    const owner=ownerOf(body.Transform??body.MeshFilter??body.MeshRenderer??body.SkinnedMeshRenderer);
    if(body.GameObject)gameObjects.set(document.fileId,{name:text(field(body.GameObject,'m_Name')),active:number(field(body.GameObject,'m_IsActive'),1)!==0});
    else if(body.Transform)transforms.set(document.fileId,{owner,father:number(field(field(body.Transform,'m_Father'),'fileID')),raw:localTransform(body.Transform)});
    else if(body.MeshFilter)filters.set(document.fileId,{owner,mesh:reference(field(body.MeshFilter,'m_Mesh'))});
    else if(body.MeshRenderer||body.SkinnedMeshRenderer){
      const node=(body.MeshRenderer??body.SkinnedMeshRenderer) as Record<string,YamlValue>;
      renderers.set(document.fileId,{owner,mesh:reference(field(node,'m_Mesh')),materials:list(field(node,'m_Materials')).map(item=>reference(item)).filter((item):item is AssetRef=>!!item&&!!item.guid&&item.guid!==ZERO_GUID),skinned:!body.MeshRenderer});
    }
    else if(body.PrefabInstance)skipped.add('嵌套 PrefabInstance');
    else if(body.LODGroup)skipped.add('LODGroup');
    else if(body.MonoBehaviour)skipped.add('脚本组件');
  }
  for(const label of skipped)warnings.push(`${label} 暂不展开，画面只包含本文件直接引用的网格。`);
  if(!gameObjects.size||!transforms.size)return {warnings:['这个文件里没有可读的 GameObject/Transform，可能不是 Unity Prefab 文本。']};

  const filterByOwner=new Map<number,{mesh?:AssetRef}>(),rendererByOwner=new Map<number,{mesh?:AssetRef;materials:AssetRef[]}>();
  for(const filter of filters.values())if(filter.owner&&!filterByOwner.has(filter.owner))filterByOwner.set(filter.owner,filter);
  for(const renderer of renderers.values())if(renderer.owner&&!rendererByOwner.has(renderer.owner))rendererByOwner.set(renderer.owner,renderer);
  const nodes:PrefabDraft['nodes']=[],meshes=new Set<string>();let hidden=0,builtin=0,missing=0,multiMaterial=0;
  for(const [id,node] of transforms){
    const object=node.owner?gameObjects.get(node.owner):undefined;
    if(object&&!object.active){hidden++;continue}
    const renderer=node.owner?rendererByOwner.get(node.owner):undefined,filter=node.owner?filterByOwner.get(node.owner):undefined;
    const mesh=renderer?.mesh?.guid?renderer.mesh:filter?.mesh;
    if(renderer&&renderer.materials.length>1)multiMaterial++;
    const materials=(renderer?.materials??[]).map(item=>index.file(item.guid)).filter((file):file is string=>!!file);
    const resolved=!mesh?undefined:mesh.guid===ZERO_GUID?(builtin++,undefined):index.file(mesh.guid);
    if(mesh&&mesh.guid!==ZERO_GUID&&!resolved)missing++;
    if(resolved){if(meshes.size>=MODEL_PREFAB_MAX_MESHES&&!meshes.has(resolved)){missing++;continue}meshes.add(resolved)}
    nodes.push({id:`t${id}`,name:object?.name||`节点 ${id}`,parent:node.father?`t${node.father}`:null,raw:node.raw,mesh:resolved,submesh:0,materials});
  }
  if(nodes.length>MODEL_PREFAB_MAX_NODES)throw new Error(`Prefab 节点数超过 ${MODEL_PREFAB_MAX_NODES} 的轻量预览上限，请选择更小的预制件。`);
  if(builtin)warnings.push(`${builtin} 个组件引用 Unity 内置网格（立方体、球体一类），轻量预览不生成这些形状。`);
  if(missing)warnings.push(`${missing} 个引用不在此素材的读取范围内，或有外部网络地址；请登记完整素材文件夹。`);
  if(hidden)warnings.push(`${hidden} 个节点在预制件里是关闭状态，未加入画面。`);
  if(multiMaterial)warnings.push('一个渲染器带多个子网格材质时，只按第一个材质近似着色。');
  return {draft:{nodes,warnings,meshes,hidden,builtin,missing},warnings:[...warnings]};
}

const TEXTURE_KEYS=['_MainTex','_BaseMap','_MainColorMap','_BaseColorMap','_ColorMap'],COLOR_KEYS=['_Color','_BaseColor','_MainColor','_TintColor'],SHADE_KEYS=['_1st_ShadeColor','_ShadowColor'];
function pairs(value:YamlValue|undefined):Map<string,YamlValue>{
  const out=new Map<string,YamlValue>();
  for(const item of list(value)){if(!item||typeof item!=='object'||Array.isArray(item))continue;for(const [key,child] of Object.entries(item as Record<string,YamlValue>))if(child!==undefined&&!out.has(key))out.set(key,child);}
  return out;
}

/** Only the primary texture and base colour are read; every lighting or outline parameter stays in Unity. */
export function parseMaterial(source:string,index:MetaIndex):{material?:PrefabMaterial;shader?:string;warnings:string[]} {
  const warnings:string[]=[],body=[...yamlDocuments(source).values()].map(document=>document.body?.Material).find(Boolean);
  if(!body)return {warnings:['这个 .mat 里没有可读的材质属性。']};
  const saved=field(body,'m_SavedProperties'),textures=pairs(field(saved,'m_TexEnvs')),floats=pairs(field(saved,'m_Floats')),colors=pairs(field(saved,'m_Colors'));
  const textureKey=TEXTURE_KEYS.find(key=>{const entry=textures.get(key),guid=text(field(entry,'guid')??field(field(entry,'m_Texture'),'guid')).toLowerCase();return guid.length===32&&guid!==ZERO_GUID;});
  const textureEntry=textureKey?textures.get(textureKey):undefined;
  const textureGuid=text(field(field(textureEntry,'m_Texture'),'guid')??field(textureEntry,'guid')).toLowerCase();
  const texture=textureGuid.length===32?index.file(textureGuid):undefined;
  if(textureKey&&!texture)warnings.push(`${textureKey} 指向的贴图不在此素材的读取范围内。`);
  const colorKey=COLOR_KEYS.find(key=>colors.has(key)),color=colorKey?colors.get(colorKey):undefined;
  const mode=number(floats.get('_Mode'),number(floats.get('_SurfaceType'),number(floats.get('_AlphaModulated'),0))),blend=number(floats.get('_SrcBlend'),1),premultiplied=number(floats.get('_ALPHABLEND_ON')===undefined?floats.get('_ALPHAPREMULTIPLY_ON'):floats.get('_ALPHABLEND_ON'),0);
  const material:PrefabMaterial={file:'',name:text(field(body,'m_Name'))||'材质',color:color?[number(field(color,'r'),1),number(field(color,'g'),1),number(field(color,'b'),1)]:[1,1,1],hasColor:!!color,transparent:mode>=2||blend!==1||premultiplied!==0,cutoff:number(floats.get('_Cutoff'),.5),doubleSided:number(floats.get('_Cull'),2)===0};
  if(texture)material.texture=texture;
  const shader=reference(field(body,'m_Shader'));
  return {material,shader:shader?.guid===ZERO_GUID?undefined:shader?.guid,warnings};
}
