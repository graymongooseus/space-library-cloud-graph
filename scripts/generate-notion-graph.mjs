import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mergeGraphWithOverrides } from './display-overrides-lib.mjs';
import { buildGraphFromSpaces } from './notion-graph-lib.mjs';
import { localImagesForPage, readImageManifest } from './notion-image-freeze.mjs';

const root = path.resolve('.');
const envPath = path.join(root, '.env');
const outputPath = path.join(root, 'generated', 'notion-graph.json');
const mergedOutputPath = path.join(root, 'generated', 'notion-graph-merged.json');
const overridesPath = path.join(root, 'admin', 'display-overrides.json');
const imageManifestPath = path.join(root, 'generated', 'notion-image-manifest.json');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

function loadJsonFile(filePath) {
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const env = { ...process.env, ...loadEnvFile(envPath) };
const token = env.NOTION_TOKEN;
const dataSourceId = env.NOTION_DATA_SOURCE_ID;
const projectRelationProperty = env.NOTION_PROJECT_RELATION_PROPERTY || '学校项目 School Project';
const imageProperty = env.NOTION_IMAGE_PROPERTY || '缩略图预览';
const notionVersion = env.NOTION_VERSION || '2026-03-11';
const imageManifest = readImageManifest(imageManifestPath);

if (!token) {
  console.error('Missing NOTION_TOKEN.');
  process.exit(1);
}

if (!dataSourceId) {
  console.error('Missing NOTION_DATA_SOURCE_ID.');
  process.exit(1);
}

async function notionRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': notionVersion,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function richTextToPlain(items = []) {
  return items.map((item) => item.plain_text || '').join('');
}

function prop(page, name) {
  return page.properties?.[name];
}

function titleProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'title') return '';
  return richTextToPlain(property.title);
}

function firstTitle(page) {
  for (const property of Object.values(page.properties || {})) {
    if (property.type === 'title') return richTextToPlain(property.title);
  }
  return '';
}

function richTextProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'rich_text') return '';
  return richTextToPlain(property.rich_text);
}

function selectProp(page, name) {
  const property = prop(page, name);
  if (!property) return '';
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  return '';
}

function multiSelectProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'multi_select') return [];
  return property.multi_select.map((item) => item.name).filter(Boolean);
}

function dateProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'date') return '';
  if (!property.date?.start) return '';
  return property.date.end ? `${property.date.start} - ${property.date.end}` : property.date.start;
}

function peopleProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'people') return [];
  return property.people.map((person) => person.name || person.id).filter(Boolean);
}

function filesProp(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'files') return [];
  return property.files.map((file) => {
    if (file.type === 'external') return file.external?.url;
    if (file.type === 'file') return file.file?.url;
    return '';
  }).filter(Boolean);
}

function relationIds(page, name) {
  const property = prop(page, name);
  if (!property || property.type !== 'relation') return [];
  return property.relation.map((item) => item.id).filter(Boolean);
}

function projectFromPage(page) {
  return {
    id: page.id,
    name: titleProp(page, 'Project name') || firstTitle(page) || page.id,
    status: selectProp(page, '项目状态'),
    period: dateProp(page, '项目周期'),
    managers: peopleProp(page, '项目经理'),
    schoolType: selectProp(page, '学校类型'),
    type: selectProp(page, '项目类型'),
    description: richTextProp(page, '项目描述'),
  };
}

async function queryAllDataSource(id) {
  const pages = [];
  let cursor;
  do {
    const body = await notionRequest(
      `https://api.notion.com/v1/data_sources/${id}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      }
    );
    pages.push(...(body.results || []));
    cursor = body.has_more ? body.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const projectCache = new Map();

async function getProject(id) {
  if (!projectCache.has(id)) {
    const page = await notionRequest(`https://api.notion.com/v1/pages/${id}`);
    projectCache.set(id, projectFromPage(page));
  }
  return projectCache.get(id);
}

const pages = await queryAllDataSource(dataSourceId);
const spaces = [];

for (const page of pages) {
  const name = titleProp(page, '空间名称');
  if (!name) continue;

  const projectIds = relationIds(page, projectRelationProperty);
  const projects = [];
  for (const id of projectIds) {
    projects.push(await getProject(id));
  }

  const activities = multiSelectProp(page, 'ACTIVITIES');
  const equipment = multiSelectProp(page, 'EQUIPMENT');
  const unitPrice = selectProp(page, 'UNIT PRICE');
  const localImages = localImagesForPage(imageManifest, page.id, imageProperty);

  spaces.push({
    id: page.id,
    name,
    activities,
    equipment,
    unitPrice,
    images: localImages.length ? localImages : filesProp(page, imageProperty),
    projects,
    description: [
      activities.join(', '),
      equipment.join(', '),
      unitPrice,
    ].filter(Boolean).join(' · '),
  });
}

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
