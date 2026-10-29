import * as THREE from 'three';
import type {PrefabScene} from '../shared/model-preview';

export interface PrefabAssembly {root:THREE.Group;attached:number;missing:number;shared:number}
export type PrefabModel={whole:THREE.Object3D;parts:THREE.Object3D[]};

/**
 * Assembles a Prefab scene from already parsed model files. Transforms arrive mirrored for the
 * viewer's right-handed scene, so a node with an identity transform lands exactly where opening
 * that model file alone would put it: the file keeps its own inner transform and the node adds
 * Unity's Transform on top, which is the same composition Unity performs.
 *
 * A file referenced by one node is attached whole. A file referenced by several nodes is split
 * mesh by mesh in node order, because Unity points at meshes by an internal id the viewer cannot
 * read back. Every attach clones, so the original parse result is never reparented.
 */
export function buildPrefabScene(scene:PrefabScene,meshes:Map<string,PrefabModel>,materials:Map<string,THREE.Material>):PrefabAssembly {
  const root=new THREE.Group(),groups=new Map<string,THREE.Group>(),references=new Map<string,number>();
  root.name='VRCAL prefab';
  for(const node of scene.nodes){const group=new THREE.Group();group.name=node.name.slice(0,160);groups.set(node.id,group);if(node.mesh)references.set(node.mesh,(references.get(node.mesh)??0)+1)}
  const next=new Map<string,number>(),sharedFiles=new Set<string>();let attached=0,missing=0;
  for(const node of scene.nodes){
   const group=groups.get(node.id)!;
   group.position.set(node.transform.position[0],node.transform.position[1],node.transform.position[2]);
   group.quaternion.set(node.transform.rotation[0],node.transform.rotation[1],node.transform.rotation[2],node.transform.rotation[3]);
   group.scale.set(node.transform.scale[0],node.transform.scale[1],node.transform.scale[2]);
   const parent=node.parent?groups.get(node.parent):undefined;
   (parent??root).add(group);
   if(!node.mesh)continue;
   const found=meshes.get(node.mesh);if(!found||(!found.whole&&!found.parts.length)){missing++;continue}
   const count=references.get(node.mesh)??1,splits=count>1&&found.parts.length>=2;
   const take=!splits?(found.whole??found.parts[0]):found.parts[Math.min(next.get(node.mesh)??0,found.parts.length-1)];
   if(count>1&&found.parts.length!==count)sharedFiles.add(node.mesh);
   if(splits)next.set(node.mesh,(next.get(node.mesh)??0)+1);
   const source=take,body=source.clone(true);
   const material=node.materials.map(file=>materials.get(file)).find(Boolean);
   if(material)body.traverse(target=>{if((target as THREE.Mesh).isMesh)(target as THREE.Mesh).material=material});
   group.add(body);attached++;
  }
  if(!attached)throw new Error('Prefab 里没有可显示的网格，引用的模型可能不在此素材的读取范围内。');
  return {root,attached,missing,shared:sharedFiles.size};
}

/** glTF/PBR names stay readable without pretending Unity's own shader ran here. */
export function prefabMaterial(definition:{name:string;color:[number,number,number];hasColor:boolean;texture?:string;transparent:boolean;cutoff:number;doubleSided:boolean},texture:THREE.Texture|undefined):THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({name:definition.name.slice(0,120),roughness:.75,metalness:0,map:texture,side:definition.doubleSided?THREE.DoubleSide:THREE.FrontSide});
  if(definition.hasColor)material.color.setRGB(definition.color[0],definition.color[1],definition.color[2]);
  if(definition.transparent){material.transparent=true;material.depthWrite=false;if(definition.cutoff>0&&definition.cutoff<1)material.alphaTest=definition.cutoff}
  return material;
}
