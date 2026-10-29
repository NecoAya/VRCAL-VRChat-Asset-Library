import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {TGALoader} from 'three/addons/loaders/TGALoader.js';
import {DDSLoader} from 'three/addons/loaders/DDSLoader.js';
import {modelFormat,resolveModelResource,modelMaterialResourceBase,ModelPreviewResources,type ModelBundle,type ModelSceneBundle} from '../shared/model-preview';
import {ModelSceneLayer,applyModelTransform,checkedModelTransform,modelSceneBounds,summarizeModelScene,type ModelLayer,type ModelTransform,type ModelPart} from './model-scene';
import {buildPrefabScene,prefabMaterial,type PrefabModel} from './prefab-scene';

export type {ModelLayer,ModelTransform,ModelPart} from './model-scene';
export interface ModelStats {meshes:number;triangles:number;animations:number;materials:number;dimensions:string;composite?:boolean}
export type ModelView='front'|'back'|'left'|'right'|'perspective';
interface LoadedLayer {name:ModelLayer;generation:number;resources:ModelPreviewResources;warnings:Set<string>;scene?:ModelSceneLayer;clips:THREE.AnimationClip[];animation?:THREE.AnimationMixer;released:boolean}
const mime=(name:string)=>/\.png$/i.test(name)?'image/png':/\.jpe?g$/i.test(name)?'image/jpeg':/\.webp$/i.test(name)?'image/webp':/\.bmp$/i.test(name)?'image/bmp':'application/octet-stream';
export class ModelViewer {
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(38,1,.01,1000);private renderer:THREE.WebGLRenderer;private controls:OrbitControls;private resize:ResizeObserver;
 private layers=new Map<ModelLayer,LoadedLayer>();private pending=new Set<LoadedLayer>();private generation=0;private composite=false;private wireframe=false;private solid=false;private view:ModelView='perspective';
 private closed=false;private dirty=true;private raf=0;private last=0;private ratio=.75;private grid=new THREE.GridHelper(10,20,0x637082,0x343c49);private light=new THREE.DirectionalLight(0xffffff,2.5);private fill=new THREE.HemisphereLight(0xffffff,0x607080,2.3);private playing=false;private visibility=()=>{this.last=0;this.dirty=true};
 constructor(private host:HTMLElement,private warning:(message:string)=>void){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setClearColor(0x1c222b);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.domElement.setAttribute('aria-label','模型三维画面');this.host.appendChild(this.renderer.domElement);
  this.light.position.set(3,5,4);this.scene.add(this.fill,this.light,this.grid);this.camera.position.set(3,2,4);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=false;this.controls.addEventListener('change',()=>{this.dirty=true});
  this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);this.resize=new ResizeObserver(()=>this.updateSize());this.resize.observe(host);document.addEventListener('visibilitychange',this.visibility);window.addEventListener('blur',this.visibility);window.addEventListener('focus',this.visibility);this.tick();
 }
 private contextLost=(event:Event)=>{event.preventDefault();this.warning('显卡预览上下文已中断，请关闭预览后重开；资料库仍可使用。')};
 private updateSize(){if(this.closed)return;const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)*this.ratio);this.renderer.setSize(width,height,false);this.dirty=true}
 setRatio(value:number){this.ratio=[.25,.5,.75,1].includes(value)?value:.75;this.updateSize()}
 setExposure(value:number){if(Number.isFinite(value))this.renderer.toneMappingExposure=value;this.dirty=true}
 setWireframe(value:boolean){this.wireframe=value;for(const loaded of this.layers.values())loaded.scene?.setWireframe(value);this.dirty=true}
 setSolid(value:boolean){this.solid=value;for(const loaded of this.layers.values())loaded.scene?.setSolid(value);this.dirty=true}
 setPlaying(value:boolean){const primary=this.layers.get('primary');this.playing=!this.composite&&value&&!!primary?.clips.length;if(primary?.animation&&primary.clips[0]){if(this.playing)primary.animation.clipAction(primary.clips[0]).play();else{primary.animation.stopAllAction();primary.animation.setTime(0)}}this.dirty=true}
 setPrimaryTransform(value:ModelTransform){const transform=checkedModelTransform(value),primary=this.layers.get('primary')?.scene;if(primary)applyModelTransform(primary.root,transform);this.dirty=true}
 setLayerVisible(layer:ModelLayer,visible:boolean){if(typeof visible!=='boolean')throw new Error('模型显隐设置无效。');const current=this.layers.get(layer)?.scene;if(current)current.root.visible=visible;this.dirty=true}
 parts(layer:ModelLayer):ModelPart[]{return this.layers.get(layer)?.scene?.parts()||[]}
 setPartVisible(layer:ModelLayer,id:string,visible:boolean){const current=this.layers.get(layer)?.scene;if(!current)throw new Error('此模型尚未加载。');current.setPartVisible(id,visible);this.dirty=true}
 setView(value:ModelView){if(!['front','back','left','right','perspective'].includes(value))throw new Error('预览视角无效。');this.view=value;this.reset()}
 reset(){
  const layers=[...this.layers.values()].flatMap(layer=>layer.scene?[layer.scene]:[]);if(!layers.length||this.closed)return;
  let box:THREE.Box3;try{box=modelSceneBounds(layers,true)}catch{box=modelSceneBounds(layers)}
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),radius=Math.max(size.length()*.5,.001);
  const vertical=THREE.MathUtils.degToRad(this.camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*this.camera.aspect),distance=radius/Math.sin(Math.min(vertical,horizontal))*1.15;
  const directions:Record<ModelView,THREE.Vector3>={front:new THREE.Vector3(0,0,1),back:new THREE.Vector3(0,0,-1),left:new THREE.Vector3(-1,0,0),right:new THREE.Vector3(1,0,0),perspective:new THREE.Vector3(.55,.25,1)};
  this.camera.near=Math.max(distance/10000,.00001);this.camera.far=distance*100;this.camera.position.copy(center).add(directions[this.view].normalize().multiplyScalar(distance));this.camera.up.set(0,1,0);this.camera.updateProjectionMatrix();this.controls.target.copy(center);this.controls.minDistance=radius*.02;this.controls.maxDistance=distance*12;this.controls.update();this.grid.position.set(center.x,box.min.y-radius*.005,center.z);this.grid.scale.setScalar(radius*.6);this.dirty=true;
 }
 /** Stop staged decoding only. The last successful scene remains visible and usable. */
 cancelPending():void {this.generation++;for(const layer of this.pending)this.releaseLayer(layer);this.pending.clear()}
 load(bundle:ModelBundle):Promise<ModelStats>{return this.loadScene({primary:bundle})}
 async loadScene(scene:ModelSceneBundle):Promise<ModelStats>{
  if(this.closed)throw new Error('预览已关闭。');this.cancelPending();const generation=this.generation,staged:LoadedLayer[]=[];
  try{
   for(const name of ['primary','reference'] as const){const bundle=scene[name];if(!bundle){if(name==='primary')throw new Error('模型数据缺失。');continue}
    const layer:LoadedLayer={name,generation,resources:new ModelPreviewResources(),warnings:new Set(),clips:[],released:false};staged.push(layer);this.pending.add(layer);await this.parseLayer(layer,bundle);this.assertPending(layer);
   }
   const models=staged.map(layer=>layer.scene!),summary=summarizeModelScene(models),box=modelSceneBounds(models),size=box.getSize(new THREE.Vector3());for(const model of models){if(!model.meshes.length)throw new Error('所选模型中没有可显示的网格模型。');modelSceneBounds([model])}
   if(this.closed||generation!==this.generation)throw new Error('预览已取消。');
   const previous=this.layers;this.layers=new Map(staged.map(layer=>[layer.name,layer]));this.composite=staged.length>1;this.playing=false;
   for(const layer of staged){this.pending.delete(layer);this.scene.add(layer.scene!.root);layer.scene!.setWireframe(this.wireframe);layer.scene!.setSolid(this.solid);if(!this.composite)layer.animation=new THREE.AnimationMixer(layer.scene!.model)}
   for(const layer of previous.values())this.releaseLayer(layer);this.view='perspective';this.updateSize();this.reset();this.dirty=true;
   for(const layer of staged)if(layer.warnings.size)this.warning([...layer.warnings].join(' '));
   return {...summary,animations:this.composite?0:staged[0].clips.length,dimensions:size.toArray().map(n=>n.toFixed(3)).join(' × '),composite:this.composite};
  }catch(error){for(const layer of staged){this.pending.delete(layer);this.releaseLayer(layer)}throw error}
 }
 private assertPending(layer:LoadedLayer){if(this.closed||layer.released||layer.generation!==this.generation)throw new Error(this.closed?'预览已关闭。':'预览已取消。')}
 private async parseLayer(layer:LoadedLayer,bundle:ModelBundle):Promise<void>{
  const {resources,warnings}=layer,names=bundle.files.map(file=>file.name),urls=new Map<string,string>();
  const active=()=>!this.closed&&!layer.released&&(this.layers.get(layer.name)===layer||this.generation===layer.generation);
  for(const file of bundle.files){const bytes=new Uint8Array(file.bytes),url=resources.trackURL(URL.createObjectURL(new Blob([bytes],{type:mime(file.name)})));urls.set(file.name,url)}
  const manager=new THREE.LoadingManager();manager.addHandler(/\.tga$/i,new TGALoader(manager));manager.addHandler(/\.dds$/i,new DDSLoader(manager));
  manager.setURLModifier(raw=>{
   if(raw.startsWith('blob:'))return resources.trackURL(raw);
   if(/^data:(?:image\/(?:png|jpe?g|webp|bmp)|application\/(?:octet-stream|gltf-buffer));base64,/i.test(raw))return raw;
   const resolved=resolveModelResource(raw,bundle.name,names);if(resolved&&urls.has(resolved))return urls.get(resolved)!;
   warnings.add('部分贴图缺失或引用了外部路径，已显示可用材质。');return 'data:application/octet-stream;base64,';
  });
  manager.onError=()=>{if(active()){warnings.add('部分贴图无法读取，画面可能与 Unity 不同。');this.dirty=true}};manager.onLoad=()=>{if(active()){this.dirty=true;if(warnings.size)this.warning([...warnings].join(' '))}};
  const parse=async(name:string):Promise<{model:THREE.Object3D;clips:THREE.AnimationClip[]}>=>{
   const file=bundle.files.find(item=>item.name===name);if(!file)throw new Error('模型数据缺失。');
   const data=new Uint8Array(file.bytes).buffer,format=modelFormat(name);
   if(format==='fbx'){const model=resources.captureObjectURLs(()=>new FBXLoader(manager).parse(data,''));return {model,clips:model.animations||[]}}
   if(format==='glb'||format==='gltf'){
    const loader=new GLTFLoader(manager);loader.register(parser=>{const textureLoader=parser.textureLoader;if(textureLoader instanceof THREE.ImageBitmapLoader){const load=textureLoader.load.bind(textureLoader);textureLoader.load=(url,onLoad,onProgress,onError)=>load(url,bitmap=>{resources.trackBitmap(bitmap);onLoad?.(bitmap)},onProgress,onError)}return {name:'VRCAL_resource_lifetime'}});
    const result=await loader.parseAsync(format==='gltf'?new TextDecoder().decode(data):data,'');return {model:result.scene,clips:result.animations};
   }
   if(format==='obj'){const loader=new OBJLoader(manager),text=new TextDecoder().decode(data),mtl=text.match(/^mtllib\s+(.+)$/m)?.[1]?.trim(),name2=mtl?resolveModelResource(mtl,name,names):undefined,file2=bundle.files.find(file=>file.name===name2);if(file2){const materials=new MTLLoader(manager).parse(new TextDecoder().decode(file2.bytes),modelMaterialResourceBase(file2.name));materials.preload();loader.setMaterials(materials)}return {model:loader.parse(text),clips:[]}}
   throw new Error('当前文件格式不支持轻量预览。');
  };
  let model:THREE.Object3D;
  if(bundle.prefab){
   const meshes=new Map<string,PrefabModel>();
   for(const file of bundle.files){
    const format=modelFormat(file.name);if(!format||file.name===bundle.name)continue;
    const parsed=await parse(file.name);this.assertPending(layer);
    const parts:THREE.Object3D[]=[];parsed.model.traverse(target=>{if((target as THREE.Mesh).isMesh)parts.push(target)});
    meshes.set(file.name,{whole:parsed.model,parts});
   }
   const materials=new Map<string,THREE.Material>(),textureLoader=new THREE.TextureLoader(manager);
   for(const definition of bundle.prefab.materials){
    let texture:THREE.Texture|undefined;
    const failed=()=>{if(active()){warnings.add('部分贴图无法读取，画面可能与 Unity 不同。');this.dirty=true}};
    if(definition.texture)texture=textureLoader.load(definition.texture,()=>{this.dirty=true},undefined,failed);
    materials.set(definition.file,prefabMaterial(definition,texture));
   }
   const assembly=buildPrefabScene(bundle.prefab,meshes,materials);this.assertPending(layer);
   if(assembly.missing)warnings.add(`${assembly.missing} 个引用的模型不在此素材的读取范围内，画面可能不完整。`);
   if(assembly.shared)warnings.add(`${assembly.shared} 个模型文件被多个节点共用，这些网格按出现顺序分配，与 Unity 内的对应关系可能不同。`);
   model=assembly.root;
  }
  else{const parsed=await parse(bundle.name);this.assertPending(layer);model=parsed.model;layer.clips=parsed.clips;}
  layer.scene=new ModelSceneLayer(layer.name,model);if(layer.released){layer.scene.dispose();throw new Error(this.closed?'预览已关闭。':'预览已取消。')}this.assertPending(layer);
 }
 private releaseLayer(layer:LoadedLayer){if(layer.released)return;layer.released=true;layer.resources.dispose();layer.animation?.stopAllAction();if(layer.scene){layer.animation?.uncacheRoot(layer.scene.model);layer.scene.dispose()}}
 private tick=()=>{if(this.closed)return;this.raf=requestAnimationFrame(this.tick);const now=performance.now();if(document.hidden||!document.hasFocus()){this.last=now;return}if(now-this.last<1000/30)return;const delta=Math.min((now-this.last)/1000,.1);this.last=now;if(this.playing&&!this.composite){this.layers.get('primary')?.animation?.update(delta);this.dirty=true}if(this.dirty){this.renderer.render(this.scene,this.camera);this.renderer.domElement.dataset.previewFrame=String(Number(this.renderer.domElement.dataset.previewFrame||0)+1);this.dirty=false}};
 dispose(){if(this.closed)return;this.closed=true;this.cancelPending();cancelAnimationFrame(this.raf);this.resize.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.visibility);window.removeEventListener('focus',this.visibility);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.controls.dispose();for(const layer of this.layers.values())this.releaseLayer(layer);this.layers.clear();this.grid.geometry.dispose();for(const material of Array.isArray(this.grid.material)?this.grid.material:[this.grid.material])material.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove()}
}
