# Notion Graph Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a preview graph JSON from live Notion SPACE LIBRARY data, with every Notion row as an independent space product node, room type nodes aggregating all matching spaces, and project nodes carrying project database details for richer front-end panels.

**Architecture:** Build a small Node.js ESM converter that reads `.env`, queries the configured Notion data source, resolves project relation page titles, normalizes selected Notion properties, and writes `generated/notion-graph.json`. The existing front-end remains unchanged for now.

**Tech Stack:** Node.js ESM, built-in `fetch`, built-in `node:test`/`assert`, Notion REST API, static JSON graph format used by D3.

---

## File Structure

- Create: `scripts/notion-graph-lib.mjs`
  - Pure helper functions for property extraction, room type normalization, node/link creation, and graph generation.
- Create: `scripts/generate-notion-graph.mjs`
  - CLI script that calls Notion API and writes `generated/notion-graph.json`.
- Create: `tests/notion-graph-lib.test.mjs`
  - Unit tests for graph mapping behavior without network calls.
- Modify: `docs/superpowers/specs/2026-06-01-space-library-interactive-site-design.md`
  - Already updated with independent space nodes and room type aggregation.
- Output at runtime: `generated/notion-graph.json`
  - Preview file only. Do not overwrite `space-library-graph.json` in this task.

Project details come from the configured project database:

- `Project name`
- `项目类型`
- `项目状态`
- `项目优先级`
- `项目周期`
- `项目描述`
- `项目经理`
- `EVA 服务器目录`

The graph should attach these fields to project nodes under `meta.project`, so the front-end can show richer floating project panels later.

## Task 1: Write Failing Unit Tests for Graph Mapping

**Files:**
- Create: `tests/notion-graph-lib.test.mjs`
- Create target later: `scripts/notion-graph-lib.mjs`

- [ ] **Step 1: Add tests for independent space nodes and room type aggregation**

Create `tests/notion-graph-lib.test.mjs` with:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGraphFromSpaces,
  normalizeRoomType,
} from '../scripts/notion-graph-lib.mjs';

test('normalizes common room type labels', () => {
  assert.equal(normalizeRoomType('CANTEEN'), '餐厅 CANTEEN');
  assert.equal(normalizeRoomType('HALLWAY'), '走廊楼梯 HALLWAY');
  assert.equal(normalizeRoomType('REGULAR CLASSROOM'), '普通教室 CLASSROOM');
  assert.equal(normalizeRoomType('RESTROOM / TOILET'), '卫生间 RESTROOM');
  assert.equal(normalizeRoomType('COMMON'), '公共空间 COMMON');
});

test('creates one independent space node per Notion row and links each to its room type', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'page-a',
      name: '走廊楼梯 A',
      roomType: 'HALLWAY',
      schoolType: '国际学校',
      activities: ['DISPLAY'],
      styles: ['现代'],
      cost: '$$ - （￥1000 -￥2000）',
      materials: ['PVC地板'],
      equipment: [],
      projects: [{ id: 'project-1', name: 'Project One' }],
      images: ['uploads/page-a.jpg'],
    },
    {
      id: 'page-b',
      name: '走廊楼梯 B',
      roomType: 'HALLWAY',
      schoolType: '民办双语',
      activities: ['WAITING'],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
      projects: [{ id: 'project-2', name: 'Project Two' }],
      images: [],
    },
  ]);

  const spaceNodes = graph.nodes.filter((node) => node.category === '空间产品');
  assert.equal(spaceNodes.length, 2);
  assert.ok(spaceNodes.some((node) => node.id === 'space_page-a'));
  assert.ok(spaceNodes.some((node) => node.id === 'space_page-b'));

  const roomNode = graph.nodes.find((node) => node.id === 'room_hallway');
  assert.equal(roomNode.label, '走廊楼梯 HALLWAY');

  assert.ok(graph.links.some((link) => link.source === 'space_page-a' && link.target === 'room_hallway'));
  assert.ok(graph.links.some((link) => link.source === 'space_page-b' && link.target === 'room_hallway'));

  const projectNode = graph.nodes.find((node) => node.id === 'project_project_1');
  assert.equal(projectNode.label, 'Project One');
  assert.deepEqual(projectNode.meta.project, {
    id: 'project-1',
    name: 'Project One',
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module does not exist yet**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\notion-graph-lib.test.mjs'
```

Expected: FAIL with module not found for `scripts/notion-graph-lib.mjs`.

## Task 2: Implement Pure Graph Mapping Helpers

**Files:**
- Create: `scripts/notion-graph-lib.mjs`

- [ ] **Step 1: Implement the helper module**

Create `scripts/notion-graph-lib.mjs` with:

```javascript
const CATEGORY_COLORS = {
  学校类型: '#e17055',
  房间类型: '#6c5ce7',
  活动内容: '#00b894',
  空间产品: '#0984e3',
  设计属性: '#fdcb6e',
  项目: '#2d3436',
  材料设备: '#74b9ff',
};

const ROOM_TYPE_LABELS = new Map([
  ['CANTEEN', '餐厅 CANTEEN'],
  ['HALLWAY', '走廊楼梯 HALLWAY'],
  ['HALLWAY / STAIR', '走廊楼梯 HALLWAY'],
  ['REGULAR CLASSROOM', '普通教室 CLASSROOM'],
  ['CLASSROOM', '普通教室 CLASSROOM'],
  ['RESTROOM / TOILET', '卫生间 RESTROOM'],
  ['RESTROOM', '卫生间 RESTROOM'],
  ['COMMON', '公共空间 COMMON'],
  ['LIBRARY', '图书馆 LIBRARY'],
  ['AUDITORIUM / PERFM. CENTER / MUTI-FUNCTION', '剧场报告厅 AUDITORIUM'],
  ['AUDITORIUM', '剧场报告厅 AUDITORIUM'],
  ['MAKER SPACE', '创客空间 MAKER'],
  ['STEAM & LAB', 'STEAM实验室'],
  ['STADIUM', '体育场 STADIUM'],
  ['DORM', '宿舍 DORM'],
  ['ENTRANCE', '门厅 ENTRANCE'],
  ['GYM', '健身更衣 GYM'],
  ['POOL', '游泳池 POOL'],
  ['OFFICE', '办公室 OFFICE'],
  ['OUTDOOR', '室外 OUTDOOR'],
  ['SHOWROOM', '展厅 SHOWROOM'],
]);

export function normalizeRoomType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return '';
  return ROOM_TYPE_LABELS.get(normalized) || String(value).trim();
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function addNode(nodes, id, label, category, extra = {}) {
  if (!id || !label) return;
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      label,
      category,
      size: extra.size || 14,
      ...extra,
    });
  }
}

function addLink(links, source, target, relation) {
  if (!source || !target || source === target) return;
  const key = `${source}|${target}|${relation}`;
  if (!links.has(key)) {
    links.set(key, { source, target, relation });
  }
}

export function buildGraphFromSpaces(spaces) {
  const nodes = new Map();
  const links = new Map();

  for (const space of spaces) {
    const spaceId = `space_${slug(space.id)}`;
    addNode(nodes, spaceId, space.name || '未命名空间', '空间产品', {
      description: space.description || '',
      images: space.images || [],
      size: 12,
      meta: {
        notionPageId: space.id,
      },
    });

    const roomLabel = normalizeRoomType(space.roomType);
    if (roomLabel) {
      const roomId = `room_${slug(roomLabel.replace(/^[^A-Z0-9]+/i, ''))}`;
      addNode(nodes, roomId, roomLabel, '房间类型', { size: 22 });
      addLink(links, spaceId, roomId, '房间类型');
    }

    if (space.schoolType) {
      const schoolId = `school_${slug(space.schoolType)}`;
      addNode(nodes, schoolId, space.schoolType, '学校类型', { size: 20 });
      addLink(links, spaceId, schoolId, '学校类型');
    }

    for (const activity of space.activities || []) {
      const activityId = `activity_${slug(activity)}`;
      addNode(nodes, activityId, activity, '活动内容', { size: 16 });
      addLink(links, spaceId, activityId, '活动内容');
    }

    for (const style of space.styles || []) {
      const styleId = `style_${slug(style)}`;
      addNode(nodes, styleId, style, '设计属性', { size: 14 });
      addLink(links, spaceId, styleId, '设计风格');
    }

    if (space.cost) {
      const costId = `cost_${slug(space.cost)}`;
      addNode(nodes, costId, space.cost, '设计属性', { size: 14 });
      addLink(links, spaceId, costId, '造价');
    }

    for (const material of space.materials || []) {
      const materialId = `material_${slug(material)}`;
      addNode(nodes, materialId, material, '材料设备', { size: 12 });
      addLink(links, spaceId, materialId, '材料');
    }

    for (const equipment of space.equipment || []) {
      const equipmentId = `equipment_${slug(equipment)}`;
      addNode(nodes, equipmentId, equipment, '材料设备', { size: 12 });
      addLink(links, spaceId, equipmentId, '配套设备');
    }

    for (const project of space.projects || []) {
      const projectId = `project_${slug(project.id || project.name)}`;
      addNode(nodes, projectId, project.name, '项目', { size: 16 });
      addLink(links, spaceId, projectId, '相关项目');
    }
  }

  return {
    categories: Object.entries(CATEGORY_COLORS).map(([name, color]) => ({ name, color })),
    nodes: [...nodes.values()],
    links: [...links.values()],
  };
}
```

- [ ] **Step 2: Run tests and verify they pass**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test 'tests\notion-graph-lib.test.mjs'
```

Expected: PASS.

## Task 3: Implement Notion Converter CLI

**Files:**
- Create: `scripts/generate-notion-graph.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Create converter CLI**

Create `scripts/generate-notion-graph.mjs` that:

- Reads `.env`.
- Queries `NOTION_DATA_SOURCE_ID`.
- Scans all pages.
- Extracts direct fields: `空间名称`, `学校类型`, `房间类型`, `活动内容`, `设计风格`, `单方造价`, `地面材料`, `天花材料`, `配套设备`, `缩略图预览`.
- Resolves `NOTION_PROJECT_RELATION_PROPERTY` project page titles.
- Fetches project page details from `NOTION_PROJECT_DATA_SOURCE_ID` / relation page IDs and stores project metadata on project nodes.
- Calls `buildGraphFromSpaces`.
- Writes `generated/notion-graph.json`.

- [ ] **Step 2: Ensure generated output directory is ignored**

Add to `.gitignore`:

```gitignore
generated/
```

## Task 4: Run Converter and Verify Preview JSON

**Files:**
- Output: `generated/notion-graph.json`

- [ ] **Step 1: Run converter**

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'scripts\generate-notion-graph.mjs'
```

Expected:

```text
Fetched spaces: <positive number>
Resolved projects: <positive number>
Wrote generated/notion-graph.json
```

- [ ] **Step 2: Verify JSON structure**

Run:

```powershell
$json = Get-Content -Raw -Encoding UTF8 -Path 'generated\notion-graph.json' | ConvertFrom-Json
"categories=$($json.categories.Count); nodes=$($json.nodes.Count); links=$($json.links.Count)"
```

Expected:

```text
categories=<positive number>; nodes=<positive number>; links=<positive number>
```

- [ ] **Step 3: Verify room type aggregation**

Run:

```powershell
$json = Get-Content -Raw -Encoding UTF8 -Path 'generated\notion-graph.json' | ConvertFrom-Json
$hallway = $json.nodes | Where-Object { $_.label -eq '走廊楼梯 HALLWAY' }
$canteen = $json.nodes | Where-Object { $_.label -eq '餐厅 CANTEEN' }
"hallway=$($hallway.id); canteen=$($canteen.id)"
```

Expected: both IDs should be non-empty if the Notion data contains those room types.

## Self-Review

- Spec coverage: Covers live Notion conversion, independent space product nodes, room type aggregation, project relation title resolution, and safe preview JSON output.
- Placeholder scan: No implementation step contains open-ended placeholders.
- Type consistency: Test imports match exported helper names, and CLI writes a separate preview file without changing current front-end data.
