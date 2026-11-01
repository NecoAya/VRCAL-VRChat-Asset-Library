const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let THREE,SkeletonUtils;before(async()=>{[THREE,SkeletonUtils]=await Promise.all([import('three'),import('three/addons/utils/SkeletonUtils.js')])});
const source=path.resolve(__dirname,'../src/renderer/prefab-scene.ts');
function helpers(){assert(fs.existsSync(source),'the prefab scene builder must exist');const loaded=new Module(source,module);loaded.filename=source;loaded.paths=Module._nodeModulePaths(path.dirname(source));const normalRequire=loaded.require.bind(loaded);loaded.require=name=>name==='three'?THREE:name==='three/addons/utils/SkeletonUtils.js'?SkeletonUtils:normalRequire(name);loaded._compile(ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,source);return loaded.exports}
const node=(id,extra={})=>({id,name:id,parent:null,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},submesh:0,materials:[],...extra});
const definition=(extra={})=>({file:'Fabric.mat',name:'Fabric',color:[1,1,1],hasColor:false,transparent:false,cutoff:.5,doubleSided:false,...extra});
const mesh=(name)=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'from file'}));
const model=(...children)=>{const root=new THREE.Group();root.name='FBX root';root.position.set(0,0.5,0);for(const child of children){child.position.set(0.25,0,0);root.add(child)}return {whole:root,parts:children}};
const drawnMeshes=root=>{const meshes=[];root.traverse(target=>{if(target.isMesh)meshes.push(target)});return meshes};
const vertexWorld=(mesh,index=0)=>mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).toArray();
function closeVector(actual,expected){assert.equal(actual.length,expected.length);actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-8,`${actual.join()} vs ${expected.join()}`))}
function skinnedModel(points=[[1,0,0]]){
 const whole=new THREE.Group(),rig=new THREE.Group(),bone=new THREE.Bone();whole.add(rig);rig.add(bone);
 const parts=points.map(point=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(point,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0],4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0],4));const part=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());whole.add(part);return part});
 whole.updateMatrixWorld(true);const skeleton=new THREE.Skeleton([bone]);for(const part of parts)part.bind(skeleton);
 return {whole,parts,bone,skeleton};
}

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
 assert.equal(built.attached,2);assert.equal(built.shared,1,'equal counts still cannot verify Unity fileID-to-mesh matching');
 const attached=built.root.children.map(child=>child.children[0]);
 assert.notEqual(attached[0].uuid,attached[1].uuid);assert.equal(attached[0].uuid!==first,true);
 assert.notEqual(attached[0].parent,built.root,'meshes hang under their own node group');
 const mismatched=buildPrefabScene({nodes:[node('a',{mesh:'pair.fbx'}),node('b',{mesh:'pair.fbx'}),node('c',{mesh:'pair.fbx'})],materials:[],warnings:[]},new Map([['pair.fbx',{whole:model(parts[0],parts[1]).whole,parts}]]),new Map());
 assert.equal(mismatched.shared,1,'a node count that does not match the mesh count is reported');
});

test('prefab base-color textures use sRGB decoding without rewriting image bytes',()=>{
 const {prefabMaterial}=helpers(),pixels=new Uint8Array([128,64,32,255]),texture=new THREE.DataTexture(pixels,1,1,THREE.RGBAFormat),image=texture.image;
 const material=prefabMaterial(definition({texture:'Fabric.png'}),texture);
 assert.equal(material.map,texture);assert.equal(material.map.colorSpace,THREE.SRGBColorSpace,'color maps must decode sRGB samples before linear lighting');
 assert.equal(texture.image,image);assert.equal(texture.image.data,pixels);assert.deepEqual([...pixels],[128,64,32,255]);
 material.dispose();texture.dispose();
});

test('a cloned skinned file follows the prefab transform with its own complete skeleton',()=>{
 const {buildPrefabScene}=helpers(),parsed=skinnedModel();
 const built=buildPrefabScene({nodes:[node('skin',{mesh:'skin.fbx'})]},new Map([['skin.fbx',parsed]]),new Map());
 built.root.position.x=10;built.root.updateMatrixWorld(true);
 const [attached]=drawnMeshes(built.root);closeVector(vertexWorld(attached),[11,0,0]);
 assert.notEqual(attached.skeleton,parsed.skeleton);assert.notEqual(attached.skeleton.bones[0],parsed.bone);
 assert.equal(attached.geometry,parsed.parts[0].geometry,'cloning must not duplicate the vertex buffers');
 assert.equal(parsed.parts[0].parent,parsed.whole);assert.equal(parsed.bone.parent.parent,parsed.whole);
 parsed.bone.position.x=50;parsed.whole.updateMatrixWorld(true);built.root.updateMatrixWorld(true);
 closeVector(vertexWorld(attached),[11,0,0]);
});

test('repeated references to a single skinned mesh have independent bones and placement',()=>{
 const {buildPrefabScene}=helpers(),parsed=skinnedModel(),scene={nodes:[node('a',{mesh:'skin.fbx',transform:{position:[10,0,0],rotation:[0,0,0,1],scale:[1,1,1]}}),node('b',{mesh:'skin.fbx',transform:{position:[-5,0,0],rotation:[0,0,0,1],scale:[1,1,1]}})]};
 const built=buildPrefabScene(scene,new Map([['skin.fbx',parsed]]),new Map());built.root.updateMatrixWorld(true);
 const [first,second]=drawnMeshes(built.root);closeVector(vertexWorld(first),[11,0,0]);closeVector(vertexWorld(second),[-4,0,0]);
 assert.notEqual(first.skeleton,second.skeleton);assert.notEqual(first.skeleton.bones[0],second.skeleton.bones[0]);
 assert.equal(first.geometry,second.geometry,'repeated nodes share the immutable geometry');
 first.skeleton.bones[0].position.y=3;built.root.updateMatrixWorld(true);
 closeVector(vertexWorld(first),[11,3,0]);closeVector(vertexWorld(second),[-4,0,0]);closeVector(vertexWorld(parsed.parts[0]),[1,0,0]);
});

test('splitting a file keeps its root scale and translation for each selected mesh',()=>{
 const {buildPrefabScene}=helpers(),whole=new THREE.Group(),parts=[mesh('a'),mesh('b')];whole.scale.setScalar(.01);whole.position.y=2;
 parts[0].position.x=100;parts[1].position.x=-100;whole.add(...parts);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'pair.fbx'}),node('b',{mesh:'pair.fbx'})]},new Map([['pair.fbx',{whole,parts}]]),new Map());built.root.updateMatrixWorld(true);
 const attached=built.root.children.map(group=>drawnMeshes(group));assert.deepEqual(attached.map(parts=>parts.length),[1,1]);
 closeVector(attached[0][0].getWorldPosition(new THREE.Vector3()).toArray(),[1,2,0]);closeVector(attached[1][0].getWorldPosition(new THREE.Vector3()).toArray(),[-1,2,0]);
 assert.equal(parts[0].parent,whole);assert.equal(parts[1].parent,whole);
});

test('split parts retain nested rotations and nonuniform scales without losing shear',()=>{
 const {buildPrefabScene}=helpers(),whole=new THREE.Group(),outer=new THREE.Group(),inner=new THREE.Group(),parts=[mesh('a'),mesh('b')];
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));parts[0].geometry=geometry;parts[1].geometry=geometry;
 whole.position.y=2;whole.scale.set(2,3,4);outer.position.x=1;outer.scale.set(3,1,2);outer.rotation.z=Math.PI/4;inner.position.y=1;inner.rotation.z=-Math.PI/4;parts[0].position.x=1;parts[1].position.y=2;
 whole.add(outer);outer.add(inner,parts[1]);inner.add(parts[0]);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'nested.fbx'}),node('b',{mesh:'nested.fbx',transform:{position:[5,0,0],rotation:[0,0,0,1],scale:[1,1,1]}})]},new Map([['nested.fbx',{whole,parts}]]),new Map());built.root.updateMatrixWorld(true);
 const [first,second]=drawnMeshes(built.root),c=Math.SQRT1_2;
 closeVector(vertexWorld(first),[6-2*c,5+3*c,0]);closeVector(vertexWorld(first,1),[10-2*c,8+3*c,0]);closeVector(vertexWorld(first,2),[8-2*c,11+3*c,0]);closeVector(vertexWorld(second),[7-4*c,2+6*c,0]);
 assert.equal(first.geometry,geometry);assert.equal(second.geometry,geometry);
});

test('split skinned parts retain the static pose and sibling rig under each prefab node',()=>{
 const {buildPrefabScene}=helpers(),parsed=skinnedModel([[1,0,0],[0,1,0]]),replacement=new THREE.MeshStandardMaterial({name:'override'});
 parsed.bone.rotation.z=Math.PI/2;parsed.bone.position.y=2;parsed.whole.scale.setScalar(.01);parsed.whole.position.y=2;parsed.whole.updateMatrixWorld(true);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'rig.fbx',materials:['override'],transform:{position:[10,0,0],rotation:[0,0,0,1],scale:[1,1,1]}}),node('b',{mesh:'rig.fbx',transform:{position:[-4,0,0],rotation:[0,0,0,1],scale:[1,1,1]}})]},new Map([['rig.fbx',parsed]]),new Map([['override',replacement]]));built.root.updateMatrixWorld(true);
 const attachments=built.root.children.map(group=>drawnMeshes(group));assert.deepEqual(attachments.map(parts=>parts.length),[1,1]);
 const [first,second]=attachments.map(parts=>parts[0]);closeVector(vertexWorld(first),[10,2.03,0]);closeVector(vertexWorld(second),[-4.01,2.02,0]);
 assert.equal(first.material,replacement);assert.equal(second.material,parsed.parts[1].material);assert.notEqual(parsed.parts[0].material,replacement);
 assert.notEqual(first.skeleton.bones[0],second.skeleton.bones[0]);assert.notEqual(first.skeleton.bones[0],parsed.bone);
});

test('a mesh excluded from a split still provides the transform for its selected mesh descendant',()=>{
 const {buildPrefabScene}=helpers(),whole=new THREE.Group(),outer=mesh('outer'),inner=mesh('inner');whole.scale.setScalar(.01);whole.position.y=2;outer.position.x=100;inner.position.y=100;whole.add(outer);outer.add(inner);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'nested.fbx'}),node('b',{mesh:'nested.fbx'})]},new Map([['nested.fbx',{whole,parts:[outer,inner]}]]),new Map());built.root.updateMatrixWorld(true);
 const attachments=built.root.children.map(group=>drawnMeshes(group));assert.deepEqual(attachments.map(parts=>parts.length),[1,1]);
 closeVector(attachments[0][0].getWorldPosition(new THREE.Vector3()).toArray(),[1,2,0]);closeVector(attachments[1][0].getWorldPosition(new THREE.Vector3()).toArray(),[1,3,0]);
});

test('split nodes do not retain unrelated file branches for every mesh reference',()=>{
 const {buildPrefabScene}=helpers(),whole=new THREE.Group(),parts=[mesh('a'),mesh('b')];
 for(const part of parts){const holder=new THREE.Group();holder.add(part);whole.add(holder)}
 const unrelated=new THREE.Group();whole.add(unrelated);for(let index=0;index<100;index++)unrelated.add(new THREE.Group());
 const built=buildPrefabScene({nodes:[node('a',{mesh:'pair.fbx'}),node('b',{mesh:'pair.fbx'})]},new Map([['pair.fbx',{whole,parts}]]),new Map());
 const retained=built.root.children.map(group=>{let count=0;group.children[0].traverse(()=>count++);return count});
 assert.deepEqual(retained,[3,3],'each attachment needs only its file root, mesh holder and mesh');
 assert.equal(unrelated.children.length,100,'pruning clones never edits the imported hierarchy');
});

test('unreadable references are counted and a scene with nothing to draw fails instead of staying blank',()=>{
 const {buildPrefabScene}=helpers(),available=new Map([['ok.fbx',{whole:mesh('ok'),parts:[mesh('ok')]}]]);
 const built=buildPrefabScene({nodes:[node('a',{mesh:'gone.fbx'}),node('container'),node('b',{mesh:'ok.fbx'})],materials:[],warnings:[]},available,new Map());
 assert.equal(built.missing,1);assert.equal(built.attached,1);assert.equal(built.root.children.length,3,'container nodes stay in the tree');
 assert.throws(()=>buildPrefabScene({nodes:[node('a',{mesh:'gone.fbx'})],materials:[],warnings:[]},new Map(),new Map()),/没有可显示的网格/);
});
