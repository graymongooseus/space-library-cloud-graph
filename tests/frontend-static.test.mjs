import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('space-library-cloud.html', 'utf8');
const html3d = readFileSync('space-library-cloud-3d.html', 'utf8');

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

test('3d cloud page renders nodes as bright custom spheres', () => {
  assert.match(html3d, /vendor\/three\.min\.js\?v=/);
  assert.match(html3d, /vendor\/3d-force-graph\.min\.js\?v=/);
  assert.match(html3d, /function makeNodeObject\(/);
  assert.match(html3d, /new THREE\.SphereGeometry/);
  assert.match(html3d, /new THREE\.MeshBasicMaterial/);
  assert.match(html3d, /\.nodeThreeObject\(makeNodeObject\)/);
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

