# SPACE LIBRARY 3D Cloud Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate black-background 3D cloud graph preview page for SPACE LIBRARY without replacing the current 2D page.

**Architecture:** Add one new static HTML page that loads the existing graph JSON shape and renders it with `3d-force-graph`. Keep shared behavior conceptually aligned with the current page: URL data parameter, explicit filter apply/clear, detail overlay, image gallery, and project metadata.

**Tech Stack:** Static HTML/CSS/JavaScript, `3d-force-graph` from CDN, existing JSON graph data, Node built-in test runner.

---

## File Structure

- Create: `space-library-cloud-3d.html`
  - Full-screen black WebGL graph page.
  - Loads `3d-force-graph` from CDN.
  - Supports `?data=...` with the same safe local-path behavior as the current page.
  - Provides dark controls, filters, tooltip, detail panel, and lightbox.

- Modify: `tests/frontend-static.test.mjs`
  - Keep existing assertions for the 2D page.
  - Add static assertions for the new 3D page.

- Optional runtime artifact, not committed: `generated/notion-graph.json`
  - Used only if the local Notion generation file exists.

---

### Task 1: Add failing static tests for the 3D page

**Files:**
- Modify: `tests/frontend-static.test.mjs`

- [ ] **Step 1: Add 3D page fixture loading**

Add this near the existing `html` constant:

```js
const html3d = readFileSync('space-library-cloud-3d.html', 'utf8');
```

- [ ] **Step 2: Add tests that define the required 3D page contract**

Append these tests:

```js
test('3d cloud page loads 3d-force-graph and keeps the local data parameter guard', () => {
  assert.match(html3d, /3d-force-graph/);
  assert.match(html3d, /function getGraphDataUrl\(/);
  assert.match(html3d, /requested\.includes\('\.\.'\)/);
  assert.match(html3d, /space-library-graph\.json/);
});

test('3d cloud page keeps explicit filter apply and clear controls', () => {
  assert.match(html3d, /id="applyFilters"/);
  assert.match(html3d, /id="clearFilters"/);
  assert.match(html3d, /function applyFilters\(/);
  assert.match(html3d, /function clearFilters\(/);
});

test('3d cloud page includes detail gallery and project metadata rendering', () => {
  assert.match(html3d, /function getDetailImages\(/);
  assert.match(html3d, /function renderProjectMeta\(/);
  assert.match(html3d, /detailImages\.map/);
  assert.match(html3d, /project-meta/);
});
```

- [ ] **Step 3: Run the static tests and confirm they fail**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected:

- FAIL because `space-library-cloud-3d.html` does not exist yet.

---

### Task 2: Create the 3D preview page shell

**Files:**
- Create: `space-library-cloud-3d.html`

- [ ] **Step 1: Create the HTML shell**

Create a complete HTML file with:

- `<!DOCTYPE html>`
- `<html lang="zh-CN">`
- `<meta charset="UTF-8">`
- mobile viewport meta
- title: `SPACE LIBRARY 空间产品库 · 3D 知识关系云图`
- CDN script: `https://unpkg.com/3d-force-graph`
- black full-screen body
- fixed top dark-glass controls
- `#graph-container`
- `#tooltip`
- `#detailOverlay`
- `#lightbox`

The controls must include these exact IDs:

```html
<input type="text" id="searchInput" placeholder="搜索空间、活动、学校类型..." />
<select class="filter-select" id="activityFilter"><option value="">活动内容</option></select>
<select class="filter-select" id="roomFilter"><option value="">房间类型</option></select>
<select class="filter-select" id="schoolFilter"><option value="">学校类型</option></select>
<button class="filter-apply" id="applyFilters">确定</button>
<button class="filter-clear" id="clearFilters">清除</button>
```

- [ ] **Step 2: Add the same data URL guard**

Add this JavaScript exactly:

```js
function getGraphDataUrl() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('data');
  if (!requested) return 'space-library-graph.json';
  if (/^https?:\/\//i.test(requested) || requested.includes('..')) {
    return 'space-library-graph.json';
  }
  return requested;
}
```

- [ ] **Step 3: Run the static tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected:

- Still FAIL until graph initialization, filter functions, and detail renderers are added.

---

### Task 3: Implement graph loading, sizing, and 3D rendering

**Files:**
- Modify: `space-library-cloud-3d.html`

- [ ] **Step 1: Add graph loading**

Add:

```js
const GRAPH_DATA_URL = getGraphDataUrl();

async function loadGraphData() {
  try {
    const response = await fetch(GRAPH_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    initGraph(data);
  } catch (error) {
    document.getElementById('graph-container').innerHTML =
      `<div class="load-error">图谱数据加载失败：${error.message}</div>`;
    console.error('Failed to load graph data', error);
  }
}

loadGraphData();
```

- [ ] **Step 2: Normalize graph links and build lookup maps**

Inside `initGraph(data)`, create:

```js
const graphData = {
  categories: data.categories || [],
  nodes: (data.nodes || []).map(node => ({ ...node })),
  links: (data.links || []).map(link => ({
    ...link,
    source: typeof link.source === 'object' ? link.source.id : link.source,
    target: typeof link.target === 'object' ? link.target.id : link.target
  }))
};
const nodesById = new Map(graphData.nodes.map(node => [node.id, node]));
const colorMap = {};
graphData.categories.forEach(category => { colorMap[category.name] = category.color; });
```

- [ ] **Step 3: Add node visual helpers**

Add helpers:

```js
function nodeSize(node) {
  if (node.category === '项目') return Math.max(7, (node.size || 16) * 0.42);
  if (node.category === '空间产品') return Math.max(2.2, (node.size || 8) * 0.2);
  return Math.max(4, (node.size || 12) * 0.32);
}

function nodeOpacity(node) {
  if (node.category === '空间产品') return 0.42;
  if (node.category === '项目') return 0.95;
  return 0.78;
}

function nodeColor(node) {
  return colorMap[node.category] || '#8ea2ff';
}
```

- [ ] **Step 4: Initialize `ForceGraph3D`**

Create the graph:

```js
const Graph = ForceGraph3D()(document.getElementById('graph-container'))
  .backgroundColor('#020308')
  .graphData(cloneGraph(graphData))
  .nodeLabel(node => `${node.category} · ${node.label}`)
  .nodeColor(nodeColor)
  .nodeOpacity(nodeOpacity)
  .nodeRelSize(4)
  .nodeVal(nodeSize)
  .linkColor(() => 'rgba(150,170,255,0.18)')
  .linkOpacity(0.18)
  .linkWidth(0.35)
  .onNodeHover(showTooltip)
  .onNodeClick(handleNodeClick);
```

- [ ] **Step 5: Add resize handling**

Add:

```js
window.addEventListener('resize', () => {
  Graph.width(window.innerWidth);
  Graph.height(window.innerHeight);
});
```

- [ ] **Step 6: Run the static tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected:

- Still FAIL until filter and detail functions are added.

---

### Task 4: Implement filters, search focus, and detail panels

**Files:**
- Modify: `space-library-cloud-3d.html`

- [ ] **Step 1: Fill filter dropdowns**

Add:

```js
function fillFilter(selectId, categoryName) {
  const select = document.getElementById(selectId);
  graphData.nodes
    .filter(node => node.category === categoryName)
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    .forEach(node => {
      const option = document.createElement('option');
      option.value = node.id;
      option.textContent = node.label;
      select.appendChild(option);
    });
}
```

Call it for:

```js
fillFilter('activityFilter', '活动内容');
fillFilter('roomFilter', '房间类型');
fillFilter('schoolFilter', '学校类型');
```

- [ ] **Step 2: Add explicit filter functions**

Add:

```js
function selectedFilterId() {
  return document.getElementById('activityFilter').value ||
    document.getElementById('roomFilter').value ||
    document.getElementById('schoolFilter').value ||
    '';
}

function subgraphForNode(nodeId) {
  if (!nodeId) return cloneGraph(graphData);
  const connected = new Set([nodeId]);
  graphData.links.forEach(link => {
    if (link.source === nodeId) connected.add(link.target);
    if (link.target === nodeId) connected.add(link.source);
  });
  const visibleLinks = graphData.links.filter(link =>
    connected.has(link.source) && connected.has(link.target)
  );
  return {
    nodes: graphData.nodes.filter(node => connected.has(node.id)),
    links: visibleLinks
  };
}

function applyFilters() {
  const filterId = selectedFilterId();
  const nextGraph = subgraphForNode(filterId);
  Graph.graphData(cloneGraph(nextGraph));
  updateStats(nextGraph);
}

function clearFilters() {
  document.getElementById('activityFilter').value = '';
  document.getElementById('roomFilter').value = '';
  document.getElementById('schoolFilter').value = '';
  document.getElementById('searchInput').value = '';
  Graph.graphData(cloneGraph(graphData));
  updateStats(graphData);
}
```

Wire:

```js
document.getElementById('applyFilters').onclick = applyFilters;
document.getElementById('clearFilters').onclick = clearFilters;
```

- [ ] **Step 3: Add detail image and metadata renderers**

Add:

```js
function getDetailImages(node, relations) {
  const images = new Set(Array.isArray(node.images) ? node.images : []);
  relations.forEach(rel => {
    if (Array.isArray(rel.images)) rel.images.forEach(image => images.add(image));
  });
  return Array.from(images).slice(0, 12);
}

function renderProjectMeta(node) {
  const project = node.meta && node.meta.project;
  if (!project) return '';
  const rows = [
    ['项目状态', project.status],
    ['学校类型', project.schoolType],
    ['项目周期', project.period],
    ['空间数量', project.spaceCount],
    ['EVA 目录', project.evaPath],
    ['项目描述', project.description]
  ].filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== '');
  if (!rows.length) return '';
  return `<div class="project-meta">${rows.map(([label, value]) =>
    `<div class="meta-label">${label}</div><div class="meta-value">${value}</div>`
  ).join('')}</div>`;
}
```

- [ ] **Step 4: Add click panel renderer**

Add:

```js
function handleNodeClick(node) {
  const relations = relatedNodes(node.id);
  const detailImages = getDetailImages(node, relations);
  const panel = document.getElementById('detailPanel');
  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-color-dot" style="background:${nodeColor(node)}"></div>
      <div>
        <h2>${node.label}</h2>
        <div class="detail-category">${node.category}</div>
      </div>
      <button class="detail-close" onclick="closeDetail()">×</button>
    </div>
    <div class="detail-body">
      ${renderProjectMeta(node)}
      ${detailImages.length ? `<div class="detail-gallery">${detailImages.map(image =>
        `<img src="${image}" alt="${node.label}" onclick="openLightbox('${image.replace(/'/g, "\\'")}')">`
      ).join('')}</div>` : ''}
      <div class="detail-section-title">关联节点</div>
      <div class="detail-relations">${relations.slice(0, 30).map(rel =>
        `<button class="detail-rel-chip" data-node-id="${rel.id}">${rel.label}</button>`
      ).join('')}</div>
    </div>`;
  document.getElementById('detailOverlay').classList.add('active');
}
```

- [ ] **Step 5: Run the static tests**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
```

Expected:

- PASS.

---

### Task 5: Verify locally in browser and commit

**Files:**
- Read: `space-library-cloud-3d.html`
- Read: `tests/frontend-static.test.mjs`

- [ ] **Step 1: Run the full local test set**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\frontend-static.test.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'tests\graph-detail-images.test.mjs'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\notion-graph-lib.test.mjs'
```

Expected:

- All tests pass.

- [ ] **Step 2: Start or reuse the local static server**

Run only if `localhost:8080` is not already serving this worktree:

```powershell
Start-Process -FilePath python -ArgumentList '-m','http.server','8080' -WorkingDirectory 'C:\Users\Administrator\.codex\worktrees\4515\Cloud diagram' -WindowStyle Hidden
```

- [ ] **Step 3: Open and verify the preview URL**

Open:

```text
http://localhost:8080/space-library-cloud-3d.html
```

If generated Notion data exists, also open:

```text
http://localhost:8080/space-library-cloud-3d.html?data=generated/notion-graph.json
```

Expected:

- Black full-screen 3D graph appears.
- Mouse drag rotates the graph.
- Mouse wheel zooms.
- Filter dropdowns populate.
- Clicking `确定` changes the graph only then.
- Clicking `清除` resets.
- Clicking a node opens the floating detail panel.
- Images appear in the detail gallery when present.

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add space-library-cloud-3d.html tests/frontend-static.test.mjs
git commit -m "Add 3D cloud graph preview"
```

Expected:

- New commit on `frontend-3d-cloud-preview`.

---

## Self-Review

- Spec coverage: The plan covers separate 3D page, black full-screen visual, existing data loading, explicit filters, detail panel, images, tests, and local browser verification.
- Scope check: The plan does not include backend, Notion sync changes, accounts, or replacing the current 2D page.
- Placeholder scan: No TBD or deferred implementation placeholders remain.
- Type consistency: The plan consistently uses `graphData`, `nodesById`, `cloneGraph`, `applyFilters`, `clearFilters`, `getDetailImages`, and `renderProjectMeta`. The implementation task must define `cloneGraph`, `relatedNodes`, `updateStats`, `closeDetail`, and `openLightbox` inside `space-library-cloud-3d.html`.
