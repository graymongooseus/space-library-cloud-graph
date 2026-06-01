# Externalize Graph Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing front-end load graph data from an external JSON file while preserving the current visual style and interactions.

**Architecture:** Keep the project static for this phase. Move the graph payload out of `space-library-cloud.html` into a JSON asset, then update the HTML to fetch that asset before calling `initGraph`.

**Tech Stack:** Plain HTML/CSS/JavaScript, D3 v7 from CDN, PowerShell verification commands, optional local static server for browser testing.

---

## File Structure

- Modify: `space-library-cloud.html`
  - Remove the inline `const graphDataRaw = ...; initGraph(graphDataRaw);` block.
  - Add a small `loadGraphData()` function that fetches `space-library-graph.json`.
  - Show a readable error in the page if loading fails.
- Read/verify: `space-library-graph.json`
  - Existing graph data source. It must stay valid JSON and contain `categories`, `nodes`, and `links`.
- No backend files are created in this phase.

## Scope Notes

This phase does not build the admin console, SQLite database, Notion API sync, image caching, or iframe route. It only prepares the front-end to consume generated graph data.

## Task 1: Verify Existing JSON Data

**Files:**
- Read: `space-library-graph.json`
- Read: `space-library-cloud.html`

- [ ] **Step 1: Parse the existing JSON file**

Run:

```powershell
$json = Get-Content -Raw -Encoding UTF8 -Path 'space-library-graph.json' | ConvertFrom-Json
"categories=$($json.categories.Count); nodes=$($json.nodes.Count); links=$($json.links.Count)"
```

Expected:

```text
categories=5; nodes=<positive number>; links=<positive number>
```

- [ ] **Step 2: Confirm required top-level keys exist**

Run:

```powershell
$json = Get-Content -Raw -Encoding UTF8 -Path 'space-library-graph.json' | ConvertFrom-Json
@('categories','nodes','links') | ForEach-Object { if ($null -eq $json.$_) { throw "Missing key: $_" } else { "ok: $_" } }
```

Expected:

```text
ok: categories
ok: nodes
ok: links
```

## Task 2: Update HTML Data Loading

**Files:**
- Modify: `space-library-cloud.html`

- [ ] **Step 1: Replace inline data bootstrap**

Find the current block immediately after `<script>`:

```javascript
// Inline data (also saved separately as space-library-graph.json)
const graphDataRaw = {...};
initGraph(graphDataRaw);
```

Replace it with:

```javascript
const GRAPH_DATA_URL = 'space-library-graph.json';

async function loadGraphData() {
  try {
    const response = await fetch(GRAPH_DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    initGraph(data);
  } catch (error) {
    const container = document.getElementById('graph-container');
    container.innerHTML = `
      <div style="padding:32px;color:#666;font-size:14px;">
        图谱数据加载失败：${error.message}
      </div>`;
    console.error('Failed to load graph data', error);
  }
}

loadGraphData();
```

- [ ] **Step 2: Keep `initGraph(data)` unchanged**

Do not change force simulation, styling, search, category filtering, detail panel, or image lightbox in this task.

- [ ] **Step 3: Check there is no remaining inline graph payload**

Run:

```powershell
Select-String -Path 'space-library-cloud.html' -Pattern 'const graphDataRaw|Inline data'
```

Expected: no output.

## Task 3: Verify Static Loading Behavior

**Files:**
- Verify: `space-library-cloud.html`
- Verify: `space-library-graph.json`

- [ ] **Step 1: Start a local static server**

Run:

```powershell
python -m http.server 8080
```

Expected:

```text
Serving HTTP on :: port 8080
```

If Python is unavailable, use:

```powershell
npx http-server -p 8080
```

- [ ] **Step 2: Open the front-end**

Open:

```text
http://localhost:8080/space-library-cloud.html
```

Expected:

- The graph renders.
- Header statistics show node and link counts.
- Search input still filters nodes.
- Hover still highlights related links.
- Clicking a node still opens the floating detail panel.

- [ ] **Step 3: Verify fetch error path**

Temporarily change:

```javascript
const GRAPH_DATA_URL = 'space-library-graph-missing.json';
```

Reload the page.

Expected:

```text
图谱数据加载失败：HTTP 404
```

Restore:

```javascript
const GRAPH_DATA_URL = 'space-library-graph.json';
```

## Task 4: Document Phase Completion

**Files:**
- Modify: `docs/superpowers/specs/2026-06-01-space-library-interactive-site-design.md`

- [ ] **Step 1: Add a short implementation note under `Implementation Phases`**

Add under phase 1:

```markdown
   - Implementation note: the front-end now loads `space-library-graph.json` with `fetch()`, so later admin tooling can regenerate that file without editing HTML.
```

- [ ] **Step 2: Re-run JSON parse verification**

Run:

```powershell
$json = Get-Content -Raw -Encoding UTF8 -Path 'space-library-graph.json' | ConvertFrom-Json
"categories=$($json.categories.Count); nodes=$($json.nodes.Count); links=$($json.links.Count)"
```

Expected:

```text
categories=5; nodes=<positive number>; links=<positive number>
```

## Self-Review

- Spec coverage: This plan covers phase 1 only, which is the required foundation for later CSV/Notion/admin-generated graph publishing.
- No placeholders: all steps include exact files, commands, and expected results.
- Type consistency: the front-end continues to call `initGraph(data)` with the same `categories`, `nodes`, and `links` structure currently used by the inline data.

