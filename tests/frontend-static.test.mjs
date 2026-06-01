import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('space-library-cloud.html', 'utf8');

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

