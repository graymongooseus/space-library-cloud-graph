import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('space-library-cloud.html', 'utf8');
const html3d = readFileSync('space-library-cloud-3d.html', 'utf8');
const adminDisplayHtml = readFileSync('admin/display-admin.html', 'utf8');

test('filter controls require an explicit apply action', () => {
  assert.match(html, /id="applyFilters"/);
  assert.match(html, /function selectedFilterId\(/);
  assert.match(html, /document\.getElementById\('applyFilters'\)\.onclick/);
});

test('project detail panel renders project metadata fields', () => {
  assert.match(html, /function renderProjectMeta\(/);
  assert.match(html, /项目状态/);
  assert.match(html, /项目周期/);
  assert.match(html, /EVA 目录/);
});

test('space product nodes use smaller text and lower visual opacity', () => {
  assert.match(html, /nodeRadius\(d\)/);
  assert.match(html, /nodeOpacity\(d\)/);
  assert.match(html, /nodeFontSize\(d\)/);
});

test('2d cloud page renders display override hooks', () => {
  assert.match(html, /function categoryTheme\(categoryName\)/);
  assert.match(html, /function nodeHoverTag\(d\)/);
  assert.match(html, /function renderDetailNote\(d\)/);
  assert.match(html, /const displayTheme = graphData\.displayTheme \|\| \{ categories: \{\}, links: \{\}, scene3d: \{\} \}/);
  assert.match(html, /hoverTag/);
  assert.match(html, /detailNote/);
});

test('2d cloud page validates display override values before rendering', () => {
  assert.match(html, /function safeColor\(value, fallback\)/);
  assert.match(html, /const colorPattern = \/\^#\(\?:\[0-9a-fA-F\]\{3\}\|\[0-9a-fA-F\]\{6\}\)\$\/;/);
  assert.match(html, /function numberInRange\(value, min, max\)/);
  assert.match(html, /numberInRange\(categoryTheme\(d\.category\)\.sizeScale, 0\.2, 4\)/);
  assert.match(html, /numberInRange\(categoryTheme\(d\.category\)\.opacity, 0, 1\)/);
  assert.match(html, /numberInRange\(displayTheme\.links\?\.opacity, 0, 1\)/);
  assert.match(html, /numberInRange\(displayTheme\.links\?\.width, 0\.1, 8\)/);
  assert.match(html, /visibleIds\.has\(d\.id\) \? nodeOpacity\(d\) : 0\.03/);
  assert.doesNotMatch(html, /\$\{color\}20/);
});

test('3d cloud page loads 3d-force-graph and keeps the local data parameter guard', () => {
  assert.match(html3d, /3d-force-graph/);
  assert.match(html3d, /function getGraphDataUrl\(/);
  assert.match(html3d, /requested\.includes\('\.\.'\)/);
  assert.match(html3d, /space-library-graph\.json/);
});

test('3d cloud page keeps school name and school type filtering with reset controls', () => {
  assert.doesNotMatch(html3d, /id="searchInput"/);
  assert.doesNotMatch(html3d, /id="activityFilter"/);
  assert.doesNotMatch(html3d, /id="roomFilter"/);
  assert.doesNotMatch(html3d, /id="applyFilters"/);
  assert.doesNotMatch(html3d, /id="clearFilters"/);
  assert.match(html3d, /id="schoolNameFilter"/);
  assert.match(html3d, /School Name/);
  assert.match(html3d, /id="schoolFilter"/);
  assert.match(html3d, /School Type/);
  assert.match(html3d, /id="resetView"/);
  assert.match(html3d, /aria-label="重置视图"/);
  assert.match(html3d, /function applyFilters\(/);
  assert.match(html3d, /function handleFilterChange\(/);
  assert.match(html3d, /function resetGraphView\(/);
});

test('3d cloud page includes detail gallery and project metadata rendering', () => {
  assert.match(html3d, /function getDetailImages\(/);
  assert.match(html3d, /function renderProjectMeta\(/);
  assert.match(html3d, /function renderSpaceMeta\(/);
  assert.match(html3d, /designAttributes/);
  assert.match(html3d, /detailImages\.map/);
  assert.match(html3d, /project-meta/);
});

test('3d detail panel is translucent over the graph', () => {
  assert.match(html3d, /\.detail-panel \{/);
  assert.match(html3d, /background: rgba\(14,16,24,0\.56\)/);
  assert.match(html3d, /backdrop-filter: blur\(18px\)/);
});

test('3d filter dropdowns use translucent glass styling', () => {
  assert.match(html3d, /\.filter-select \{/);
  assert.match(html3d, /background: rgba\(14,16,24,0\.58\)/);
  assert.match(html3d, /backdrop-filter: blur\(14px\)/);
  assert.match(html3d, /color: rgba\(255,255,255,0\.86\)/);
});

test('3d cloud page renders nodes as bright custom spheres', () => {
  assert.match(html3d, /vendor\/three\.min\.js\?v=fg1770/);
  assert.match(html3d, /vendor\/3d-force-graph\.min\.js\?v=fg1770/);
  assert.match(html3d, /function makeNodeObject\(/);
  assert.match(html3d, /new THREE\.SphereGeometry/);
  assert.match(html3d, /new THREE\.MeshBasicMaterial/);
  assert.match(html3d, /\.nodeThreeObject\(makeNodeObject\)/);
});

test('3d cloud page exposes visual hierarchy and focus interactions', () => {
  assert.match(html3d, /const VISUAL_THEME =/);
  assert.match(html3d, /const SPACE_NODE_RADIUS_SCALE = 1/);
  assert.match(html3d, /const OTHER_NODE_RADIUS_SCALE = 0\.75/);
  assert.match(html3d, /function visualRole\(/);
  assert.match(html3d, /function focusGraph\(/);
  assert.match(html3d, /function resetCameraControls\(/);
  assert.match(html3d, /function focusInitialGraph\(/);
  assert.match(html3d, /function focusNode\(/);
  assert.match(html3d, /function focusRelatedGraph\(/);
  assert.match(html3d, /\.enableNodeDrag\(true\)/);
  assert.match(html3d, /\.onNodeDrag\(handleNodeDrag\)/);
  assert.match(html3d, /\.onNodeDragEnd\(handleNodeDragEnd\)/);
  assert.match(html3d, /Graph\.d3VelocityDecay\(0\.42\)/);
  assert.match(html3d, /Graph\.cameraPosition\(\{ x: 0, y: 0, z: 1250 \}/);
  assert.match(html3d, /Graph\.cameraPosition\([^;]+node[^;]+1800\)/s);
});

test('3d cloud page shows active filter chips and search glow', () => {
  assert.match(html3d, /id="activeFilters"/);
  assert.match(html3d, /function updateActiveFilterChips\(/);
  assert.match(html3d, /function selectedFilterEntries\(/);
  assert.match(html3d, /searchMatches\.has\(node\.id\)/);
  assert.match(html3d, /emissive/);
});

test('3d cloud page renders project nodes as scaled categorical spheres', () => {
  assert.match(html3d, /project: \{ color: '#ff7f0e'/);
  assert.match(html3d, /function projectConnectionStrength\(/);
  assert.match(html3d, /function projectColor\(/);
  assert.match(html3d, /\(node\.size \|\| 22\) \* 0\.765/);
});

test('3d cloud page uses a large graph inspired visual scale', () => {
  assert.match(html3d, /\.nodeRelSize\(4\)/);
  assert.match(html3d, /Graph\.d3Force\('charge'\)\.strength\(-52\)/);
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return 0\.2/);
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return 0;/);
  assert.match(html3d, /return 33/);
  assert.match(html3d, /return 66/);
});

test('3d cloud page supports hover focus and live color controls', () => {
  assert.match(html3d, /id="themePalette"/);
  assert.match(html3d, /Color Scheme/);
  assert.match(html3d, /School Project/);
  assert.match(html3d, /Space Name/);
  assert.match(html3d, /School Type/);
  assert.doesNotMatch(html3d, /data-theme-key="highlight"/);
  assert.match(html3d, /function handleNodeHover\(/);
  assert.match(html3d, /function clearHoverFocus\(/);
  assert.match(html3d, /hoverSuppressUntil/);
  assert.match(html3d, /hoverDisabledUntilPointerMove/);
  assert.match(html3d, /function buildHoverState\(/);
  assert.match(html3d, /function linkWidth\(/);
  assert.match(html3d, /function applyThemeControl\(/);
});

test('3d cloud page shows persistent school project labels', () => {
  assert.match(html3d, /function makeTextSprite\(/);
  assert.match(html3d, /node\.category === '学校项目'/);
  assert.match(html3d, /const label = makeTextSprite/);
  assert.match(html3d, /label\.position\.set\(radius \+ 42/);
  assert.match(html3d, /group\.add\(label\)/);
});

test('3d cloud page temporarily disables camera controls while dragging nodes', () => {
  assert.match(html3d, /function setCameraControlsEnabled\(/);
  assert.match(html3d, /function handleNodeDrag\(/);
  assert.match(html3d, /function handleNodeDragEnd\(/);
  assert.match(html3d, /function recoverNodeDrag\(/);
  assert.match(html3d, /function scheduleDragRecovery\(/);
  assert.match(html3d, /setCameraControlsEnabled\(false\)/);
  assert.match(html3d, /setCameraControlsEnabled\(true\)/);
  assert.match(html3d, /window\.addEventListener\('pointerup', recoverNodeDrag\)/);
  assert.match(html3d, /Graph\.d3ReheatSimulation\(\)/);
});

test('3d cloud page does not start ambient drift or auto rotation', () => {
  const initMatch = html3d.match(/function initGraph\(data\) \{[\s\S]*?function fillFilter/);
  assert.ok(initMatch);
  assert.doesNotMatch(initMatch[0], /startAmbientDrift\(\)/);
  assert.doesNotMatch(initMatch[0], /startAutoRotate\(\)/);
});

test('3d hover never dims unrelated node spheres', () => {
  assert.doesNotMatch(html3d, /hoverFocus\.nodeId && !hoverFocus\.nodeIds\.has\(node\.id\)\) return 0\.12/);
  assert.doesNotMatch(html3d, /hoverFocus\.nodeId && !hoverFocus\.nodeIds\.has\(node\.id\)\) return VISUAL_THEME\.dim/);
});

test('3d cloud page vendors graph libraries locally', () => {
  assert.ok(existsSync('vendor/three.min.js'));
  assert.ok(existsSync('vendor/3d-force-graph.min.js'));
  assert.doesNotMatch(html3d, /https:\/\/unpkg\.com\/(?:three|3d-force-graph)/);
  assert.doesNotMatch(html3d, /https:\/\/cdn\.jsdelivr\.net\/npm\/(?:three|3d-force-graph)/);
});

test('3d cloud page bridges CommonJS globals from vendored libraries', () => {
  assert.match(html3d, /window\.THREE = module\.exports/);
  assert.match(html3d, /window\.ForceGraph3D = module\.exports\.default \|\| module\.exports/);
});

test('3d cloud page inline script is syntactically valid', () => {
  const scripts = Array.from(html3d.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  assert.ok(scripts.length > 0);
  for (const [, script] of scripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

test('display override admin page exposes local-only editing controls', () => {
  assert.match(adminDisplayHtml, /id="nodeSearch"/);
  assert.match(adminDisplayHtml, /id="categoryFilter"/);
  assert.match(adminDisplayHtml, /id="hoverTag"/);
  assert.match(adminDisplayHtml, /id="detailNote"/);
  assert.match(adminDisplayHtml, /id="themeEditor"/);
  assert.match(adminDisplayHtml, /function saveOverrides/);
  assert.match(adminDisplayHtml, /showSaveFilePicker/);
  assert.doesNotMatch(adminDisplayHtml, /NOTION_TOKEN/);
  assert.doesNotMatch(adminDisplayHtml, /api\.notion\.com/);
});

test('display override admin page documents last-generated preview behavior', () => {
  assert.match(adminDisplayHtml, /last generated merged graph/);
  assert.match(adminDisplayHtml, /scripts\/generate-notion-graph\.mjs/);
});

test('display override admin page keeps validator-aligned numeric ranges', () => {
  assert.match(adminDisplayHtml, /data-theme-field="sizeScale" type="number" min="0\.2" max="4"/);
  assert.match(adminDisplayHtml, /data-theme-field="opacity" type="number" min="0" max="1"/);
  assert.match(adminDisplayHtml, /id="linkOpacity" type="range" min="0" max="1"/);
  assert.match(adminDisplayHtml, /id="linkWidth" type="number" min="0\.1" max="8"/);
  assert.match(adminDisplayHtml, /id="glowStrength" type="range" min="0" max="4"/);
  assert.match(adminDisplayHtml, /function clampNumber/);
});

test('display override admin page inline script is syntactically valid', () => {
  const scripts = Array.from(adminDisplayHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  assert.ok(scripts.length > 0);
  for (const [, script] of scripts) {
    assert.doesNotThrow(() => new Function(script));
  }
});

