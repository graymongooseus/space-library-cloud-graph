import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('space-library-cloud.html', 'utf8');
const html3d = readFileSync('space-library-cloud-3d.html', 'utf8');
const adminDisplayHtml = readFileSync('admin/display-admin.html', 'utf8');
const researchDashboardJson = readFileSync('generated/research-dashboard.json', 'utf8');

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

test('3d cloud page renders display override hooks', () => {
  assert.match(html3d, /let displayTheme = \{ categories: \{\}, links: \{\}, scene3d: \{\} \};/);
  assert.match(html3d, /displayTheme = data\.displayTheme \|\| \{ categories: \{\}, links: \{\}, scene3d: \{\} \};/);
  assert.match(html3d, /function categoryTheme\(categoryName\)/);
  assert.match(html3d, /function nodeHoverTag\(node\)/);
  assert.match(html3d, /function renderDetailNote\(node\)/);
  assert.match(html3d, /displayTheme/);
  assert.match(html3d, /hoverTag/);
  assert.match(html3d, /detailNote/);
});

test('3d cloud page validates display override values before rendering', () => {
  assert.match(html3d, /function safeColor\(value, fallback\)/);
  assert.match(html3d, /const colorPattern = \/\^#\(\?:\[0-9a-fA-F\]\{3\}\|\[0-9a-fA-F\]\{6\}\)\$\/;/);
  assert.match(html3d, /function numberInRange\(value, min, max\)/);
  assert.match(html3d, /safeColor\(displayTheme\.scene3d\?\.backgroundColor, '#000106'\)/);
  assert.match(html3d, /numberInRange\(displayTheme\.scene3d\?\.glowStrength, 0, 4\)/);
  assert.match(html3d, /numberInRange\(displayTheme\.links\?\.opacity, 0, 1\)/);
  assert.match(html3d, /numberInRange\(displayTheme\.links\?\.width, 0\.1, 8\)/);
  assert.match(html3d, /numberInRange\(categoryTheme\(node\.category\)\.sizeScale, 0\.2, 4\)/);
  assert.match(html3d, /numberInRange\(categoryTheme\(node\.category\)\.opacity, 0, 1\)/);
  assert.match(html3d, /safeColor\(categoryTheme\(category\.name\)\.color, null\)/);
  assert.match(html3d, /function sceneGlowStrength\(\)/);
  assert.match(html3d, /function scaledGlowIntensity\(value, max\)/);
});

test('3d cloud page preserves no-override link rendering defaults', () => {
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return opacity \?\? 0\.2;/);
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return width \?\? 0;/);
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
  assert.doesNotMatch(html3d, /\.onNodeDrag\(/);
  assert.doesNotMatch(html3d, /\.onNodeDragEnd\(/);
  assert.match(html3d, /Graph\.d3VelocityDecay\(0\.42\)/);
  assert.match(html3d, /Graph\.cameraPosition\(\{ x: 0, y: 0, z: 1250 \}/);
  assert.match(html3d, /Graph\.cameraPosition\([^;]+node[^;]+1800\)/s);
});

test('3d cloud page starts with education project growth intro', () => {
  assert.match(html3d, /<body class="intro-active">/);
  assert.match(html3d, /id="educationIntro"/);
  assert.match(html3d, /<div class="intro-title">Click<\/div>/);
  assert.match(html3d, /id="introCore"/);
  assert.match(html3d, /id="introGlobe"/);
  assert.match(html3d, /\.intro-globe\s*\{[^}]*display: block;/s);
  assert.match(html3d, /new THREE\.LineLoop/);
  assert.match(html3d, /new THREE\.Line\(/);
  assert.match(html3d, /\[-45, 0, 45\]\.forEach/);
  assert.match(html3d, /\[30, 105\]\.forEach/);
  assert.match(html3d, /depthWrite: false/);
  assert.doesNotMatch(html3d, /wireframe: true/);
  assert.match(html3d, /@keyframes introSphereRotate/);
  assert.match(html3d, /function initIntroGlobe\(/);
  assert.match(html3d, /intro-branch-research/);
  assert.match(html3d, /intro-branch-projects/);
  assert.doesNotMatch(html3d, /id="introPerson"/);
  assert.doesNotMatch(html3d, />静茹<\/button>/);
  assert.match(html3d, /id="researchIntroTitle">RESEARCH<\/h1>/);
  assert.match(html3d, /class="research-placeholder"/);
  assert.match(html3d, /id="introExpandResearch"[^>]*>EXPAND RESEARCH<\/button>/);
  assert.match(html3d, /id="projectsIntroTitle">PROJECTS<\/h1>/);
  assert.match(html3d, /id="introExpand"[^>]*>EXPAND PROJECTS<\/button>/);
  assert.match(html3d, /id="homeReturn"/);
  assert.match(html3d, /function returnToEducationHome\(/);
  assert.match(html3d, /id="researchDashboardClose"[^>]*aria-label="返回首页"/);
  assert.match(html3d, /function returnFromResearchDashboard\(\)/);
  assert.match(html3d, /researchDashboardClose'\)\.addEventListener\('click', returnFromResearchDashboard\)/);
  assert.match(html3d, /function loadResearchDashboardData\(/);
  assert.match(html3d, /generated\/research-dashboard\.json/);
  assert.match(html3d, /id="researchDashboard"/);
  assert.doesNotMatch(html3d, /id="researchKpis"/);
  assert.doesNotMatch(html3d, /function renderResearchKpis\(/);
  assert.doesNotMatch(html3d, /class="research-kpi"/);
  assert.match(html3d, /\.research-control \{[\s\S]*?border-radius: 12px;[\s\S]*?background: rgba\(0,0,0,0\.58\)/);
  assert.match(html3d, /vendor\/echarts\.min\.js\?v=fg1770/);
  assert.match(html3d, /Chart 01 - All Schools Area Comparison/);
  assert.match(html3d, /class="research-echart" id="researchTypeAreaBars"/);
  assert.doesNotMatch(html3d, /Chart 02 - Dormitory Capacity Efficiency/);
  assert.doesNotMatch(html3d, /id="researchDormBars"/);
  assert.match(html3d, /Chart 03 - Building Program Stack/);
  assert.match(html3d, /Above-Ground Program Areas plus Underground Building Area/);
  assert.match(html3d, /Chart 03 - Building Program Stack[\s\S]*?id="researchRanking"[\s\S]*?id="researchSchoolSelect"[\s\S]*?Chart 04 - Selected School Profile/);
  assert.match(html3d, /Building \+ Students/);
  assert.match(html3d, /Building Only/);
  assert.match(html3d, /Students Only/);
  assert.match(html3d, /Chart 04 - Selected School Profile/);
  assert.match(html3d, /Chart 05 - Program Composition/);
  assert.match(html3d, /Chart 06 - Investment and Unit Cost Area/);
  assert.match(html3d, /Investment Total and Unit Cost Benchmark/);
  assert.match(html3d, /id="researchCurrencySelect"/);
  assert.match(html3d, /Unit Cost in RMB \(¥\)/);
  assert.match(html3d, /Unit Cost in USD \(\$\)/);
  assert.match(html3d, /const RMB_PER_USD = 7\.2/);
  assert.match(html3d, /selectedResearchCurrency === 'USD'/);
  assert.match(html3d, /function formatUnitCost\(/);
  assert.match(html3d, /function investmentValueWan\(/);
  assert.match(html3d, /function formatInvestmentCost\(/);
  assert.match(html3d, /\}M`/);
  assert.match(html3d, /'USD M'/);
  assert.match(html3d, /investmentSeriesName/);
  assert.match(html3d, /researchCostChart = echarts\.init/);
  assert.match(html3d, /areaStyle: \{ opacity: 0\.34 \}/);
  assert.match(html3d, /name: investmentSeriesName/);
  assert.match(html3d, /unitCostSeriesName/);
  assert.match(html3d, /researchCostChart\.on\('click'/);
  assert.match(html3d, /id="researchRanking"/);
  assert.match(html3d, /id="researchComposition"/);
  assert.match(html3d, /id="researchScatter"/);
  assert.match(html3d, /function renderResearchDashboard\(/);
  assert.match(html3d, /function renderResearchTypeAreaBars\(/);
  assert.match(html3d, /researchProgramStackChart = echarts\.init/);
  assert.match(html3d, /stack: 'building-program'/);
  assert.match(html3d, /Teaching \/ Office/);
  assert.match(html3d, /Student Dormitory/);
  assert.match(html3d, /Sports/);
  assert.match(html3d, /Living Support/);
  assert.match(html3d, /Staff Dormitory/);
  assert.match(html3d, /Underground Area/);
  assert.match(html3d, /echarts\.init\(container/);
  assert.match(html3d, /function researchSchoolName\(/);
  assert.match(html3d, /function wrapAxisLabel\(/);
  assert.match(html3d, /function openProjectFromResearchSchool\(/);
  assert.match(html3d, /researchTypeAreaChart\.on\('click'/);
  assert.match(html3d, /Highlighted gold bars are linked to PROJECTS/);
  assert.match(html3d, /Campus land area/);
  assert.match(html3d, /Total building area/);
  assert.match(html3d, /Building density/);
  assert.match(html3d, /shadowBlur: 12/);
  assert.match(html3d, /rotate: 42/);
  assert.match(html3d, /formatter: value => wrapAxisLabel\(value, 13\)/);
  assert.match(html3d, /dataZoom: \[/);
  assert.match(html3d, /legend: \{/);
  assert.doesNotMatch(html3d, /function renderResearchDormBars\(/);
  assert.match(html3d, /function aggregateGroupMetric\(/);
  assert.match(html3d, /function renderResearchScatter\(/);
  assert.match(html3d, /function openEducationGrowth\(/);
  assert.match(html3d, /function revealEducationGraph\(/);
  assert.match(html3d, /body\.graph-revealed #graph-container/);
});

test('research dashboard data is generated from education project detail workbook', () => {
  const data = JSON.parse(researchDashboardJson);
  assert.equal(data.source, 'data downloaded/EDUCATION PROJECT DETAIL.xlsx');
  assert.equal(data.schoolCount, 23);
  assert.deepEqual(data.schoolTypes, ['公办学校', '国际学校']);
  assert.ok(!data.schools.some(school => school.englishName === 'Western Chongqing Science City Jinfeng School'));
  assert.ok(data.schools.some(school => school.name === '南京威雅'));
  assert.equal(data.schools.find(school => school.name === '南京威雅').schoolType, '国际学校');
  assert.equal(data.schools.find(school => school.name === '南京威雅').englishName, 'Wycombe Abbey School Nanjing');
  assert.equal(data.schools.find(school => school.name === '南京威雅').projectLink.projectNodeId, 'project_d48e9ca4_b1fa_45ec_866b_928277526281');
  assert.equal(data.schools.find(school => school.name === '深圳三十二高级中学').schoolType, '公办学校');
  assert.equal(data.schools.find(school => school.name === '深圳三十二高级中学').englishName, 'Shenzhen No.32 Senior High School');
  assert.equal(data.schools.find(school => school.name === '中山阿丁莱').projectLink.projectNodeId, 'project_47a4e443_2a57_48d6_9ee6_e8625f285a85');
  assert.ok(data.schools.every(school => school.metrics));
  assert.ok(data.schools.some(school => school.metrics.totalBuildingArea > 200000));
  assert.ok(data.comparisons.includes('totalBuildingArea'));
  assert.ok(data.comparisons.includes('landAreaPerStudent'));
  assert.ok(data.comparisons.includes('dormAreaPerBoarder'));
  assert.equal(data.costBenchmarks.length, 7);
  assert.deepEqual(
    data.costBenchmarks.map(item => item.investmentTotalWan),
    [26798, 40140, 60000, 72000, 83000, 90000, 104000]
  );
  assert.deepEqual(
    data.costBenchmarks.map(item => item.unitCostYuan),
    [5285, 7107, 5650, 7000, 7414, 4083, 7200]
  );
  assert.ok(data.costBenchmarks.some(item => item.name === 'Zhongshan Ardingly College' && item.projectLink));
  assert.ok(data.costBenchmarks.some(item => item.name === 'Wycombe Abbey School Nanjing' && item.projectLink));
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
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return opacity \?\? 0\.2;/);
  assert.match(html3d, /if \(!hoverFocus\.nodeId\) return width \?\? 0;/);
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
  assert.match(html3d, /function seedDisplayThemeColors\(/);
  assert.match(html3d, /VISUAL_THEME\[themeKey\]\.color = color/);
  assert.doesNotMatch(html3d, /function nodeBaseColor\(node\) \{[\s\S]*?categoryTheme\(node\.category\)\.color[\s\S]*?\}/);
  assert.match(html3d, /function applyThemeControl\(/);
});

test('3d cloud page shows persistent school project labels', () => {
  assert.match(html3d, /function makeTextSprite\(/);
  assert.match(html3d, /node\.category === '学校项目'/);
  assert.match(html3d, /const label = makeTextSprite/);
  assert.match(html3d, /label\.position\.set\(radius \+ 42/);
  assert.match(html3d, /group\.add\(label\)/);
});

test('3d cloud page uses force graph default node dragging', () => {
  assert.match(html3d, /\.enableNodeDrag\(true\)/);
  assert.doesNotMatch(html3d, /function setCameraControlsEnabled\(/);
  assert.doesNotMatch(html3d, /function handleNodeDrag\(/);
  assert.doesNotMatch(html3d, /function handleNodeDragEnd\(/);
  assert.doesNotMatch(html3d, /function recoverNodeDrag\(/);
  assert.doesNotMatch(html3d, /function scheduleDragRecovery\(/);
  assert.doesNotMatch(html3d, /window\.addEventListener\('pointerup', recoverNodeDrag\)/);
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
  assert.ok(existsSync('vendor/echarts.min.js'));
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

