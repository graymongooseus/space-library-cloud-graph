# Admin Display Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight local admin page and override merge path for hover tags, detail notes, and graph style tuning.

**Architecture:** Keep Notion as the core source for text data and relations only. Images are already hosted separately on the VPS and are not synced from Notion by this feature. Add a focused override library that merges `admin/display-overrides.json` into generated graph data, write `generated/notion-graph-merged.json` during generation, and let the admin page edit/export the override JSON without a server. Existing 2D and 3D pages gain display support for merged hover/detail/style fields while still loading normal graph JSON when overrides are absent.

**Tech Stack:** Node.js ES modules, Node built-in test runner, static HTML/CSS/JavaScript, existing D3 and 3D force graph pages.

---

## File Structure

- Create `scripts/display-overrides-lib.mjs`: pure merge and validation helpers.
- Create `tests/display-overrides-lib.test.mjs`: unit tests for merge behavior, missing overrides, orphan detection, and invalid style fallback.
- Modify `scripts/generate-notion-graph.mjs`: load optional local overrides and write `generated/notion-graph-merged.json`.
- Create `admin/display-overrides.json`: empty initial override file.
- Create `admin/display-admin.html`: local static admin UI for editing and exporting overrides.
- Modify `space-library-cloud.html`: show `hoverTag`, render `detailNote`, and apply category/link theme overrides in 2D.
- Modify `space-library-cloud-3d.html`: show `hoverTag`, render `detailNote`, and apply theme overrides in 3D.
- Modify `tests/frontend-static.test.mjs`: assert the two frontend pages contain the new display hooks.

Do not modify Notion database fields in this implementation. Do not add a local HTTP API in this implementation. Do not add image upload, image hosting, or Notion image syncing.

---

### Task 1: Add Pure Override Merge Library

**Files:**
- Create: `scripts/display-overrides-lib.mjs`
- Create: `tests/display-overrides-lib.test.mjs`

- [ ] **Step 1: Write the failing merge tests**

Create `tests/display-overrides-lib.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyDisplayOverrides,
  mergeGraphWithOverrides,
  normalizeDisplayOverrides,
} from '../scripts/display-overrides-lib.mjs';

const baseGraph = {
  categories: [
    { name: '项目', color: '#2d3436' },
    { name: '空间产品', color: '#0984e3' },
  ],
  nodes: [
    { id: 'project_a', label: 'Project A', category: '项目', size: 16, description: 'From Notion' },
    { id: 'space_a', label: 'Space A', category: '空间产品', size: 8, description: 'Space from Notion' },
  ],
  links: [
    { source: 'space_a', target: 'project_a', relation: '相关项目' },
  ],
};

test('emptyDisplayOverrides returns the supported override shape', () => {
  assert.deepEqual(emptyDisplayOverrides(), {
    nodes: {},
    theme: { categories: {}, links: {}, scene3d: {} },
  });
});

test('merges node hover tags and detail notes without replacing Notion fields', () => {
  const merged = mergeGraphWithOverrides(baseGraph, {
    nodes: {
      project_a: {
        hoverTag: '重点案例',
        detailNote: '后台补充说明',
      },
    },
  });

  const project = merged.nodes.find((node) => node.id === 'project_a');
  assert.equal(project.label, 'Project A');
  assert.equal(project.description, 'From Notion');
  assert.equal(project.display.hoverTag, '重点案例');
  assert.equal(project.display.detailNote, '后台补充说明');
});

test('applies valid category and link theme overrides', () => {
  const merged = mergeGraphWithOverrides(baseGraph, {
    theme: {
      categories: {
        '项目': { color: '#ff8fbd', sizeScale: 1.1, opacity: 0.9 },
      },
      links: { opacity: 0.4, width: 1.2 },
      scene3d: { backgroundColor: '#000106', glowStrength: 1.3 },
    },
  });

  assert.equal(merged.categories.find((category) => category.name === '项目').color, '#ff8fbd');
  assert.deepEqual(merged.displayTheme.categories['项目'], {
    color: '#ff8fbd',
    sizeScale: 1.1,
    opacity: 0.9,
  });
  assert.deepEqual(merged.displayTheme.links, { opacity: 0.4, width: 1.2 });
  assert.deepEqual(merged.displayTheme.scene3d, { backgroundColor: '#000106', glowStrength: 1.3 });
});

test('ignores invalid theme values and records orphaned override node ids', () => {
  const merged = mergeGraphWithOverrides(baseGraph, {
    nodes: {
      missing_node: { hoverTag: 'orphan' },
    },
    theme: {
      categories: {
        '项目': { color: 'red', sizeScale: -1, opacity: 3 },
      },
      links: { opacity: 'wide', width: -2 },
      scene3d: { backgroundColor: 'black', glowStrength: -1 },
    },
  });

  assert.equal(merged.categories.find((category) => category.name === '项目').color, '#2d3436');
  assert.deepEqual(merged.displayTheme.categories, {});
  assert.deepEqual(merged.displayTheme.links, {});
  assert.deepEqual(merged.displayTheme.scene3d, {});
  assert.deepEqual(merged.displayMeta.orphanNodeOverrides, ['missing_node']);
});

test('normalizeDisplayOverrides tolerates missing sections', () => {
  assert.deepEqual(normalizeDisplayOverrides({}), emptyDisplayOverrides());
  assert.deepEqual(normalizeDisplayOverrides(null), emptyDisplayOverrides());
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\display-overrides-lib.test.mjs'
```

Expected: FAIL because `scripts/display-overrides-lib.mjs` does not exist.

- [ ] **Step 3: Implement the minimal merge library**

Create `scripts/display-overrides-lib.mjs` with:

```js
const DEFAULT_THEME = Object.freeze({
  categories: {},
  links: {},
  scene3d: {},
});

export function emptyDisplayOverrides() {
  return {
    nodes: {},
    theme: {
      categories: {},
      links: {},
      scene3d: {},
    },
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function validColor(value) {
  const color = cleanText(value);
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : '';
}

function validNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  if (number < min || number > max) return undefined;
  return number;
}

export function normalizeDisplayOverrides(rawOverrides) {
  const raw = isPlainObject(rawOverrides) ? rawOverrides : {};
  const normalized = emptyDisplayOverrides();

  if (isPlainObject(raw.nodes)) {
    for (const [nodeId, nodeOverride] of Object.entries(raw.nodes)) {
      if (!isPlainObject(nodeOverride)) continue;
      const hoverTag = cleanText(nodeOverride.hoverTag);
      const detailNote = cleanText(nodeOverride.detailNote);
      const display = {};
      if (hoverTag) display.hoverTag = hoverTag;
      if (detailNote) display.detailNote = detailNote;
      if (Object.keys(display).length) normalized.nodes[nodeId] = display;
    }
  }

  const rawTheme = isPlainObject(raw.theme) ? raw.theme : DEFAULT_THEME;
  if (isPlainObject(rawTheme.categories)) {
    for (const [categoryName, categoryOverride] of Object.entries(rawTheme.categories)) {
      if (!isPlainObject(categoryOverride)) continue;
      const color = validColor(categoryOverride.color);
      const sizeScale = validNumber(categoryOverride.sizeScale, 0.2, 4);
      const opacity = validNumber(categoryOverride.opacity, 0, 1);
      const display = {};
      if (color) display.color = color;
      if (sizeScale !== undefined) display.sizeScale = sizeScale;
      if (opacity !== undefined) display.opacity = opacity;
      if (Object.keys(display).length) normalized.theme.categories[categoryName] = display;
    }
  }

  if (isPlainObject(rawTheme.links)) {
    const opacity = validNumber(rawTheme.links.opacity, 0, 1);
    const width = validNumber(rawTheme.links.width, 0.1, 8);
    if (opacity !== undefined) normalized.theme.links.opacity = opacity;
    if (width !== undefined) normalized.theme.links.width = width;
  }

  if (isPlainObject(rawTheme.scene3d)) {
    const backgroundColor = validColor(rawTheme.scene3d.backgroundColor);
    const glowStrength = validNumber(rawTheme.scene3d.glowStrength, 0, 4);
    if (backgroundColor) normalized.theme.scene3d.backgroundColor = backgroundColor;
    if (glowStrength !== undefined) normalized.theme.scene3d.glowStrength = glowStrength;
  }

  return normalized;
}

export function mergeGraphWithOverrides(graph, rawOverrides) {
  const overrides = normalizeDisplayOverrides(rawOverrides);
  const nodeIds = new Set((graph.nodes || []).map((node) => node.id));
  const orphanNodeOverrides = Object.keys(overrides.nodes).filter((nodeId) => !nodeIds.has(nodeId)).sort();

  const categories = (graph.categories || []).map((category) => {
    const categoryOverride = overrides.theme.categories[category.name] || {};
    return {
      ...category,
      ...(categoryOverride.color ? { color: categoryOverride.color } : {}),
    };
  });

  const nodes = (graph.nodes || []).map((node) => {
    const nodeOverride = overrides.nodes[node.id];
    if (!nodeOverride) return { ...node };
    return {
      ...node,
      display: {
        ...(node.display || {}),
        ...nodeOverride,
      },
    };
  });

  return {
    ...graph,
    categories,
    nodes,
    displayTheme: overrides.theme,
    displayMeta: {
      orphanNodeOverrides,
    },
  };
}
```

- [ ] **Step 4: Run the merge tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\display-overrides-lib.test.mjs'
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add 'scripts/display-overrides-lib.mjs' 'tests/display-overrides-lib.test.mjs'
git commit -m "Add display override merge library"
```

Expected: commit succeeds with only those two files staged.

---

### Task 2: Generate Merged Graph Data

**Files:**
- Modify: `scripts/generate-notion-graph.mjs`
- Create: `admin/display-overrides.json`

- [ ] **Step 1: Add the initial empty override file**

Create `admin/display-overrides.json` with:

```json
{
  "nodes": {},
  "theme": {
    "categories": {},
    "links": {},
    "scene3d": {}
  }
}
```

- [ ] **Step 2: Modify the generator imports and paths**

In `scripts/generate-notion-graph.mjs`, change the import block and path constants to:

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mergeGraphWithOverrides } from './display-overrides-lib.mjs';
import { buildGraphFromSpaces } from './notion-graph-lib.mjs';

const root = path.resolve('.');
const envPath = path.join(root, '.env');
const outputPath = path.join(root, 'generated', 'notion-graph.json');
const mergedOutputPath = path.join(root, 'generated', 'notion-graph-merged.json');
const overridesPath = path.join(root, 'admin', 'display-overrides.json');
```

- [ ] **Step 3: Add optional override loading**

Add this function after `loadEnvFile`:

```js
function loadJsonFile(filePath) {
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
```

- [ ] **Step 4: Write both base and merged graph outputs**

Replace the final graph writing block with:

```js
const graph = buildGraphFromSpaces(spaces);
const displayOverrides = loadJsonFile(overridesPath);
const mergedGraph = mergeGraphWithOverrides(graph, displayOverrides);

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
writeFileSync(mergedOutputPath, `${JSON.stringify(mergedGraph, null, 2)}\n`, 'utf8');

console.log(`Fetched spaces: ${spaces.length}`);
console.log(`Resolved projects: ${projectCache.size}`);
console.log(`Graph nodes: ${graph.nodes.length}`);
console.log(`Graph links: ${graph.links.length}`);
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Wrote ${path.relative(root, mergedOutputPath)}`);
```

- [ ] **Step 5: Run generator syntax-level verification**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check 'scripts\generate-notion-graph.mjs'
```

Expected: no output and exit code 0.

- [ ] **Step 6: Run the merge tests again**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\display-overrides-lib.test.mjs'
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```powershell
git add 'scripts/generate-notion-graph.mjs' 'admin/display-overrides.json'
git commit -m "Write merged Notion graph output"
```

Expected: commit succeeds with only those files staged.

---

### Task 3: Add Static Admin Page

**Files:**
- Create: `admin/display-admin.html`
- Modify: `tests/frontend-static.test.mjs`

- [ ] **Step 1: Add static test coverage for the admin page**

Append this test to `tests/frontend-static.test.mjs`:

```js
test('display admin page edits local display overrides without Notion API access', () => {
  const adminHtml = readFileSync('admin/display-admin.html', 'utf8');
  assert.match(adminHtml, /id="nodeSearch"/);
  assert.match(adminHtml, /id="categoryFilter"/);
  assert.match(adminHtml, /id="hoverTag"/);
  assert.match(adminHtml, /id="detailNote"/);
  assert.match(adminHtml, /id="themeEditor"/);
  assert.match(adminHtml, /function saveOverrides/);
  assert.match(adminHtml, /showSaveFilePicker/);
  assert.doesNotMatch(adminHtml, /NOTION_TOKEN/);
  assert.doesNotMatch(adminHtml, /api\.notion\.com/);
});
```

- [ ] **Step 2: Run the static test to verify it fails**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: FAIL because `admin/display-admin.html` does not exist.

- [ ] **Step 3: Create the admin HTML**

Create `admin/display-admin.html` with a compact static page. Include these exact functional anchors:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SPACE LIBRARY Display Admin</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; background: #f6f7f9; }
.app { display: grid; grid-template-columns: 320px 1fr 340px; min-height: 100vh; }
header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #ddd; }
h1 { margin: 0; font-size: 18px; }
button, input, textarea, select { font: inherit; }
button { height: 34px; padding: 0 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
button.primary { color: #fff; background: #1f2937; border-color: #1f2937; }
aside, main { padding: 16px; }
aside { background: #fff; border-right: 1px solid #ddd; }
.right { border-right: 0; border-left: 1px solid #ddd; }
.field { display: grid; gap: 6px; margin-bottom: 14px; }
label { font-size: 12px; font-weight: 700; color: #666; }
input, textarea, select { width: 100%; border: 1px solid #ccc; border-radius: 6px; padding: 8px 10px; background: #fff; }
textarea { min-height: 150px; resize: vertical; }
.node-list { display: grid; gap: 8px; max-height: calc(100vh - 190px); overflow: auto; }
.node-item { padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; }
.node-item.active { border-color: #1f2937; box-shadow: 0 0 0 2px rgba(31,41,55,0.12); }
.muted { color: #777; font-size: 13px; }
.theme-row { display: grid; grid-template-columns: 1fr 88px 80px 80px; gap: 8px; align-items: center; margin-bottom: 8px; }
.status { min-height: 20px; color: #666; font-size: 13px; }
@media (max-width: 980px) { .app { grid-template-columns: 1fr; } header { grid-column: auto; } aside, .right { border: 0; border-bottom: 1px solid #ddd; } }
</style>
</head>
<body>
<div class="app">
  <header>
    <div>
      <h1>SPACE LIBRARY Display Admin</h1>
      <div class="muted">编辑 hover 标签、弹窗补充说明和基础样式；Notion 主数据仍在 Notion 修改。</div>
    </div>
    <div>
      <button id="reloadData">重新加载</button>
      <button class="primary" id="saveOverrides">保存 overrides</button>
      <button id="openPreview">打开 3D 预览</button>
    </div>
  </header>

  <aside>
    <div class="field">
      <label for="nodeSearch">搜索节点</label>
      <input id="nodeSearch" type="search" placeholder="项目、空间、类别">
    </div>
    <div class="field">
      <label for="categoryFilter">类别</label>
      <select id="categoryFilter"><option value="">全部类别</option></select>
    </div>
    <div class="node-list" id="nodeList"></div>
  </aside>

  <main>
    <div class="field">
      <label>当前节点</label>
      <div id="selectedNode" class="muted">请选择左侧节点</div>
    </div>
    <div class="field">
      <label for="hoverTag">Hover 自定义短字段</label>
      <input id="hoverTag" maxlength="80" placeholder="例如：重点案例">
    </div>
    <div class="field">
      <label for="detailNote">点击弹窗补充说明</label>
      <textarea id="detailNote" placeholder="写给图谱弹窗展示的补充说明"></textarea>
    </div>
    <div class="status" id="status"></div>
  </main>

  <aside class="right">
    <h2>样式</h2>
    <div id="themeEditor"></div>
    <div class="field">
      <label for="linkOpacity">连接线透明度</label>
      <input id="linkOpacity" type="number" min="0" max="1" step="0.01">
    </div>
    <div class="field">
      <label for="linkWidth">连接线宽度</label>
      <input id="linkWidth" type="number" min="0.1" max="8" step="0.1">
    </div>
    <div class="field">
      <label for="backgroundColor">3D 背景色</label>
      <input id="backgroundColor" type="color">
    </div>
    <div class="field">
      <label for="glowStrength">3D 发光强度</label>
      <input id="glowStrength" type="number" min="0" max="4" step="0.1">
    </div>
  </aside>
</div>

<script>
const GRAPH_URL = '../generated/notion-graph.json';
const OVERRIDES_URL = 'display-overrides.json';
let graph = { categories: [], nodes: [], links: [] };
let overrides = { nodes: {}, theme: { categories: {}, links: {}, scene3d: {} } };
let selectedNodeId = '';

function emptyOverrides() {
  return { nodes: {}, theme: { categories: {}, links: {}, scene3d: {} } };
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function ensureOverrideShape() {
  overrides.nodes ||= {};
  overrides.theme ||= {};
  overrides.theme.categories ||= {};
  overrides.theme.links ||= {};
  overrides.theme.scene3d ||= {};
}

async function loadData() {
  graph = await fetchJson(GRAPH_URL, graph);
  overrides = await fetchJson(OVERRIDES_URL, emptyOverrides());
  ensureOverrideShape();
  selectedNodeId = graph.nodes[0]?.id || '';
  renderCategoryFilter();
  renderNodeList();
  renderEditor();
  renderThemeEditor();
  setStatus('已加载图谱和 overrides。');
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function renderCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  const current = select.value;
  select.innerHTML = '<option value="">全部类别</option>';
  for (const category of graph.categories || []) {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    select.appendChild(option);
  }
  select.value = current;
}

function filteredNodes() {
  const query = document.getElementById('nodeSearch').value.trim().toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  return (graph.nodes || []).filter((node) => {
    const matchesCategory = !category || node.category === category;
    const haystack = `${node.id} ${node.label || ''} ${node.category || ''}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderNodeList() {
  const list = document.getElementById('nodeList');
  list.innerHTML = '';
  for (const node of filteredNodes()) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `node-item${node.id === selectedNodeId ? ' active' : ''}`;
    item.innerHTML = `<strong>${escapeHtml(node.label || node.id)}</strong><div class="muted">${escapeHtml(node.category || '')}</div>`;
    item.onclick = () => {
      selectedNodeId = node.id;
      renderNodeList();
      renderEditor();
    };
    list.appendChild(item);
  }
}

function renderEditor() {
  const node = graph.nodes.find((item) => item.id === selectedNodeId);
  const nodeOverride = overrides.nodes[selectedNodeId] || {};
  document.getElementById('selectedNode').textContent = node ? `${node.label || node.id} · ${node.category || ''}` : '请选择左侧节点';
  document.getElementById('hoverTag').value = nodeOverride.hoverTag || '';
  document.getElementById('detailNote').value = nodeOverride.detailNote || '';
}

function writeNodeOverride() {
  if (!selectedNodeId) return;
  const hoverTag = document.getElementById('hoverTag').value.trim();
  const detailNote = document.getElementById('detailNote').value.trim();
  if (!hoverTag && !detailNote) {
    delete overrides.nodes[selectedNodeId];
    return;
  }
  overrides.nodes[selectedNodeId] = {};
  if (hoverTag) overrides.nodes[selectedNodeId].hoverTag = hoverTag;
  if (detailNote) overrides.nodes[selectedNodeId].detailNote = detailNote;
}

function renderThemeEditor() {
  const editor = document.getElementById('themeEditor');
  editor.innerHTML = '';
  for (const category of graph.categories || []) {
    const categoryOverride = overrides.theme.categories[category.name] || {};
    const row = document.createElement('div');
    row.className = 'theme-row';
    row.innerHTML = `
      <span>${escapeHtml(category.name)}</span>
      <input type="color" data-theme-color="${escapeHtml(category.name)}" value="${categoryOverride.color || category.color || '#888888'}">
      <input type="number" min="0.2" max="4" step="0.05" data-theme-size="${escapeHtml(category.name)}" value="${categoryOverride.sizeScale || ''}" placeholder="倍率">
      <input type="number" min="0" max="1" step="0.01" data-theme-opacity="${escapeHtml(category.name)}" value="${categoryOverride.opacity ?? ''}" placeholder="透明度">
    `;
    editor.appendChild(row);
  }
  document.getElementById('linkOpacity').value = overrides.theme.links.opacity ?? '';
  document.getElementById('linkWidth').value = overrides.theme.links.width ?? '';
  document.getElementById('backgroundColor').value = overrides.theme.scene3d.backgroundColor || '#000106';
  document.getElementById('glowStrength').value = overrides.theme.scene3d.glowStrength ?? '';
}

function writeThemeOverrides() {
  overrides.theme.categories = {};
  for (const category of graph.categories || []) {
    const color = document.querySelector(`[data-theme-color="${CSS.escape(category.name)}"]`)?.value;
    const sizeScale = document.querySelector(`[data-theme-size="${CSS.escape(category.name)}"]`)?.value;
    const opacity = document.querySelector(`[data-theme-opacity="${CSS.escape(category.name)}"]`)?.value;
    const next = {};
    if (color && color !== category.color) next.color = color;
    if (sizeScale) next.sizeScale = Number(sizeScale);
    if (opacity) next.opacity = Number(opacity);
    if (Object.keys(next).length) overrides.theme.categories[category.name] = next;
  }
  overrides.theme.links = {};
  if (document.getElementById('linkOpacity').value) overrides.theme.links.opacity = Number(document.getElementById('linkOpacity').value);
  if (document.getElementById('linkWidth').value) overrides.theme.links.width = Number(document.getElementById('linkWidth').value);
  overrides.theme.scene3d = {};
  if (document.getElementById('backgroundColor').value) overrides.theme.scene3d.backgroundColor = document.getElementById('backgroundColor').value;
  if (document.getElementById('glowStrength').value) overrides.theme.scene3d.glowStrength = Number(document.getElementById('glowStrength').value);
}

async function saveOverrides() {
  writeNodeOverride();
  writeThemeOverrides();
  const content = `${JSON.stringify(overrides, null, 2)}\n`;
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'display-overrides.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    setStatus('overrides 已保存。');
    return;
  }
  const blob = new Blob([content], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'display-overrides.json';
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus('浏览器已下载 overrides JSON。');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

document.getElementById('nodeSearch').addEventListener('input', renderNodeList);
document.getElementById('categoryFilter').addEventListener('change', renderNodeList);
document.getElementById('hoverTag').addEventListener('input', writeNodeOverride);
document.getElementById('detailNote').addEventListener('input', writeNodeOverride);
document.getElementById('reloadData').onclick = loadData;
document.getElementById('saveOverrides').onclick = saveOverrides;
document.getElementById('openPreview').onclick = () => window.open('../space-library-cloud-3d.html?data=generated/notion-graph-merged.json', '_blank');
loadData();
</script>
</body>
</html>
```

- [ ] **Step 4: Run the frontend static test**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: PASS for the new admin assertions, unless unrelated existing dirty frontend changes have broken older assertions.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add 'admin/display-admin.html' 'tests/frontend-static.test.mjs'
git commit -m "Add display override admin page"
```

Expected: commit succeeds with only those files staged.

---

### Task 4: Render Overrides in 2D Graph

**Files:**
- Modify: `space-library-cloud.html`
- Modify: `tests/frontend-static.test.mjs`

- [ ] **Step 1: Add static assertions for 2D display override hooks**

Append these assertions to the existing relevant frontend tests or create a new test in `tests/frontend-static.test.mjs`:

```js
test('2d cloud page renders display override hover tags and detail notes', () => {
  assert.match(html, /function categoryTheme\(/);
  assert.match(html, /function nodeHoverTag\(/);
  assert.match(html, /function renderDetailNote\(/);
  assert.match(html, /displayTheme/);
  assert.match(html, /hoverTag/);
  assert.match(html, /detailNote/);
});
```

- [ ] **Step 2: Run the static test to verify it fails**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: FAIL because `space-library-cloud.html` does not yet define the display override hooks.

- [ ] **Step 3: Add display helper functions in `initGraph(data)`**

After `const colorMap = {}; graphData.categories.forEach(c => colorMap[c.name] = c.color);`, add:

```js
  const displayTheme = graphData.displayTheme || { categories: {}, links: {}, scene3d: {} };

  function categoryTheme(categoryName) {
    return (displayTheme.categories && displayTheme.categories[categoryName]) || {};
  }

  function nodeColorValue(d) {
    return categoryTheme(d.category).color || colorMap[d.category] || '#999';
  }

  function nodeSizeScale(d) {
    const scale = Number(categoryTheme(d.category).sizeScale);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function nodeHoverTag(d) {
    return d.display && d.display.hoverTag ? d.display.hoverTag : '';
  }

  function renderDetailNote(d) {
    const note = d.display && d.display.detailNote ? d.display.detailNote : '';
    if (!note) return '';
    return `<div class="detail-section-title">补充说明</div><p>${escapeHtml(note)}</p>`;
  }
```

- [ ] **Step 4: Apply theme values to 2D rendering**

Change these existing expressions:

```js
.attr('stroke', '#bbb').attr('stroke-width', 1.2);
```

to:

```js
.attr('stroke', '#bbb').attr('stroke-width', displayTheme.links?.width || 1.2);
```

Change `nodeRadius(d)` to multiply by the scale:

```js
  function nodeRadius(d) {
    const base = d.category === '空间产品' ? (d.size || 8) : (d.size || 14);
    return base * nodeSizeScale(d);
  }
```

Change `nodeOpacity(d)` to respect category opacity:

```js
  function nodeOpacity(d) {
    const themeOpacity = Number(categoryTheme(d.category).opacity);
    if (Number.isFinite(themeOpacity)) return themeOpacity;
    if (d.category === '空间产品') return 0.42;
    return 0.85;
  }
```

Change circle fill:

```js
.attr('fill', d => colorMap[d.category] || '#999')
```

to:

```js
.attr('fill', d => nodeColorValue(d))
```

Change default link opacity resets from hard-coded `0.25` to:

```js
displayTheme.links?.opacity ?? 0.25
```

- [ ] **Step 5: Render hover tag and detail note**

In the mouseover handler, replace tooltip category assignment:

```js
tooltip.querySelector('.tt-cat').textContent = d.category;
```

with:

```js
tooltip.querySelector('.tt-cat').textContent = nodeHoverTag(d) || d.category;
```

In the detail panel body, insert `renderDetailNote(d)` after the existing description paragraph:

```js
        <p>${escapeHtml(d.description || '暂无描述')}</p>
        ${renderDetailNote(d)}
```

If the existing description line does not use `escapeHtml`, change it to the exact escaped form above.

- [ ] **Step 6: Run frontend static tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: PASS for 2D override assertions.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git add 'space-library-cloud.html' 'tests/frontend-static.test.mjs'
git commit -m "Render display overrides in 2D graph"
```

Expected: commit succeeds with only those files staged.

---

### Task 5: Render Overrides in 3D Graph

**Files:**
- Modify: `space-library-cloud-3d.html`
- Modify: `tests/frontend-static.test.mjs`

- [ ] **Step 1: Add static assertions for 3D display override hooks**

Append this test to `tests/frontend-static.test.mjs`:

```js
test('3d cloud page renders display override hover tags and detail notes', () => {
  assert.match(html3d, /function categoryTheme\(/);
  assert.match(html3d, /function nodeHoverTag\(/);
  assert.match(html3d, /function renderDetailNote\(/);
  assert.match(html3d, /displayTheme/);
  assert.match(html3d, /hoverTag/);
  assert.match(html3d, /detailNote/);
});
```

- [ ] **Step 2: Run the static test to verify it fails**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: FAIL because `space-library-cloud-3d.html` does not yet define all display override hooks.

- [ ] **Step 3: Add display theme state and helpers**

Near the existing top-level graph state, add:

```js
let displayTheme = { categories: {}, links: {}, scene3d: {} };
```

Inside `initGraph(data)`, after `activeGraph = graphData;`, add:

```js
  displayTheme = data.displayTheme || { categories: {}, links: {}, scene3d: {} };
```

Add these helpers near the visual helper functions:

```js
function categoryTheme(categoryName) {
  return (displayTheme.categories && displayTheme.categories[categoryName]) || {};
}

function nodeHoverTag(node) {
  return node.display && node.display.hoverTag ? node.display.hoverTag : '';
}

function renderDetailNote(node) {
  const note = node.display && node.display.detailNote ? node.display.detailNote : '';
  if (!note) return '';
  return `<div class="detail-section-title">补充说明</div><p>${escapeHtml(note)}</p>`;
}
```

- [ ] **Step 4: Apply display theme in 3D rendering**

In `initGraph(data)`, change:

```js
.backgroundColor('#000106')
```

to:

```js
.backgroundColor(displayTheme.scene3d?.backgroundColor || '#000106')
```

Change:

```js
.linkOpacity(0.28)
.linkWidth(0.34)
```

to:

```js
.linkOpacity(displayTheme.links?.opacity ?? 0.28)
.linkWidth(displayTheme.links?.width ?? 0.34)
```

In `nodeSize(node)`, multiply the final radius by a validated category scale:

```js
  const scale = Number(categoryTheme(node.category).sizeScale);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.max(role.minRadius, Math.min(role.maxRadius, base)) * safeScale;
```

In `nodeOpacity(node)`, before returning `visualRole(node).opacity`, add:

```js
  const themeOpacity = Number(categoryTheme(node.category).opacity);
  if (Number.isFinite(themeOpacity)) return themeOpacity;
```

In `nodeColor(node)`, before project and visual role color handling, add:

```js
  const themeColor = categoryTheme(node.category).color;
  if (themeColor) return themeColor;
```

- [ ] **Step 5: Render hover tag and detail note in 3D**

In `showTooltip(node)`, replace:

```js
tooltip.innerHTML = `<strong>${escapeHtml(node.label || node.id)}</strong><br>${escapeHtml(node.category || '')}`;
```

with:

```js
const secondary = nodeHoverTag(node) || node.category || '';
tooltip.innerHTML = `<strong>${escapeHtml(node.label || node.id)}</strong><br>${escapeHtml(secondary)}`;
```

In the detail panel body, insert `renderDetailNote(node)` after the existing node description paragraph:

```js
        <p>${escapeHtml(node.description || '暂无描述')}</p>
        ${renderDetailNote(node)}
```

- [ ] **Step 6: Run frontend static tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected: PASS for 3D override assertions.

- [ ] **Step 7: Commit Task 5**

Run:

```powershell
git add 'space-library-cloud-3d.html' 'tests/frontend-static.test.mjs'
git commit -m "Render display overrides in 3D graph"
```

Expected: commit succeeds with only those files staged.

---

### Task 6: Final Verification

**Files:**
- No new files unless verification exposes a bug.

- [ ] **Step 1: Run all Node tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\display-overrides-lib.test.mjs' 'tests\notion-graph-lib.test.mjs' 'tests\frontend-static.test.mjs'
```

Expected: PASS.

- [ ] **Step 2: Verify generated merged data path if Notion env is available**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'scripts\generate-notion-graph.mjs'
```

Expected: output includes:

```text
Wrote generated\notion-graph.json
Wrote generated\notion-graph-merged.json
```

If Notion credentials are unavailable or the API fails, record that generator verification was blocked by Notion access and keep the syntax/unit verification result.

- [ ] **Step 3: Start the local static server**

Run:

```powershell
Start-Process -FilePath python -ArgumentList '-m','http.server','8080' -WorkingDirectory 'H:\My Drive\Cloud diagram' -WindowStyle Hidden
```

Expected: local server starts on port 8080. If 8080 is occupied, use 8081 and update preview URLs accordingly.

- [ ] **Step 4: Browser smoke paths**

Open these URLs in the in-app browser:

```text
http://localhost:8080/admin/display-admin.html
http://localhost:8080/space-library-cloud.html?data=generated/notion-graph-merged.json
http://localhost:8080/space-library-cloud-3d.html?data=generated/notion-graph-merged.json
```

Expected: admin loads node list; 2D graph loads; 3D graph loads; no visible load error.

- [ ] **Step 5: Final status check**

Run:

```powershell
git status --short
```

Expected: clean except for pre-existing unrelated user changes, if any were intentionally left untouched.

---

## Self-Review

- Spec coverage: local override JSON, admin UI, hover tag, detail note, theme settings, missing override fallback, invalid style fallback, orphan override detection, and future Notion write-back boundary are covered.
- Scope control: this plan does not add Notion write-back, login, a database, a backend service, image syncing, image upload, or a new framework.
- Type consistency: override fields are consistently named `hoverTag`, `detailNote`, `theme.categories`, `theme.links`, `theme.scene3d`, `displayTheme`, and `displayMeta`.
- Verification: unit tests cover merge behavior; static tests cover frontend/admin hooks; final browser smoke checks cover local usability.
