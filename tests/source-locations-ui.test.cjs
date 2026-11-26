'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');

// Exercise the real JSX and handlers. A small persistent hook host matches the
// existing workbench tests; Electron covers browser rendering and native inputs.
const previous = new Map(['.ts', '.tsx', '.css'].map(extension => [extension, require.extensions[extension]]));
let SourceLocations;
try {
  for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename
  }).outputText, filename);
  require.extensions['.css'] = module => { module.exports = {}; };
  const filename = path.resolve(__dirname, '../src/renderer/source-locations.tsx');
  if (fs.existsSync(filename)) ({ SourceLocations } = require(filename));
} finally {
  for (const [extension, handler] of previous) {
    if (handler) require.extensions[extension] = handler;
    else delete require.extensions[extension];
  }
}

function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
}
function text(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return React.Children.toArray(node.props?.children).map(text).join('');
}
function harness(overrides = {}) {
  assert.equal(typeof SourceLocations, 'function', 'settings must expose the interactive source locations component');
  const slots = [], effects = [], hosts = new Map(), calls = [];
  let cursor = 0, dirty = false, queued = [], tree;
  const props = { roots: ['E:/素材/A', 'E:/素材/B', 'E:/素材/C'], disabled: false, onRemove: async roots => { calls.push([...roots]); return true; }, onAdd: async () => {}, ...overrides };
  const original = Object.fromEntries(['useState', 'useRef', 'useEffect', 'useSyncExternalStore'].map(name => [name, React[name]]));
  function render(update = {}) {
    Object.assign(props, update);
    React.useState = initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { const value = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true; } }];
    };
    React.useRef = initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; };
    React.useEffect = (callback, dependencies) => {
      const i = cursor++;
      if (!effects[i] || !dependencies || dependencies.some((value, n) => !Object.is(value, effects[i].dependencies?.[n]))) queued.push(() => {
        effects[i]?.cleanup?.(); effects[i] = { dependencies, cleanup: callback() };
      });
    };
    React.useSyncExternalStore = (_subscribe, get) => get();
    try {
      let renders = 0;
      do {
        assert(++renders < 15, 'selection reconciliation must settle');
        cursor = 0; dirty = false; queued = []; tree = SourceLocations(props);
        for (const node of nodes(tree)) if (node.props?.ref) {
          const key = node.props['aria-label'] || node.key || node.type;
          if (!hosts.has(key)) hosts.set(key, {});
          const host = hosts.get(key);
          if (typeof node.props.ref === 'function') node.props.ref(host); else node.props.ref.current = host;
        }
        queued.forEach(callback => callback());
      } while (dirty);
      return tree;
    } finally { Object.assign(React, original); }
  }
  const find = predicate => { const node = nodes(tree).find(predicate); assert(node, 'expected UI control'); return node; };
  const input = label => find(node => node.type === 'input' && node.props['aria-label'] === label);
  const button = label => find(node => node.type === 'button' && text(node) === label);
  const master = () => input('全选素材位置');
  const root = value => input('选择素材位置：' + value);
  const bulk = () => find(node => node.type === 'button' && node.props['data-remove-selected-roots'] !== undefined);
  const check = (node, checked) => { node.props.onChange({ currentTarget: { checked }, target: { checked } }); render(); };
  render();
  return { render, find, input, button, master, root, bulk, check, calls, props, hosts, get tree() { return tree; } };
}
const A = 'E:/素材/A', B = 'E:/素材/B', C = 'E:/素材/C';

test('checked paths are removed together in one batch and success clears their selection', async () => {
  const h = harness();
  assert.equal(h.bulk().props.disabled, true);
  h.check(h.root(A), true); h.check(h.root(C), true);
  assert(text(h.tree).includes('已选 2'));
  assert.equal(text(h.bulk()), '移除所选（2）');
  await h.bulk().props.onClick(); h.render();
  assert.deepEqual(h.calls, [[A, C]]);
  assert.equal(h.root(A).props.checked, false);
  assert.equal(h.root(C).props.checked, false);
  assert.equal(h.bulk().props.disabled, true);
});

test('select all exposes a native mixed state, then selects and clears the current list', () => {
  const h = harness();
  h.check(h.root(B), true);
  assert.equal(h.master().props.checked, false);
  assert.equal(h.master().props['aria-checked'], 'mixed');
  assert.equal(h.hosts.get('全选素材位置').indeterminate, true);
  h.check(h.master(), true);
  assert.equal(h.master().props.checked, true);
  assert.equal(h.hosts.get('全选素材位置').indeterminate, false);
  assert.equal(h.root(A).props.checked, true);
  assert.equal(h.root(C).props.checked, true);
  h.check(h.master(), false);
  assert.equal(h.root(B).props.checked, false);
  assert.equal(h.bulk().props.disabled, true);
});

test('new paths arriving after select all stay unchecked and are excluded from the batch', async () => {
  const h = harness({ roots: [A, B] });
  h.check(h.master(), true);
  h.render({ roots: [A, B, C] });
  assert.equal(h.root(C).props.checked, false);
  assert.equal(h.master().props['aria-checked'], 'mixed');
  await h.bulk().props.onClick();
  assert.deepEqual(h.calls, [[A, B]]);
});

test('refreshing the roots removes stale selections even if a path is registered again', () => {
  const h = harness();
  h.check(h.root(A), true); h.check(h.root(B), true);
  h.render({ roots: [B, C] });
  assert(text(h.tree).includes('已选 1'));
  h.render({ roots: [A, B, C] });
  assert.equal(h.root(A).props.checked, false);
  assert.equal(h.root(B).props.checked, true);
});

test('a failed batch preserves the checked paths for one retry', async () => {
  const attempts = [];
  const h = harness({ onRemove: async roots => { attempts.push([...roots]); return attempts.length > 1; } });
  h.check(h.root(A), true); h.check(h.root(B), true);
  await h.bulk().props.onClick(); h.render();
  assert.equal(h.root(A).props.checked, true);
  assert.equal(h.root(B).props.checked, true);
  assert.equal(h.bulk().props.disabled, false);
  assert(h.find(node => node.props?.role === 'alert'));
  await h.bulk().props.onClick(); h.render();
  assert.deepEqual(attempts, [[A, B], [A, B]]);
  assert.equal(h.root(A).props.checked, false);
});

test('a rejected removal retains selection and exposes the retryable error', async () => {
  const h = harness({ onRemove: async () => { throw new Error('fixture unavailable'); } });
  h.check(h.root(C), true);
  await h.bulk().props.onClick(); h.render();
  assert.equal(h.root(C).props.checked, true);
  assert.equal(h.bulk().props.disabled, false);
  assert(text(h.find(node => node.props?.role === 'alert')).includes('fixture unavailable'));
});

test('an in-flight batch blocks edits, add, individual remove, and repeated stale submissions', async () => {
  const attempts = []; let finish;
  const h = harness({ onRemove: roots => { attempts.push([...roots]); return new Promise(resolve => { finish = resolve; }); } });
  h.check(h.root(A), true);
  const staleSubmit = h.bulk().props.onClick, pending = staleSubmit();
  await staleSubmit(); h.render();
  assert.deepEqual(attempts, [[A]]);
  for (const control of nodes(h.tree).filter(node => node.type === 'button' || node.type === 'input')) assert.equal(control.props.disabled, true);
  finish(true); await pending; h.render();
  assert.equal(h.root(A).props.checked, false);
  assert.equal(h.button('添加素材文件夹').props.disabled, false);
});

test('scan or outer busy state disables every location action without losing the selection', () => {
  const h = harness(); h.check(h.root(B), true); h.render({ disabled: true });
  for (const control of nodes(h.tree).filter(node => node.type === 'button' || node.type === 'input')) assert.equal(control.props.disabled, true);
  h.render({ disabled: false });
  assert.equal(h.root(B).props.checked, true);
  h.button('取消勾选').props.onClick(); h.render();
  assert.equal(h.root(B).props.checked, false);
});

test('the empty list disables selection/removal and still offers adding a location', async () => {
  let added = 0; const h = harness({ roots: [], onAdd: async () => { added++; } });
  assert.equal(h.master().props.disabled, true);
  assert.equal(h.master().props.checked, false);
  assert.equal(h.bulk().props.disabled, true);
  assert.equal(h.button('取消勾选').props.disabled, true);
  await h.bulk().props.onClick(); assert.deepEqual(h.calls, []);
  await h.button('添加素材文件夹').props.onClick(); assert.equal(added, 1);
});

test('individual removal retains its accessible hook, manual-source badge and unrelated checked paths', async () => {
  const h = harness({ directSources: [A] });
  h.check(h.root(B), true);
  const remove = h.find(node => node.type === 'button' && node.props['data-remove-root'] === A);
  assert.equal(remove.props['aria-label'], '移除素材路径：' + A);
  assert(text(h.tree).includes('手动添加'));
  assert(text(h.tree).includes('原文件和标注'));
  assert(text(h.tree).includes('保留原文件和标注'));
  await remove.props.onClick(); h.render();
  assert.deepEqual(h.calls, [[A]]);
  assert.equal(h.root(B).props.checked, true);
  assert(h.find(node => node.props?.['data-setting'] === 'source-locations'));
});
