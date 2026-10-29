const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
const {indexModels,prepareModel,prepareModelScene}=require('../dist/main/main/model-preview-files');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const MESH='a'.repeat(32),MAT='b'.repeat(32),TEX='c'.repeat(32);
const meta=(guid)=>`fileFormatVersion: 2\nguid: ${guid}\nNativeFormatImporter:\n  mainAssetObjectIdentifierBase: 100000\n`;
const OBJ='o Dress\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
const MAT_TEXT=`%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\nMaterial:\n  m_Name: Fabric\n  m_Shader: {fileID: 46, guid: 0000000000000000f000000000000000, type: 0}\n  m_SavedProperties:\n    serializedVersion: 3\n    m_TexEnvs:\n    - _MainTex:\n        m_Texture: {fileID: 2800000, guid: ${TEX}, type: 3}\n        m_Scale: {x: 1, y: 1}\n        m_Offset: {x: 0, y: 0}\n    m_Floats:\n    - _Cutoff: 0.5\n    - _Cull: 0\n    - _Mode: 0\n    m_Colors:\n    - _Color: {r: 0.2, g: 0.4, b: 0.6, a: 1}\n`;
const prefabWith=(meshGuid)=>`%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!1 &1\nGameObject:\n  serializedVersion: 6\n  m_Component:\n  - component: {fileID: 4}\n  - component: {fileID: 33}\n  - component: {fileID: 23}\n  m_Name: Dress\n  m_TagString: Untagged\n  m_IsActive: 1\n--- !u!4 &4\nTransform:\n  m_GameObject: {fileID: 1}\n  m_LocalRotation: {x: 0, y: 0, z: 0, w: 1}\n  m_LocalPosition: {x: 0, y: 0.4, z: 0.2}\n  m_LocalScale: {x: 2, y: 2, z: 2}\n  m_Children: []\n  m_Father: {fileID: 0}\n--- !u!33 &33\nMeshFilter:\n  m_GameObject: {fileID: 1}\n  m_Mesh: {fileID: 4300000, guid: ${meshGuid}, type: 2}\n--- !u!23 &23\nMeshRenderer:\n  m_GameObject: {fileID: 1}\n  m_Materials:\n  - {fileID: 2100000, guid: ${MAT}, type: 2}\n  m_StaticBatchInfo:\n    firstSubMesh: 0\n`;
const PREFAB=prefabWith(MESH);

function tar(items){const blocks=[];for(const [name,data] of items){const b=Buffer.from(data),h=Buffer.alloc(512);h.write(name);h.write('0000644\0',100);h.write(b.length.toString(8).padStart(11,'0')+'\0',124);h.fill(32,148,156);h[156]=48;h.write('ustar\0',257);h.write([...h].reduce((a,b)=>a+b,0).toString(8).padStart(6,'0')+'\0 ',148);blocks.push(h,b,Buffer.alloc((512-b.length%512)%512))}return gzipSync(Buffer.concat([...blocks,Buffer.alloc(1024)]))}
async function folder(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'vrc-prefab-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root}
async function write(dir,name,data){const file=path.join(dir,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);return file}

test('a prefab in a material folder previews as one candidate with its model, material and texture',async t=>{
 const dir=await folder(t);
 await write(dir,'Dress.prefab',PREFAB);await write(dir,'model.obj',OBJ);await write(dir,'model.obj.meta',meta(MESH));
 await write(dir,'Fabric.mat',MAT_TEXT);await write(dir,'Fabric.mat.meta',meta(MAT));
 await write(dir,'Tex/Fabric_01.png',png);await write(dir,'Tex/Fabric_01.png.meta',meta(TEX));
 await write(dir,'notes.txt','private note');
 const indexed=await indexModels(dir),prefab=indexed.models.find(model=>model.format==='prefab');
 assert.ok(prefab,'prefab should be listed');assert.deepEqual(indexed.models.map(m=>m.format).sort(),['obj','prefab']);
 const bundle=await prepareModel(prefab);
 assert.ok(bundle.prefab,'bundle must carry the parsed scene');
 assert.equal(bundle.prefab.nodes.length,1);
 const [node]=bundle.prefab.nodes;assert.equal(node.name,'Dress');assert.equal(node.mesh,'model.obj');assert.deepEqual(node.materials,['Fabric.mat']);
 assert.deepEqual(node.transform.position,[0,0.4,-0.2],'the mirrored axis flips once, at assembly');assert.deepEqual(node.transform.scale,[2,2,2]);
 const [material]=bundle.prefab.materials;assert.equal(material.file,'Fabric.mat');assert.equal(material.texture,'Tex/Fabric_01.png');
 assert.deepEqual(material.color,[0.2,0.4,0.6]);assert.equal(material.doubleSided,true);assert.equal(material.transparent,false);
 assert.deepEqual(bundle.files.map(file=>file.name).sort(),['Dress.prefab','Fabric.mat','Tex/Fabric_01.png','model.obj'],'guid indexes stay inside the reader');
 assert.ok(!bundle.files.some(file=>/\.meta$/i.test(file.name)));
 const source=await fs.readFile(path.join(dir,'Dress.prefab'));assert.equal(createHash('sha256').update(source).digest('hex'),createHash('sha256').update(await fs.readFile(path.join(dir,'Dress.prefab'))).digest('hex'),'reading stays read-only');
});

test('prefab references outside the granted scope are reported instead of searched elsewhere',async t=>{
 const dir=await folder(t);
 await write(dir,'Dress.prefab',prefabWith('d'.repeat(32)));await write(dir,'Fabric.mat',MAT_TEXT);await write(dir,'Fabric.mat.meta',meta(MAT));
 const bundle=await prepareModel((await indexModels(dir)).models.find(model=>model.format==='prefab'));
 assert.ok(bundle.warnings.some(message=>/不在此素材的读取范围内/.test(message)),bundle.warnings.join(' | '));
 assert.equal(bundle.prefab.nodes[0].mesh,undefined);
 assert.deepEqual(bundle.files.map(file=>file.name).sort(),['Dress.prefab','Fabric.mat']);
});

test('prefabs are readable from inside a unitypackage without extracting to the material folder',async t=>{
 const dir=await folder(t),pack=path.join(dir,'服装_日本語😀.unitypackage');
 await fs.writeFile(pack,tar([['11111111111111111111111111111111/pathname','Dress.prefab\n'],['11111111111111111111111111111111/asset',PREFAB],
  ['22222222222222222222222222222222/pathname','model.obj\n'],['22222222222222222222222222222222/asset',OBJ],
  ['33333333333333333333333333333333/pathname','model.obj.meta\n'],['33333333333333333333333333333333/asset',meta(MESH)],
  ['44444444444444444444444444444444/pathname','Fabric.mat\n'],['44444444444444444444444444444444/asset',MAT_TEXT],
  ['55555555555555555555555555555555/pathname','Fabric.mat.meta\n'],['55555555555555555555555555555555/asset',meta(MAT)]]));
 const before=createHash('sha256').update(await fs.readFile(pack)).digest('hex');
 const indexed=await indexModels(pack),prefab=indexed.models.find(model=>model.format==='prefab');assert.ok(prefab,indexed.models.map(m=>m.name).join());
 const bundle=await prepareModel(prefab);
 assert.equal(bundle.prefab.nodes[0].mesh,'model.obj');assert.equal(bundle.prefab.materials[0].texture,undefined,'the texture has no meta inside this package');
 assert.ok(bundle.warnings.some(message=>/贴图|读取范围/.test(message)),bundle.warnings.join(' | '));
 assert.equal(createHash('sha256').update(await fs.readFile(pack)).digest('hex'),before);
 assert.deepEqual(await fs.readdir(dir),['服装_日本語😀.unitypackage'],'no extraction directory is created');
});

test('a prefab scene combines with a plain model without sharing transforms or resources',async t=>{
 const root=await folder(t),clothes=path.join(root,'clothes'),avatar=path.join(root,'avatar');
 await write(clothes,'Dress.prefab',PREFAB);await write(clothes,'model.obj',OBJ);await write(clothes,'model.obj.meta',meta(MESH));
 await write(clothes,'Fabric.mat',MAT_TEXT);await write(clothes,'Fabric.mat.meta',meta(MAT));
 await write(avatar,'body.obj','o Body\nv 0 0 0\nv 2 0 0\nv 0 2 0\nf 1 2 3\n');
 const sources=await indexModels(clothes),prefab=sources.models.find(model=>model.format==='prefab'),body=(await indexModels(avatar)).models[0];
 const scene=await prepareModelScene(prefab,body);
 assert.ok(scene.prefab===undefined||scene.primary.prefab,'primary keeps its scene');
 assert.equal(scene.reference.prefab,undefined);assert.equal(scene.reference.name,'body.obj');
 assert.notEqual(scene.primary.files.find(f=>f.name==='Dress.prefab').bytes,scene.reference.files.find(f=>f.name==='body.obj').bytes);
});

test('a prefab without readable GameObject text fails with a clear message instead of an empty picture',async t=>{
 const dir=await folder(t);await write(dir,'Broken.prefab','%YAML 1.1\n--- !u!114 &1\nMonoBehaviour:\n  m_Enabled: 1\n');
 const broken=(await indexModels(dir)).models.find(model=>model.format==='prefab');
 await assert.rejects(()=>prepareModel(broken),/Prefab|GameObject/);
});
