const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');

function load(relative) {
  const file = path.resolve(__dirname, '../src', relative);
  assert(fs.existsSync(file), `Missing update history module: ${relative}`);
  const previous = Object.fromEntries(['.ts','.tsx'].map(ext => [ext, Module._extensions[ext]]));
  for (const ext of ['.ts','.tsx']) Module._extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, filename);
  try { return require(file); }
  finally { for (const [ext, original] of Object.entries(previous)) { if (original) Module._extensions[ext]=original; else delete Module._extensions[ext]; } }
}

test('history separates public previews, unpublished trials and stable releases in chronological order', () => {
  const {RELEASE_NOTES, filterReleaseNotes} = load('shared/release-notes.ts');
  assert.equal(require('../package.json').version, '1.4.1-preview.1');
  assert.equal(RELEASE_NOTES[0].version, require('../package.json').version);
  assert.equal(RELEASE_NOTES[0].channel, 'preview');
  const previews=filterReleaseNotes({channel:'preview'});
  assert(previews.some(note=>note.version===require('../package.json').version));
  assert(previews.some(note=>note.version==='1.4.0-preview.17'));
  assert(!previews.some(note=>note.version==='1.4.0'));
  assert(previews.every(note=>note.channel==='preview'));
  assert(!filterReleaseNotes({channel:'local'}).some(note=>note.version===require('../package.json').version));
  const stable = filterReleaseNotes({channel:'stable',language:'zh-CN'});
  assert.deepEqual(stable.map(entry=>entry.version), ['1.4.0','1.3.0','1.2.9','1.2.8','1.2.7','1.2.6','1.2.5','1.2.4','1.2.3','1.2.2','1.2.1','1.2.0','1.1.1','1.1.0','1.0.0']);
  assert(!stable.some(note=>note.version===require('../package.json').version));
  assert(!stable.some(note=>note.version==='1.4.0-preview.17'));
  assert(RELEASE_NOTES.every((entry,index)=>!index || entry.date <= RELEASE_NOTES[index-1].date));
  assert.equal(new Set(RELEASE_NOTES.map(entry=>entry.version)).size, RELEASE_NOTES.length);
});

test('history search finds translated changes and combines version and channel filters without mutating records', () => {
  const {RELEASE_NOTES, filterReleaseNotes} = load('shared/release-notes.ts');
  const before = JSON.stringify(RELEASE_NOTES);
  assert(filterReleaseNotes({search:' HIERARCHY ',language:'en'}).some(entry=>entry.version==='1.2.0-local.2'));
  assert(filterReleaseNotes({search:'階層',language:'ja'}).some(entry=>entry.version==='1.2.0-local.2'));
  assert.deepEqual(filterReleaseNotes({search:'Dedicated hidden materials page',channel:'stable',language:'en'}).map(entry=>entry.version),['1.2.6']);
  assert.deepEqual(filterReleaseNotes({search:'非表示素材の専用ページ',channel:'stable',language:'ja'}).map(entry=>entry.version),['1.2.6']);
  assert.deepEqual(filterReleaseNotes({search:'Pin the match review header',channel:'stable',language:'en'}).map(entry=>entry.version),['1.2.7']);
  assert.deepEqual(filterReleaseNotes({search:'照合確認の上部固定',channel:'stable',language:'ja'}).map(entry=>entry.version),['1.2.7']);
  assert.deepEqual(filterReleaseNotes({search:'1.1.0',channel:'stable',language:'zh-CN'}).map(entry=>entry.version), ['1.1.0']);
  assert.equal(filterReleaseNotes({search:'1.2.0',channel:'stable',language:'en'}).length,1);
  assert.equal(filterReleaseNotes({search:'<script>unknown</script>',language:'en'}).length,0);
  assert.equal(JSON.stringify(RELEASE_NOTES),before);
});

test('previously translated release history remains available offline in English and Japanese', () => {
  const {RELEASE_NOTES} = load('shared/release-notes.ts');
  const {translate} = load('shared/i18n.ts');
  // New 1.3.0 copy is explicitly deferred for a later translation pass (2026-10-24).
  for (const entry of RELEASE_NOTES.filter(entry=>entry.version!=='1.3.0'&&!/^1\.4\.0-preview\./.test(entry.version))) for (const text of [entry.title,...entry.sections.flatMap(section=>section.items)]) {
    for (const language of ['en','ja']) assert.notEqual(translate(text,language),text,`${language}: ${text}`);
  }
});

test('history marks only the actual running version, and does not guess for unknown versions', () => {
  const {ReleaseNotesContent} = load('renderer/release-notes.tsx');
  const {setLanguage} = load('renderer/i18n.tsx');
  for (const [language,label] of [['zh-CN','当前运行'],['en','Running version'],['ja','実行中のバージョン']]) {
    setLanguage(language);
    const html=renderToStaticMarkup(React.createElement(ReleaseNotesContent,{currentVersion:'1.1.0'}));
    assert.equal((html.match(/data-running="true"/g)||[]).length,1);
    assert(html.includes(label));
    assert(html.includes('data-release-version="1.1.0" data-running="true"'));
    const unknown=renderToStaticMarkup(React.createElement(ReleaseNotesContent,{currentVersion:'9.9.9'}));
    assert(unknown.includes('9.9.9'));
    assert.equal((unknown.match(/data-running="true"/g)||[]).length,0);
  }
  setLanguage('zh-CN');
});
