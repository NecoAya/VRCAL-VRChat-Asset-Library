const {test,before}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {yamlDocuments}=require('../dist/main/main/unity-yaml');
const {buildMetaIndex,parsePrefab,parseMaterial,mirrorPrefabTransform}=require('../dist/main/main/unity-prefab');
let THREE,buildPrefabScene;before(async()=>{THREE=await import('three');buildPrefabScene=sceneBuilder()});

const MESH_GUID='01234567890123456789012345678901',OTHER_MESH_GUID='01234567890123456789012345678902',TEX_GUID='00000000000000000000000000000001';
const index=buildMetaIndex([
 {name:'first.fbx.meta',text:`guid: ${MESH_GUID}\n`},
 {name:'second.fbx.meta',text:`guid: ${OTHER_MESH_GUID}\n`},
 {name:'fabric.png.meta',text:`guid: ${TEX_GUID}\n`}
]);

function prefabNode({objectId,transformId,name,active=1,parent='0',filterId,meshGuid=MESH_GUID}){
 return `--- !u!1 &${objectId}\nGameObject:\n  m_Name: ${name}\n  m_IsActive: ${active}\n--- !u!4 &${transformId}\nTransform:\n  m_GameObject: {fileID: ${objectId}}\n  m_Father: {fileID: ${parent}}\n  m_LocalPosition: {x: 1, y: 2, z: 3}\n  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}\n  m_LocalScale: {x: 1, y: 1, z: 1}\n${filterId?`--- !u!33 &${filterId}\nMeshFilter:\n  m_GameObject: {fileID: ${objectId}}\n  m_Mesh: {fileID: 4300000, guid: ${meshGuid}, type: 3}\n`:''}`;
}

test('Unity document IDs and flow/block fileID references retain signed 64-bit precision',()=>{
 const ids=['9223372036854775806','9223372036854775807','-9223372036854775808','-9223372036854775807'];
 const documents=yamlDocuments(ids.map((id,i)=>`--- !u!4 &${id}\nTransform:\n  m_GameObject: {fileID: ${ids[(i+1)%ids.length]}}\n  m_Father:\n    fileID: ${id}\n  m_LocalPosition: {x: 1.25, y: -2, z: 3}\n`).join(''));
 assert.deepEqual([...documents.keys()],ids,'adjacent signed IDs must remain distinct Map keys');
 for(const [i,id] of ids.entries()){
  const document=documents.get(id);
  assert.equal(document.fileId,id);
  assert.equal(document.body.Transform.m_GameObject.fileID,ids[(i+1)%ids.length]);
  assert.equal(document.body.Transform.m_Father.fileID,id);
  assert.deepEqual(document.body.Transform.m_LocalPosition,{x:1.25,y:-2,z:3});
 }
});

test('numeric-only GUIDs retain leading zeros in flow and block mappings',()=>{
 const documents=yamlDocuments(`--- !u!33 &1\nMeshFilter:\n  m_Mesh: {fileID: 4300000, guid: ${MESH_GUID}, type: 3}\n--- !u!33 &2\nMeshFilter:\n  m_Mesh:\n    fileID: 4300001\n    guid: ${TEX_GUID}\n`);
 const bodies=[...documents.values()].map(document=>document.body.MeshFilter);
 assert.equal(bodies[0].m_Mesh.guid,MESH_GUID);
 assert.equal(bodies[1].m_Mesh.guid,TEX_GUID);
 assert.equal(bodies[0].m_Mesh.fileID,'4300000');
 assert.equal(bodies[1].m_Mesh.fileID,'4300001');
});

test('prefab ownership, parent links and mesh references keep adjacent long IDs distinct',()=>{
 const source=prefabNode({objectId:'9223372036854775806',transformId:'-9223372036854775808',name:'Parent',filterId:'8000000000000000001'})+
  prefabNode({objectId:'9223372036854775807',transformId:'-9223372036854775807',name:'Child',parent:'-9223372036854775808',filterId:'8000000000000000002',meshGuid:OTHER_MESH_GUID});
 const {draft,warnings}=parsePrefab(source,index);
 assert.ok(draft);
 assert.deepEqual(draft.nodes.map(({id,name,parent,mesh})=>({id,name,parent,mesh})),[
  {id:'t-9223372036854775808',name:'Parent',parent:null,mesh:'first.fbx'},
  {id:'t-9223372036854775807',name:'Child',parent:'t-9223372036854775808',mesh:'second.fbx'}
 ]);
 assert.deepEqual([...draft.meshes],['first.fbx','second.fbx']);
 assert.deepEqual(warnings,[]);
});

test('materials resolve numeric-only texture GUIDs instead of treating them as built-in assets',()=>{
 const {material,warnings}=parseMaterial(`--- !u!21 &2100000\nMaterial:\n  m_Name: Fabric\n  m_SavedProperties:\n    m_TexEnvs:\n    - _MainTex:\n        m_Texture: {fileID: 2800000, guid: ${TEX_GUID}, type: 3}\n`,index);
 assert.equal(material.texture,'fabric.png');
 assert.deepEqual(warnings,[]);
});

test('an inactive ancestor hides active children and grandchildren even when serialized later',()=>{
 const source=prefabNode({objectId:'3',transformId:'103',name:'Grandchild',parent:'102',filterId:'203'})+
  prefabNode({objectId:'2',transformId:'102',name:'Child',parent:'101',filterId:'202'})+
  prefabNode({objectId:'1',transformId:'101',name:'Inactive parent',active:0,filterId:'201'})+
  prefabNode({objectId:'4',transformId:'104',name:'Visible sibling',filterId:'204'});
 const {draft}=parsePrefab(source,index);
 assert.deepEqual(draft.nodes.map(node=>node.name),['Visible sibling']);
 assert.equal(draft.hidden,3,'hidden count includes descendants disabled by the ancestor');
});

test('an active ancestor preserves active descendants and their parent links',()=>{
 const source=prefabNode({objectId:'3',transformId:'103',name:'Grandchild',parent:'102'})+
  prefabNode({objectId:'2',transformId:'102',name:'Child',parent:'101'})+
  prefabNode({objectId:'1',transformId:'101',name:'Parent'});
 const {draft}=parsePrefab(source,index);
 assert.deepEqual(draft.nodes.map(({name,parent})=>[name,parent]),[['Grandchild','t102'],['Child','t101'],['Parent',null]]);
 assert.equal(draft.hidden,0);
});

test('cyclic parent references fail clearly instead of producing a recursive scene graph',()=>{
 for(const source of [
  prefabNode({objectId:'1',transformId:'101',name:'Self',parent:'101'}),
  prefabNode({objectId:'1',transformId:'101',name:'First',parent:'102'})+prefabNode({objectId:'2',transformId:'102',name:'Second',parent:'101'})
 ])assert.throws(()=>parsePrefab(source,index),/循环/);
});

test('exceeding the distinct model limit rejects the scene instead of dropping a parent transform',()=>{
 const files=[],nodes=[];
 for(let i=1;i<=65;i++){
  const guid=i.toString(16).padStart(32,'0');
  files.push({name:`mesh${i}.obj.meta`,text:`guid: ${guid}\n`});
  nodes.push(prefabNode({objectId:String(i),transformId:String(100+i),filterId:String(200+i),name:`Mesh ${i}`,meshGuid:guid}));
 }
 nodes.push(prefabNode({objectId:'66',transformId:'166',name:'Child of excess mesh',parent:'165'}));
 assert.throws(()=>parsePrefab(nodes.join(''),buildMetaIndex(files)),/64.*模型|模型.*64/);
});

function sceneBuilder(){
 const source=path.resolve(__dirname,'../src/renderer/prefab-scene.ts'),loaded=new Module(source,module);
 loaded.filename=source;loaded.paths=Module._nodeModulePaths(path.dirname(source));
 const normalRequire=loaded.require.bind(loaded);loaded.require=name=>name==='three'?THREE:normalRequire(name);
 loaded._compile(ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,source);
 return loaded.exports.buildPrefabScene;
}
const transform=(rotation,position=[1,2,3],scale=[2,3,4])=>({rotation,position,scale});
const rotation=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).toArray();

function assertMirroredWorldTransforms(transforms){
 const rawRoot=new THREE.Group(),rawNodes=[];
 for(const [i,raw] of transforms.entries()){
  const group=new THREE.Group();group.position.fromArray(raw.position);group.quaternion.fromArray(raw.rotation);group.scale.fromArray(raw.scale);
  (rawNodes[i-1]??rawRoot).add(group);rawNodes.push(group);
 }
 rawRoot.updateMatrixWorld(true);
 const nodes=transforms.map((raw,i)=>({id:String(i),name:`Node ${i}`,parent:i?String(i-1):null,transform:mirrorPrefabTransform(raw),mesh:i===transforms.length-1?'mesh.fbx':undefined,submesh:0,materials:[]}));
 const model=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 const built=buildPrefabScene({nodes,materials:[],warnings:[]},new Map([['mesh.fbx',{whole:model,parts:[model]}]]),new Map());
 built.root.updateMatrixWorld(true);
 const reflection=new THREE.Matrix4().makeScale(1,1,-1);
 for(const [i,rawNode] of rawNodes.entries()){
  const expected=reflection.clone().multiply(rawNode.matrixWorld).multiply(reflection),actual=built.root.getObjectByName(`Node ${i}`).matrixWorld;
  for(let entry=0;entry<16;entry++)assert.ok(Math.abs(actual.elements[entry]-expected.elements[entry])<1e-10,`node ${i}, matrix entry ${entry}: ${actual.elements[entry]} != ${expected.elements[entry]}`);
 }
 model.geometry.dispose();model.material.dispose();
}

for(const [axis,angles] of [['X',[Math.PI/2,0,0]],['Y',[0,Math.PI/2,0]],['Z',[0,0,Math.PI/2]]]){
 test(`Z reflection preserves the world-space transform for a ${axis}-axis rotation`,()=>{
  assertMirroredWorldTransforms([transform(rotation(...angles))]);
 });
}

test('Z reflection preserves parent-child world transforms across combined rotations and scales',()=>{
 assertMirroredWorldTransforms([
  transform(rotation(.3,.7,-.2),[1,-2,3],[2,3,4]),
  transform(rotation(-.4,.1,.6),[-4,5,2],[.5,1.5,2]),
  transform(rotation(.2,-.5,.4),[3,1,-6],[1,.75,1.25])
 ]);
});
