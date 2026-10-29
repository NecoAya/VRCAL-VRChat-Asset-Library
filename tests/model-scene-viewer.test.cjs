// Real Three parsers/scene objects; only the GPU, canvas host and orbit input are replaced.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let THREE,ModelViewer;const globals=new Map();
function replace(name,value){globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true})}
before(async()=>{
 THREE=await import('three');
 class Renderer{constructor(){this.domElement={setAttribute(){},addEventListener(){},removeEventListener(){},remove(){},dataset:{}}}setClearColor(){}setPixelRatio(){}setSize(){}render(){}dispose(){}forceContextLoss(){}}
 class Controls{constructor(){this.target=new THREE.Vector3()}addEventListener(){}update(){}dispose(){}}
 replace('ResizeObserver',class{observe(){}disconnect(){}});replace('document',{hidden:false,hasFocus:()=>true,addEventListener(){},removeEventListener(){}});replace('window',{addEventListener(){},removeEventListener(){}});replace('requestAnimationFrame',()=>1);replace('cancelAnimationFrame',()=>{});replace('devicePixelRatio',1);
 const modules={'three':{...THREE,WebGLRenderer:Renderer},'three/addons/controls/OrbitControls.js':{OrbitControls:Controls}};
 for(const name of ['FBXLoader','GLTFLoader','OBJLoader','MTLLoader','TGALoader','DDSLoader'])modules[`three/addons/loaders/${name}.js`]=await import(`three/addons/loaders/${name}.js`);
 function compile(relative){const file=path.resolve(__dirname,'../src/renderer',relative),loaded=new Module(file,module);loaded.filename=file;loaded.paths=Module._nodeModulePaths(path.dirname(file));const require=loaded.require.bind(loaded);loaded.require=name=>/^\.\/(model-scene|prefab-scene)$/.test(name)?compile(name.slice(2)+'.ts'):name==='../shared/model-preview'?require(path.resolve(__dirname,'../dist/main/shared/model-preview')):modules[name]||require(name);loaded._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return loaded.exports}
 ModelViewer=compile('model-viewer.ts').ModelViewer;
});
after(()=>{for(const [name,descriptor]of globals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]});
const bundle=(name,height=1)=>({name:'same.obj',files:[{name:'same.obj',bytes:new TextEncoder().encode(`o ${name}\nv 0 0 0\nv 1 0 0\nv 0 ${height} 0\nf 1 2 3`)}],warnings:[]});
const viewer=()=>new ModelViewer({clientWidth:800,clientHeight:600,appendChild(){}},()=>{});
function meshes(v){const found=[];v.scene.traverse(n=>{if(n.isMesh)found.push(n)});return found}

test('scene loading isolates equal resource names, keeps original sizes and supports both layer controls',async()=>{
 const v=viewer();try{assert.equal(typeof v.loadScene,'function','the viewer must load both layers in one scene');const stats=await v.loadScene({primary:bundle('Dress',1),reference:bundle('Avatar',2)});assert.equal(stats.composite,true);assert.equal(stats.triangles,2);assert.equal(meshes(v).length,2);assert(v.parts('primary')[0].name.includes('Dress'));assert(v.parts('reference')[0].name.includes('Avatar'));
  const objects=meshes(v);assert.deepEqual(objects.map(m=>m.scale.y),[1,1]);v.setPrimaryTransform({scale:2,x:3,y:0,z:0,yaw:90});assert.equal(objects[0].scale.y,1);assert.equal(objects[1].parent.scale.y,1);v.setLayerVisible('reference',false);assert.equal(objects[1].parent.parent.visible,false);v.setPartVisible('primary',v.parts('primary')[0].id,false);assert.equal(objects[0].visible,false);assert.equal(objects[1].visible,true);
  v.setView('front');assert(v.camera.position.z>v.controls.target.z);v.setView('back');assert(v.camera.position.z<v.controls.target.z);v.setView('left');assert(v.camera.position.x<v.controls.target.x);v.setView('right');assert(v.camera.position.x>v.controls.target.x);v.setPlaying(true);assert.equal(v.playing,false);
 }finally{v.dispose()}
});

test('using load again on the same viewer replaces and releases the old scene without losing compatibility',async()=>{
 const v=viewer();try{await v.load(bundle('Old'));const old=meshes(v)[0];let freed=0;old.geometry.addEventListener('dispose',()=>freed++);await v.load(bundle('New'));assert.equal(meshes(v).length,1);assert.equal(freed,1);assert(meshes(v)[0].name.includes('New'));assert.equal(old.parent.parent,null);
 }finally{v.dispose()}
});

test('invalid replacement preserves the previous valid model and late GLTF decoding cannot replace a newer scene',async()=>{
 const v=viewer();try{assert.equal(typeof v.loadScene,'function');await v.load(bundle('Keep'));await assert.rejects(v.loadScene({primary:{name:'bad.obj',files:[{name:'bad.obj',bytes:new TextEncoder().encode('# empty model')}],warnings:[]}}),/网格/);assert(meshes(v)[0].name.includes('Keep'));
  const json=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Late empty scene'}]});const late=v.loadScene({primary:{name:'late.gltf',files:[{name:'late.gltf',bytes:new TextEncoder().encode(json)}],warnings:[]}});const check=assert.rejects(late,/取消|关闭/);await v.load(bundle('Current'));await check;assert.equal(meshes(v).length,1);assert(meshes(v)[0].name.includes('Current'));
 }finally{v.dispose()}
});

test('cancelPending keeps the last good scene and dispose rejects late decodes without reviving a canvas',async()=>{
 const v=viewer();try{assert.equal(typeof v.cancelPending,'function');await v.load(bundle('Keep'));const json=JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Late empty scene'}]}),lateBundle={name:'late.gltf',files:[{name:'late.gltf',bytes:new TextEncoder().encode(json)}],warnings:[]};
  const pending=v.loadScene({primary:lateBundle}),check=assert.rejects(pending,/取消|关闭/);v.cancelPending();await check;assert(meshes(v)[0].name.includes('Keep'));
  const closed=v.loadScene({primary:lateBundle}),closedCheck=assert.rejects(closed,/取消|关闭/);v.dispose();await closedCheck;assert.equal(meshes(v).length,0);
 }finally{v.dispose()}
});

test('a small OBJ mesh cannot admit extra lines or points and invalid replacement preserves the old frame',async()=>{
 const v=viewer();try{await v.load(bundle('Keep'));const baseline=[];v.scene.traverse(node=>{if(node.isLine||node.isPoints||node.isSprite)baseline.push(node)});
  for(const primitive of ['l 1 2','p 1 2']){
   const bytes=new TextEncoder().encode('o SmallMesh\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\no Unsupported\n'+primitive);
   await assert.rejects(v.loadScene({primary:{name:'mixed.obj',files:[{name:'mixed.obj',bytes}],warnings:[]}}),/线|点|网格/);assert.equal(meshes(v).length,1);assert(meshes(v)[0].name.includes('Keep'));
   const unsupported=[];v.scene.traverse(node=>{if(node.isLine||node.isPoints||node.isSprite)unsupported.push(node)});assert.deepEqual(unsupported,baseline);
  }
 }finally{v.dispose()}
});
