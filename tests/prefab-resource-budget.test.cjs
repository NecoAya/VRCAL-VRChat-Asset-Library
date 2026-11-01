const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {createHash} = require('node:crypto');
const {gzipSync, deflateSync} = require('node:zlib');
const {indexModels, prepareModel, prepareModelScene} = require('../dist/main/main/model-preview-files');
const {purplePng} = require('./model-preview-fixtures.cjs');

const guid = index => index.toString(16).padStart(32, '0');
const meta = index => `fileFormatVersion: 2\nguid: ${guid(index)}\n`;
const obj = 'o Triangle\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
function prefab(meshes, materials = []) {
  return '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n' + meshes.map((mesh, i) => {
    const id = i * 4 + 1;
    return `--- !u!1 &${id}\nGameObject:\n  m_Name: Part${i}\n  m_IsActive: 1\n--- !u!4 &${id + 1}\nTransform:\n  m_GameObject: {fileID: ${id}}\n  m_Father: {fileID: 0}\n--- !u!33 &${id + 2}\nMeshFilter:\n  m_GameObject: {fileID: ${id}}\n  m_Mesh: {fileID: 4300000, guid: ${guid(mesh)}, type: 2}\n--- !u!23 &${id + 3}\nMeshRenderer:\n  m_GameObject: {fileID: ${id}}\n  m_Materials:\n${materials.map(material => `  - {fileID: 2100000, guid: ${guid(material)}, type: 2}\n`).join('')}`;
  }).join('');
}
function pngHeader(width = 1, height = width) {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
  return bytes;
}
function glb(image) {
  const json = Buffer.from(JSON.stringify({asset: {version: '2.0'}, buffers: [{byteLength: image.length}], bufferViews: [{buffer: 0, byteLength: image.length}], images: [{bufferView: 0, mimeType: 'image/png'}]}));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]), binary = Buffer.concat([image, Buffer.alloc((4 - image.length % 4) % 4)]);
  const head = Buffer.alloc(20), chunk = Buffer.alloc(8);
  head.write('glTF'); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + padded.length + binary.length, 8); head.writeUInt32LE(padded.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  chunk.writeUInt32LE(binary.length); chunk.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, padded, chunk, binary]);
}
function embedded(format, image) {
  if (format === 'glb') return glb(image);
  if (format === 'fbx') return '; FBX 7.4.0 project file\nContent: "' + image.toString('base64') + '"\n';
  return JSON.stringify({asset: {version: '2.0'}, images: [{uri: 'data:image/png;base64,' + image.toString('base64')}]});
}
function arrayFbx(decoded, compressed = deflateSync(Buffer.alloc(0))) {
  const header = Buffer.alloc(27), node = Buffer.alloc(13), name = Buffer.from('Vertices'), property = Buffer.alloc(13);
  header.write('Kaydara FBX Binary  \0\x1a\0', 'binary'); header.writeUInt32LE(7400, 23);
  property[0] = 'b'.charCodeAt(0); property.writeUInt32LE(decoded, 1); property.writeUInt32LE(1, 5); property.writeUInt32LE(compressed.length, 9);
  node.writeUInt32LE(27 + 13 + name.length + property.length + compressed.length); node.writeUInt32LE(1, 4); node.writeUInt32LE(property.length + compressed.length, 8); node[12] = name.length;
  return Buffer.concat([header, node, name, property, compressed, Buffer.alloc(13)]);
}
function tar(items) {
  const blocks = [];
  for (const [name, input] of items) {
    const bytes = Buffer.from(input), header = Buffer.alloc(512);
    header.write(name); header.write('0000644\0', 100); header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124); header.fill(32, 148, 156); header[156] = 48; header.write('ustar\0', 257);
    header.write([...header].reduce((a, b) => a + b, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}
function zip(items) {
  let offset = 0; const locals = [], central = [];
  for (const [name, input] of items) {
    const data = Buffer.from(input), filename = Buffer.from(name); let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26); locals.push(local, filename, data);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42); central.push(entry, filename);
    offset += local.length + filename.length + data.length;
  }
  const entries = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(items.length, 8); end.writeUInt16LE(items.length, 10); end.writeUInt32LE(entries.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, entries, end]);
}
async function folder(t) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vrc-prefab-budget-')); t.after(() => fs.rm(root, {recursive: true, force: true})); return root; }
async function write(root, name, bytes) { const file = path.join(root, name); await fs.mkdir(path.dirname(file), {recursive: true}); await fs.writeFile(file, bytes); return file; }
async function source(t, kind, items) {
  const root = await folder(t);
  if (kind === 'directory') { for (const [name, bytes] of items) await write(root, name, bytes); return root; }
  const file = path.join(root, 'fixture.' + kind);
  const packed = kind === 'zip' ? zip(items) : tar(items.filter(([name]) => !name.endsWith('.meta')).flatMap(([name, bytes], i) => {
    const key = guid(i + 1000), sidecar = items.find(([candidate]) => candidate === name + '.meta');
    return [[key + '/pathname', name], [key + '/asset', bytes], ...(sidecar ? [[key + '/asset.meta', sidecar[1]]] : [])];
  }));
  await fs.writeFile(file, packed); return file;
}
async function choice(input, name = 'scene.prefab') { return (await indexModels(input)).models.find(model => model.name === name); }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

for (const format of ['gltf', 'glb', 'fbx']) test(`direct and prefab ${format} reject an 8192-pixel embedded PNG before decoding`, async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.' + format, embedded(format, pngHeader(8192))], ['model.' + format + '.meta', meta(1)]]);
  await assert.rejects(prepareModel(await choice(root, 'model.' + format)), /4096/);
  await assert.rejects(prepareModel(await choice(root)), /4096/);
});

test('direct and prefab FBX reject oversized compressed-array declarations', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.fbx', arrayFbx(128 * 1024 * 1024 + 1)], ['model.fbx.meta', meta(1)]]);
  await assert.rejects(prepareModel(await choice(root, 'model.fbx')));
  await assert.rejects(prepareModel(await choice(root)));
});

test('direct and prefab glTF inspect mixed-case data URI images before browser decoding', async t => {
  const image = 'DaTa:image/png;BASE64,' + pngHeader(8192).toString('base64');
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.gltf', JSON.stringify({asset: {version: '2.0'}, images: [{uri: image}]})], ['model.gltf.meta', meta(1)]]);
  await assert.rejects(prepareModel(await choice(root, 'model.gltf')), /4096/);
  await assert.rejects(prepareModel(await choice(root)), /4096/);
});

for (const kind of ['directory', 'zip', 'unitypackage']) test(`prefab glTF dependencies in a ${kind} use the model directory and stay read-only`, async t => {
  const items = [['scene.prefab', prefab([1])], ['Models/model.gltf', JSON.stringify({asset: {version: '2.0'}, buffers: [{uri: 'geometry.bin', byteLength: 4}], images: [{uri: 'Textures/color.png'}]})], ['Models/model.gltf.meta', meta(1)], ['Models/geometry.bin', Buffer.from([0, 1, 2, 3])], ['Models/Textures/color.png', purplePng()], ['unrelated.png', purplePng()]];
  const input = await source(t, kind, items), before = kind === 'directory' ? await Promise.all(items.map(async ([name]) => hash(await fs.readFile(path.join(input, name))))) : hash(await fs.readFile(input));
  const bundle = await prepareModel(await choice(input));
  assert.equal(bundle.prefab.nodes[0].mesh, 'Models/model.gltf');
  assert.deepEqual(bundle.files.map(file => file.name).sort(), ['Models/Textures/color.png', 'Models/geometry.bin', 'Models/model.gltf', 'scene.prefab']);
  if (kind === 'directory') assert.deepEqual(await Promise.all(items.map(async ([name]) => hash(await fs.readFile(path.join(input, name))))), before);
  else { assert.equal(hash(await fs.readFile(input)), before); assert.deepEqual(await fs.readdir(path.dirname(input)), [path.basename(input)]); }
});

test('prefab OBJ resolves nested MTL textures and excludes unrelated pictures', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['Models/model.obj', 'mtllib Materials/a.mtl\n' + obj], ['Models/model.obj.meta', meta(1)], ['Models/Materials/a.mtl', 'newmtl A\nmap_Kd ../Textures/a.png'], ['Models/Textures/a.png', purplePng()], ['private.png', purplePng()]]);
  const bundle = await prepareModel(await choice(root));
  assert.deepEqual(bundle.files.map(file => file.name).sort(), ['Models/Materials/a.mtl', 'Models/Textures/a.png', 'Models/model.obj', 'scene.prefab']);
});

test('repeated prefab references reserve and inspect one model once', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab(Array(64).fill(1))], ['model.gltf', embedded('gltf', pngHeader(4096))], ['model.gltf.meta', meta(1)]]);
  const bundle = await prepareModel(await choice(root));
  assert.equal(bundle.prefab.nodes.length, 64); assert.deepEqual(bundle.files.map(file => file.name).sort(), ['model.gltf', 'scene.prefab']);
});

for (const format of ['gltf', 'glb', 'fbx']) test(`different prefab ${format} models cannot reuse the first embedded texture budget key`, async t => {
  const bytes = embedded(format, pngHeader(4096));
  const root = await source(t, 'directory', [['scene.prefab', prefab([1, 2])], ['a.' + format, bytes], ['a.' + format + '.meta', meta(1)], ['b.' + format, bytes], ['b.' + format + '.meta', meta(2)]]);
  await assert.rejects(prepareModel(await choice(root)), /128 MiB/);
});

test('prefab and reference models share embedded texture and file budgets', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.gltf', embedded('gltf', pngHeader(4096))], ['model.gltf.meta', meta(1)]]);
  await assert.rejects(prepareModelScene(await choice(root), await choice(root, 'model.gltf')), /128 MiB/);
  const many = JSON.stringify({asset: {version: '2.0'}, images: Array.from({length: 48}, () => ({uri: 'data:image/png;base64,' + purplePng().toString('base64')}))});
  await write(root, 'model.gltf', many);
  await assert.rejects(prepareModelScene(await choice(root), await choice(root, 'model.gltf')));
});

test('prefab and reference FBX models share the decoded-array budget', async t => {
  const size = 65 * 1024 * 1024, bytes = arrayFbx(size, deflateSync(Buffer.alloc(size)));
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.fbx', bytes], ['model.fbx.meta', meta(1)]]);
  await assert.rejects(prepareModelScene(await choice(root), await choice(root, 'model.fbx')));
});

test('95 unrelated meta files do not consume renderer file slots', async t => {
  const items = [['scene.prefab', prefab([1])], ['model.obj', obj], ['model.obj.meta', meta(1)], ...Array.from({length: 95}, (_, i) => [`unused-${i}.meta`, meta(i + 10)])];
  const root = await source(t, 'directory', items), bundle = await prepareModel(await choice(root));
  assert.equal(bundle.prefab.nodes[0].mesh, 'model.obj'); assert.deepEqual(bundle.files.map(file => file.name).sort(), ['model.obj', 'scene.prefab']);
});

test('metadata count accepts 2048 sidecars and rejects 2049 before opening sidecars', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.obj', obj], ['model.obj.meta', meta(1)], ...Array.from({length: 2047}, (_, i) => [`unused-${i}.meta`, meta(i + 10)])]);
  assert.equal((await prepareModel(await choice(root))).prefab.nodes[0].mesh, 'model.obj');
  await write(root, 'overflow.meta', meta(9999));
  const selected = await choice(root), original = fs.open; let opened = false;
  fs.open = async function(file, ...args) { if (String(file).endsWith('.meta')) opened = true; return original.call(this, file, ...args); };
  try { await assert.rejects(prepareModel(selected), /meta|metadata/i); assert.equal(opened, false); } finally { fs.open = original; }
});

test('metadata bytes accept 8 MiB and reject one extra byte before opening sidecars', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ...Array.from({length: 128}, (_, i) => [`unused-${i}.meta`, Buffer.alloc(64 * 1024, 32)])]);
  assert.equal((await prepareModel(await choice(root))).files.length, 1);
  await write(root, 'extra.meta', 'x');
  const selected = await choice(root), original = fs.open; let opened = false;
  fs.open = async function(file, ...args) { if (String(file).endsWith('.meta')) opened = true; return original.call(this, file, ...args); };
  try { await assert.rejects(prepareModel(selected), /meta|metadata/i); assert.equal(opened, false); } finally { fs.open = original; }
});

test('metadata per-file limit and primary/reference total are enforced independently', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['large.meta', Buffer.alloc(64 * 1024 + 1)]]);
  await assert.rejects(prepareModel(await choice(root)), /meta|metadata/i);
  await fs.unlink(path.join(root, 'large.meta'));
  for (let i = 0; i < 65; i++) await write(root, `sidecar-${i}.meta`, Buffer.alloc(64 * 1024, 32));
  const selected = await choice(root); await assert.rejects(prepareModelScene(selected, selected), /meta|metadata/i);
});

test('a material rejected by the resource budget is never opened or parsed', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1], [2])], ['model.obj', obj], ['model.obj.meta', meta(1)], ['large.mat.meta', meta(2)]]), material = path.join(root, 'large.mat');
  const handle = await fs.open(material, 'w'); await handle.truncate(64 * 1024 * 1024 + 1); await handle.close();
  const selected = await choice(root), original = fs.open; let opened = false;
  fs.open = async function(file, ...args) { if (file === material) opened = true; return original.call(this, file, ...args); };
  try { const bundle = await prepareModel(selected); assert.equal(opened, false); assert.equal(bundle.prefab.materials.length, 0); assert.ok(!bundle.files.some(file => file.name === 'large.mat')); } finally { fs.open = original; }
});

test('prefab dependency traversal never opens a sibling outside the selected directory', async t => {
  const root = await folder(t), input = path.join(root, 'selected');
  await write(input, 'scene.prefab', prefab([1])); await write(input, 'model.gltf.meta', meta(1)); await write(input, 'model.gltf', JSON.stringify({asset: {version: '2.0'}, buffers: [{uri: '../secret.bin', byteLength: 4}]}));
  const outside = await write(root, 'secret.bin', 'private'), original = fs.open; let opened = false;
  fs.open = async function(file, ...args) { if (file === outside) opened = true; return original.call(this, file, ...args); };
  try { await assert.rejects(prepareModel(await choice(input))); assert.equal(opened, false); } finally { fs.open = original; }
});

for (const kind of ['zip', 'unitypackage']) test(`${kind} traversal is rejected before prefab preparation`, async t => {
  const input = await source(t, kind, [['../scene.prefab', prefab([1])]]);
  await assert.rejects(indexModels(input));
});

test('an OBJ material reference cannot smuggle an unchecked model into a prefab bundle', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.obj', 'mtllib unchecked.fbx\n' + obj], ['model.obj.meta', meta(1)], ['unchecked.fbx', embedded('fbx', pngHeader(8192))]]);
  const bundle = await prepareModel(await choice(root));
  assert.deepEqual(bundle.files.map(file => file.name).sort(), ['model.obj', 'scene.prefab']);
  assert.ok(bundle.warnings.length);
});

test('a Unity material GUID cannot smuggle a model into a prefab bundle', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1], [2])], ['model.obj', obj], ['model.obj.meta', meta(1)], ['unchecked.fbx', embedded('fbx', pngHeader(8192))], ['unchecked.fbx.meta', meta(2)]]);
  const bundle = await prepareModel(await choice(root));
  assert.deepEqual(bundle.files.map(file => file.name).sort(), ['model.obj', 'scene.prefab']);
  assert.equal(bundle.prefab.materials.length, 0);
  assert.ok(bundle.warnings.length);
});

for (const name of ['unchecked.fbx', 'private.meta']) test(`a glTF buffer cannot bypass preflight or metadata budgets through ${name}`, async t => {
  const bytes = name.endsWith('.fbx') ? embedded('fbx', pngHeader(8192)) : meta(2);
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['model.gltf', JSON.stringify({asset: {version: '2.0'}, buffers: [{uri: name, byteLength: Buffer.byteLength(bytes)}]})], ['model.gltf.meta', meta(1)], [name, bytes]]);
  await assert.rejects(prepareModel(await choice(root, 'model.gltf')));
  await assert.rejects(prepareModel(await choice(root)));
});

test('a nested prefab mesh reference is reported without expanding or parsing it as FBX', async t => {
  const root = await source(t, 'directory', [['scene.prefab', prefab([1])], ['nested.prefab', prefab([2])], ['nested.prefab.meta', meta(1)]]);
  const bundle = await prepareModel(await choice(root));
  assert.deepEqual(bundle.files.map(file => file.name), ['scene.prefab']);
  assert.equal(bundle.prefab.nodes[0].mesh, undefined);
  assert.ok(bundle.warnings.some(warning => warning.includes('nested.prefab')));
});

test('prefab and reference models reject a second buffer before exceeding the shared raw byte budget', async t => {
  const json = JSON.stringify({asset: {version: '2.0'}, buffers: [{uri: 'geometry.bin', byteLength: 64 * 1024 * 1024}]}), root = await folder(t);
  for (const slot of ['primary', 'reference']) {
    const input = path.join(root, slot);
    await write(input, 'scene.prefab', prefab([1])); await write(input, 'model.gltf', json); await write(input, 'model.gltf.meta', meta(1));
    const handle = await fs.open(path.join(input, 'geometry.bin'), 'w'); await handle.truncate(64 * 1024 * 1024); await handle.close();
  }
  const primary = await choice(path.join(root, 'primary')), reference = await choice(path.join(root, 'reference'), 'model.gltf'), original = fs.open;
  let opened = false;
  fs.open = async function(file, ...args) { if (file === path.join(root, 'reference', 'geometry.bin')) opened = true; return original.call(this, file, ...args); };
  try { await assert.rejects(prepareModelScene(primary, reference)); assert.equal(opened, false); } finally { fs.open = original; }
});

for (const format of ['gltf', 'fbx', 'obj']) test(`two prefab ${format} loaders budget their separate decodes of one shared texture`, async t => {
  const bytes = format === 'gltf' ? JSON.stringify({asset: {version: '2.0'}, images: [{uri: 'shared.png'}]}) : format === 'fbx' ? '; FBX 7.4.0 project file\nRelativeFilename: "shared.png"\n' : 'mtllib shared.mtl\n' + obj;
  const root = await source(t, 'directory', [['scene.prefab', prefab([1, 2])], ['a.' + format, bytes], ['a.' + format + '.meta', meta(1)], ['b.' + format, bytes], ['b.' + format + '.meta', meta(2)], ['shared.mtl', 'newmtl A\nmap_Kd shared.png'], ['shared.png', pngHeader(4096)]]);
  await assert.rejects(prepareModel(await choice(root)), /128 MiB/);
  await write(root, 'scene.prefab', prefab([1, 1]));
  const bundle = await prepareModel(await choice(root));
  assert.equal(bundle.files.filter(file => file.name === 'shared.png').length, 1);
});

test('two prefab materials budget their separate decodes of one shared texture', async t => {
  const material = '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\nMaterial:\n  m_Name: Fabric\n  m_SavedProperties:\n    m_TexEnvs:\n    - _MainTex:\n        m_Texture: {fileID: 2800000, guid: ' + guid(4) + ', type: 3}\n';
  const root = await source(t, 'directory', [['scene.prefab', prefab([1], [2, 3])], ['model.obj', obj], ['model.obj.meta', meta(1)], ['a.mat', material], ['a.mat.meta', meta(2)], ['b.mat', material], ['b.mat.meta', meta(3)], ['shared.png', pngHeader(4096)], ['shared.png.meta', meta(4)]]);
  await assert.rejects(prepareModel(await choice(root)), /128 MiB/);
});
