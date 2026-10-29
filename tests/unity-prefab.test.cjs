const test=require('node:test'),assert=require('node:assert/strict');
const {yamlDocuments,field,list,number}=require('../dist/main/main/unity-yaml');
const {buildMetaIndex,parsePrefab,parseMaterial,metaGuid,mirrorPrefabTransform}=require('../dist/main/main/unity-prefab');

const MESH_GUID='a'.repeat(32),MAT_GUID='b'.repeat(32),TEX_GUID='c'.repeat(32);
const index=buildMetaIndex([
 {name:'Clothes/model.fbx.meta',text:`fileFormatVersion: 2\nguid: ${MESH_GUID}\nModelImporter:\n  serializedVersion: 28\n`},
 {name:'Clothes/Fabric.mat.meta',text:`fileFormatVersion: 2\nguid: ${MAT_GUID}\nNativeFormatImporter:\n  mainAssetObjectIdentifierBase: 100000\n`},
 {name:'Clothes/Tex/Fabric_01.png.meta',text:`fileFormatVersion: 2\nguid: ${TEX_GUID}\nTextureImporter:\n  serializedVersion: 22\n`},
 {name:'Clothes/readme.txt.meta',text:'fileFormatVersion: 2\nguid: not-a-guid\n'}
]);

const PREFAB=`%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!1 &100000\nGameObject:\n  m_ObjectHideFlags: 0\n  serializedVersion: 6\n  m_Component:\n  - component: {fileID: 400000}\n  - component: {fileID: 3300000}\n  - component: {fileID: 2300000}\n  m_Layer: 0\n  m_Name: Dress\n  m_TagString: Untagged\n  m_IsActive: 1\n--- !u!4 &400000\nTransform:\n  m_GameObject: {fileID: 100000}\n  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}\n  m_LocalPosition: {x: 0, y: 0, z: 0}\n  m_LocalScale: {x: 1, y: 1, z: 1}\n  m_Children:\n  - {fileID: 400001}\n  - {fileID: 400002}\n  m_Father: {fileID: 0}\n  m_RootOrder: 0\n--- !u!33 &3300000\nMeshFilter:\n  m_GameObject: {fileID: 100000}\n  m_Mesh: {fileID: 4300000, guid: ${MESH_GUID}, type: 2}\n--- !u!23 &2300000\nMeshRenderer:\n  m_GameObject: {fileID: 100000}\n  m_Materials:\n  - {fileID: 2100000, guid: ${MAT_GUID}, type: 2}\n  m_StaticBatchInfo:\n    firstSubMesh: 0\n    subMeshCount: 0\n--- !u!1 &100001\nGameObject:\n  serializedVersion: 6\n  m_Component:\n  - component: {fileID: 400001}\n  m_Name: Hidden Part\n  m_IsActive: 0\n--- !u!4 &400001\nTransform:\n  m_GameObject: {fileID: 100001}\n  m_LocalRotation: {x: 0, y: 0.7071068, z: 0, w: 0.7071068}\n  m_LocalPosition: {x: 0.1, y: 0.2, z: 0.3}\n  m_LocalScale: {x: 2, y: 2, z: 2}\n  m_Children: []\n  m_Father: {fileID: 400000}\n--- !u!1 &100002\nGameObject:\n  m_Component:\n  - component: {fileID: 400002}\n  - component: {fileID: 3300002}\n  m_Name: BuiltIn\n  m_IsActive: 1\n--- !u!4 &400002\nTransform:\n  m_GameObject: {fileID: 100002}\n  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}\n  m_LocalPosition: {x: 1, y: 2, z: 3}\n  m_LocalScale: {x: 1, y: 1, z: 1}\n  m_Children: []\n  m_Father: {fileID: 400000}\n--- !u!33 &3300002\nMeshFilter:\n  m_GameObject: {fileID: 100002}\n  m_Mesh: {fileID: 10202, guid: 0000000000000000e000000000000000, type: 0}\n--- !u!114 &1140000\nMonoBehaviour:\n  m_GameObject: {fileID: 100002}\n  m_Enabled: 1\n  script: {fileID: 11500000, guid: d${'d'.repeat(31)}, type: 3}\n`;

test('YAML subset reads Unity documents, flow maps and same-indent sequences',()=>{
 const documents=yamlDocuments(PREFAB);assert.equal(documents.size,10);
 const root=documents.get(100000).body;
 assert.equal(field(root,'m_Name')===undefined,field(field(root,'GameObject'),'m_Name')==='Dress');
 const components=list(field(field(root,'GameObject'),'m_Component'));assert.equal(components.length,3);
 assert.equal(number(field(field(components[0],'component'),'fileID')),400000);
 const children=list(field(field(documents.get(400000).body,'Transform'),'m_Children'));assert.equal(children.length,2);
 assert.equal(number(field(children[0],'fileID')),400001);
 assert.deepEqual(field(field(documents.get(3300000).body,'MeshFilter'),'m_Mesh'),{fileID:4300000,guid:MESH_GUID,type:2});
 assert.equal(number(field(field(documents.get(2300000).body,'MeshRenderer'),'m_StaticBatchInfo')&&field(field(field(documents.get(2300000).body,'MeshRenderer'),'m_StaticBatchInfo'),'subMeshCount')),0);
 assert.throws(()=>yamlDocuments('fileFormatVersion: 2\nguid: x\n'),/缺少 Unity 文档头/);
 assert.throws(()=>yamlDocuments('--- !u!1 &1\nGameObject:\n\tm_Name: Tab\n'),/制表符/);
});

test('meta index maps guids to indexed paths and ignores unusable meta files',()=>{
 assert.equal(index.file(MESH_GUID),'Clothes/model.fbx');
 assert.equal(index.file(MESH_GUID.toUpperCase()),'Clothes/model.fbx','guid lookup stays case-insensitive like Unity');
 assert.equal(index.file('f'.repeat(32)),undefined);
 assert.equal(index.file(TEX_GUID),'Clothes/Tex/Fabric_01.png');
 assert.equal(index.guidOf('clothes/fabric.mat'),MAT_GUID);
 assert.equal(metaGuid('guid: '+MESH_GUID+'\n'),MESH_GUID);assert.equal(metaGuid('guid: nothex'),undefined);
});

test('prefab keeps the transform tree, skips disabled nodes and reports unusable references',()=>{
 const parsed=parsePrefab(PREFAB,index);assert.ok(parsed.draft,'draft expected');
 const nodes=parsed.draft.nodes,byName=new Map(nodes.map(node=>[node.name,node]));
 assert.equal(nodes.length,2,nodes.map(node=>node.name).join());
 const dress=byName.get('Dress'),child=byName.get('BuiltIn');
 assert.equal(dress.parent,null);assert.equal(dress.mesh,'Clothes/model.fbx');assert.deepEqual(dress.materials,['Clothes/Fabric.mat']);
 assert.equal(child.parent,'t400000');assert.equal(child.mesh,undefined,'built-in meshes are never guessed');
 assert.equal(parsed.draft.builtin,1);assert.equal(parsed.draft.hidden,1);
 assert.ok(parsed.warnings.some(message=>/嵌套|内置网格|关闭状态/.test(message)),parsed.warnings.join(' | '));
 assert.ok(parsed.warnings.some(message=>/脚本组件/.test(message)),parsed.warnings.join(' | '));
 assert.deepEqual(dress.raw.position,[0,0,0]);assert.deepEqual(dress.raw.rotation,[0,0,0,1]);
});

test('identity stays identity so a prefab node previews like the model file alone',()=>{
 const source={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
 assert.deepEqual(mirrorPrefabTransform(source),source);
});

test('only the mirrored axis flips: pitch and yaw keep their sign, roll and translation invert',()=>{
 assert.deepEqual(mirrorPrefabTransform({position:[0.1,0.2,0.3],rotation:[0,0,0.7071068,0.7071068],scale:[1,1,1]}).rotation,[0,0,-0.7071068,0.7071068],'rotation about Z reverses');
 assert.deepEqual(mirrorPrefabTransform({position:[1,2,3],rotation:[0,0.7071068,0,0.7071068],scale:[1,1,1]}).rotation,[0,0.7071068,0,0.7071068],'rotation about Y keeps its sign');
 assert.deepEqual(mirrorPrefabTransform({position:[1,2,3],rotation:[0.7071068,0,0,0.7071068],scale:[1,1,1]}).rotation,[0.7071068,0,0,0.7071068],'rotation about X keeps its sign');
 assert.deepEqual(mirrorPrefabTransform({position:[1,2,3],rotation:[0,0,0,1],scale:[1,1,1]}).position,[1,2,-3]);
 assert.deepEqual(mirrorPrefabTransform({position:[0,0,0],rotation:[0,0,0,1],scale:[2,3,4]}).scale,[2,3,4]);
});

const MATERIAL=`%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\nMaterial:\n  serializedVersion: 6\n  m_Name: Fabric\n  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}\n  m_ValidKeywords: []\n  m_SavedProperties:\n    serializedVersion: 3\n    m_TexEnvs:\n    - _BumpMap:\n        m_Texture: {fileID: 0}\n        m_Scale: {x: 1, y: 1}\n        m_Offset: {x: 0, y: 0}\n    - _MainTex:\n        m_Texture: {fileID: 2800000, guid: ${TEX_GUID}, type: 3}\n        m_Scale: {x: 2, y: 3}\n        m_Offset: {x: 0.25, y: 0}\n    m_Floats:\n    - _Cutoff: 0.42\n    - _Cull: 0\n    - _Glossiness: 0.5\n    - _Mode: 3\n    m_Colors:\n    - _Color: {r: 0.8, g: 0.25, b: 0.1, a: 1}\n    - _EmissionColor: {r: 0, g: 0, b: 0, a: 1}\n`;

test('material reads primary texture, base colour and render state without guessing shaders',()=>{
 const parsed=parseMaterial(MATERIAL,index);assert.ok(parsed.material);
 const material=parsed.material;assert.equal(material.name,'Fabric');
 assert.equal(material.texture,'Clothes/Tex/Fabric_01.png');
 assert.deepEqual(material.color,[0.8,0.25,0.1]);assert.equal(material.hasColor,true);
 assert.equal(material.cutoff,0.42);assert.equal(material.doubleSided,true);assert.equal(material.transparent,true);
 assert.deepEqual(parsed.warnings,[]);
 const empty=parseMaterial('%YAML 1.1\n--- !u!21 &1\nMaterial:\n  m_Name: Bare\n',index);
 assert.equal(empty.material.hasColor,false);assert.equal(empty.material.texture,undefined);
 assert.throws(()=>parseMaterial('m_Name: not unity',index),/缺少 Unity 文档头/,'a file without Unity document headers is never guessed at');
});
