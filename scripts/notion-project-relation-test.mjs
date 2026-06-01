import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const envPath = path.join(root, '.env');

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
const notionVersion = env.NOTION_VERSION || '2026-03-11';
const projectRelationProperty = env.NOTION_PROJECT_RELATION_PROPERTY || 'Related to 1.PROJECT 工作项目 (🖼Space 空间产品)';

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

function getTitleFromPage(page) {
  for (const [name, property] of Object.entries(page.properties || {})) {
    if (property.type === 'title') {
      return {
        propertyName: name,
        title: richTextToPlain(property.title),
      };
    }
  }
  return {
    propertyName: '',
    title: '',
  };
}

function getSpaceName(page) {
  const property = page.properties?.['空间名称'];
  if (!property || property.type !== 'title') return page.id;
  return richTextToPlain(property.title) || page.id;
}

const projectIds = new Map();
let pagesScanned = 0;
let cursor;

while (pagesScanned < 100 && projectIds.size === 0) {
  const data = await notionRequest(
    `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        page_size: 25,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    }
  );

  for (const page of data.results || []) {
    pagesScanned += 1;
    const relation = page.properties?.[projectRelationProperty];
    if (!relation || relation.type !== 'relation') continue;

    const spaceName = getSpaceName(page);
    for (const item of relation.relation || []) {
      if (!projectIds.has(item.id)) {
        projectIds.set(item.id, new Set());
      }
      projectIds.get(item.id).add(spaceName);
    }
  }

  if (!data.has_more || !data.next_cursor) break;
  cursor = data.next_cursor;
}

console.log(`Spaces scanned: ${pagesScanned}`);
console.log(`Project relation property: ${projectRelationProperty}`);
console.log(`Unique related project pages: ${projectIds.size}`);

for (const [projectId, spaces] of [...projectIds.entries()].slice(0, 10)) {
  const projectPage = await notionRequest(`https://api.notion.com/v1/pages/${projectId}`);
  const title = getTitleFromPage(projectPage);
  console.log(`- ${title.title || '(untitled)'} | title property: ${title.propertyName || '(none)'} | page: ${projectId}`);
  console.log(`  related spaces: ${[...spaces].join(', ')}`);
}
