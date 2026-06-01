import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildGraphFromSpaces } from './notion-graph-lib.mjs';

const root = path.resolve('.');
const envPath = path.join(root, '.env');
const outputPath = path.join(root, 'generated', 'notion-graph.json');

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

const env = { ...process.env, ...loadEnvFile(envPath) };
const token = env.NOTION_TOKEN;
const dataSourceId = env.NOTION_DATA_SOURCE_ID;
const projectRelationProperty = env.NOTION_PROJECT_RELATION_PROPERTY || 'Related to 1.PROJECT 工作项目 (🖼Space 空间产品)';
const notionVersion = env.NOTION_VERSION || '2026-03-11';

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
    name: firstTitle(page) || page.id,
    type: selectProp(page, '项目类型'),
    status: selectProp(page, '项目状态'),
    priority: selectProp(page, '项目优先级'),
    period: dateProp(page, '项目周期'),
    description: richTextProp(page, '项目描述'),
    managers: peopleProp(page, '项目经理'),
    evaPath: richTextProp(page, 'EVA 服务器目录'),
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

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
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

  spaces.push({
    id: page.id,
    name,
    roomType: selectProp(page, '房间类型'),
    schoolType: selectProp(page, '学校类型'),
    activities: multiSelectProp(page, '活动内容'),
    styles: multiSelectProp(page, '设计风格'),
    cost: selectProp(page, '单方造价'),
    materials: unique([
      ...multiSelectProp(page, '地面材料'),
      ...multiSelectProp(page, '天花材料'),
    ]),
    equipment: multiSelectProp(page, '配套设备'),
    images: filesProp(page, '缩略图预览'),
    projects,
    description: [
      selectProp(page, '学校类型'),
      selectProp(page, '房间类型'),
      multiSelectProp(page, '活动内容').join(', '),
    ].filter(Boolean).join(' · '),
  });
}

const graph = buildGraphFromSpaces(spaces);

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');

console.log(`Fetched spaces: ${spaces.length}`);
console.log(`Resolved projects: ${projectCache.size}`);
console.log(`Graph nodes: ${graph.nodes.length}`);
console.log(`Graph links: ${graph.links.length}`);
console.log(`Wrote ${path.relative(root, outputPath)}`);

