const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let THREE;before(async()=>{THREE=await import('three')});
const source=path.resolve(__dirname,'../src/renderer/prefab-scene.ts');
function helpers(){assert(fs.existsSync(source),'the prefab scene builder must exist');const loaded=new Module(source,module);loaded.filename=source;loaded.paths=Module._nodeModulePaths(path.dirname(source));const normalRequire=loaded.require.bind(loaded);loaded.require=name=>name==='three'?THREE:normalRequire(name);loaded._compile(ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,source);return loaded.exports}
const node=(id,extra={})=>({id,name:id,parent:null,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},submesh:0,materials:[],...extra});
const definition=(extra={})=>({file:'Fabric.mat',name:'Fabric',color:[1,1,1],hasColor:false,transparent:false,cutoff:.5,doubleSided:false,...extra});
const mesh=(name)=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'from file'}));
const model=(...children)=>{const root=new THREE.Group();root.name='FBX root';root.position.set(0,0.5,0);for(const child of children){child.position.set(0.25,0,0);root.add(child)}return {whole:root,parts:children}};

test('a prefab node with an identity transform lands exactly where opening that file alone puts it',()=>{
 const {buildPrefabScene}=helpers(),parsed=model(mesh('a')),standalone=parsed.whole;
 const scene={nodes:[node('n1',{mesh:'model.fbx'})],materials:[],warnings:[]};
 const built=buildPrefabScene(scene,new Map([['model.fbx',parsed]]),new Map());
 standalone.updateWorldMatrix(true,true);built.root.updateMatrixWorld(true);
 const before=new THREE.Box3().setFromObject(standalone),after=new THREE.Box3().setFromObject(built.root);
 assert.ok(Math.abs(before.max.x-after.max.x)<1e-9&&Math.abs(before.min.y-after.min.y)<1e-9,before.min.toArray().join()+' vs '+after.min.toArray().join());
 assert.equal(built.attached,1);assert.equal(built.shared,0);
 assert.notEqual(built.root.children[0].children[0],parsed.whole,'a node never reparents the parse result');
 assert.equal(built.root.children[0].children[0].parent.children.length,1);
});

test('parent nodes keep Unity hierarchy and mirrored positions while materials apply to every mesh',()=>{
 const {buildPrefabScene,prefabMaterial}=helpers();
 const scene={nodes:[node('root'),node('sleeve',{parent:'root',mesh:'model.fbx',materials:['Fabric.mat'],transform:{position:[0.1,0.2,-0.3],rotation:[0,0,0.7071068,0.7071068],scale:[2,2,2]}}),node('lost',{parent:'missing',mesh:'model.fbx'})],materials:[],warnings:[]};
 const replacement=new THREE.MeshStandardMaterial({name:'Fabric'});
 const built=buildPrefabScene(scene,new Map([['model.fbx',model(mesh('a'))]]),new Map([['Fabric.mat',replacement]]));
 assert.equal(built.root.children.length,2,'a node whose parent id is absent hangs from the scene root instead of vanishing');
 const byName=new Map(built.root.children.map(child=>[child.name,child])),sleeve=byName.get('root').children[0];
 assert.ok(byName.has('root')&&byName.has('lost')&&!byName.has('sleeve'),'nested nodes hang from their own parent');
 assert.deepEqual(sleeve.position.toArray(),[0.1,0.2,-0.3]);assert.deepEqual(sleeve.scale.toArray(),[2,2,2]);
 assert.equal(byName.get('root').name,'root');
 const dressed=[];sleeve.children[0].traverse(target=>{if(target.isMesh)dressed.push(target)});
 assert.equal(dressed.length,1);assert.equal(dressed[0].material,replacement,'the material reaches every mesh inside the attached file');
 const bare=prefabMaterial(definition({hasColor:true,color:[0.2,0.4,0.6],doubleSided:true,transparent:true,cutoff:.3}),undefined);
 assert.deepEqual(bare.color.toArray().map(v=>Math.round(v*100)/100),[0.2,0.4,0.6]);
 assert.equal(bare.side,THREE.DoubleSide);assert.equal(bare.transparent,true);assert.equal(bare.depthWrite,false);assert.equal(bare.alphaTest,.3);
 assert.equal(prefabMaterial(definition({transparent:true,cutoff:0}),undefined).alphaTest,0);
});

test('one file behind several nodes is shared in node order and says so',()=>{
 const {buildPrefabScene}=helpers(),parts=[mesh('left'),mesh('right')],first=parts[0].uuid;
 const scene={nodes:[node('a',{mesh:'pair.fbx'}),node('b',{mesh:'pair.fbx'})],materials:[],warnings:[]};
 const built=buildPrefabScene(scene,new Map([['pair.fbx',{whole:model(parts[0],parts[1]).whole,parts}]]),new Map());
 assert.equal(built.attached,2);assert.equal(built.shared,0,'an exact mesh count needs no warning');
 const attached=built.root.children.map(child=>child.children[0]);
 assert.notEqual(attached[0].uuid,attached[1].uuid);assert.equal(attached[0].uuid!==first,true);
 assert.notEqual(attached[0].parent,built.root,'meshes hang under their own node group');
 const mismatched=buildPrefabScene({nodes:[node('a',{mesh:'pair.fbx'}),node('b',{mesh:'pair.fbx'}),node('c',{mesh:'pair.fbx'})],materials:[],warnings:[]},new Map([['pair.fbx',{whole:model(parts[0],parts[1]).whole,parts}]]),new Map());
 assert.equal(mismatched.shared,1,'a node count that does not match the mesh count is reported');
});

test('unreadable references are counted and a scene with nothing to draw fails instead of staying blank',()=>{
 const {buildPrefabScene}=helpers(),available=new Map([['ok.fbx',{whole:mesh('ok'),parts:[mesh('ok')]}]]);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'gone.fbx'}),node('container'),node('b',{mesh:'ok.fbx'})],materials:[],warnings:[]},available,new Map());
 assert.equal(built.missing,1);assert.equal(built.attached,1);assert.equal(built.root.children.length,3,'container nodes stay in the tree');
 assert.throws(()=>buildPrefabScene({nodes:[node('a',{mesh:'gone.fbx'})],materials:[],warnings:[]},new Map(),new Map()),/没有可显示的网格/);
});
