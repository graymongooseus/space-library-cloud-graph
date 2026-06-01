import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const envPath = path.join(root, '.env');
const reportPath = path.join(root, 'docs', 'notion-project-property-report.md');

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
const projectDatabaseId = env.NOTION_PROJECT_DATABASE_ID;
const projectDataSourceIdFromEnv = env.NOTION_PROJECT_DATA_SOURCE_ID;
const notionVersion = env.NOTION_VERSION || '2026-03-11';

if (!token) {
  console.error('Missing NOTION_TOKEN.');
  process.exit(1);
}

if (!projectDatabaseId && !projectDataSourceIdFromEnv) {
  console.error('Missing NOTION_PROJECT_DATABASE_ID or NOTION_PROJECT_DATA_SOURCE_ID.');
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
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function richTextToPlain(items = []) {
  return items.map((item) => item.plain_text || '').join('');
}

function summarizeProperty(property) {
  switch (property.type) {
    case 'title':
      return richTextToPlain(property.title);
    case 'rich_text':
      return richTextToPlain(property.rich_text);
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map((item) => item.name).join(', ') || '';
    case 'status':
      return property.status?.name || '';
    case 'number':
      return property.number == null ? '' : String(property.number);
    case 'date':
      return property.date?.start || '';
    case 'people':
      return property.people?.map((person) => person.name || person.id).join(', ') || '';
    case 'files':
      return property.files?.map((file) => file.name || file.external?.url || file.file?.url).join(', ') || '';
    case 'relation':
      return property.relation?.map((item) => item.id).join(', ') || '';
    case 'url':
      return property.url || '';
    case 'formula':
      return property.formula?.[property.formula.type] == null ? '' : String(property.formula[property.formula.type]);
    case 'rollup':
      return `[rollup:${property.rollup?.type || 'unknown'}]`;
    case 'created_time':
      return property.created_time || '';
    default:
      return `[${property.type}]`;
  }
}

let projectDataSourceId = projectDataSourceIdFromEnv;
let databaseTitle = '';

if (!projectDataSourceId && projectDatabaseId) {
  const database = await notionRequest(`https://api.notion.com/v1/databases/${projectDatabaseId}`);
  databaseTitle = database.title?.map((item) => item.plain_text).join('') || '';
  const firstSource = database.data_sources?.[0];
  if (!firstSource?.id) {
    throw new Error('Project database did not return data_sources.');
  }
  projectDataSourceId = firstSource.id;
  console.log(`Project database title: ${databaseTitle || '(untitled)'}`);
  console.log(`Project data source: ${projectDataSourceId} | ${firstSource.name || '(unnamed)'}`);
}

const data = await notionRequest(
  `https://api.notion.com/v1/data_sources/${projectDataSourceId}/query`,
  {
    method: 'POST',
    body: JSON.stringify({ page_size: 5 }),
  }
);

const propertySamples = new Map();

for (const page of data.results || []) {
  for (const [name, property] of Object.entries(page.properties || {})) {
    if (!propertySamples.has(name)) {
      propertySamples.set(name, { type: property.type, samples: [] });
    }
    const entry = propertySamples.get(name);
    const sample = summarizeProperty(property);
    if (sample && !entry.samples.includes(sample)) {
      entry.samples.push(sample);
    }
  }
}

const lines = [
  '# Notion Project Property Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Project database ID: ${projectDatabaseId || ''}`,
  `Project data source ID: ${projectDataSourceId}`,
  `Project database title: ${databaseTitle || '(from data source only)'}`,
  `Sample pages: ${(data.results || []).length}`,
  '',
  '| Property | Notion Type | Sample Values |',
  '|---|---|---|',
];

for (const [name, entry] of [...propertySamples.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-Hans-CN'))) {
  const samples = entry.samples.slice(0, 3).map((sample) => sample.replace(/\|/g, '\\|')).join('<br>');
  lines.push(`| ${name.replace(/\|/g, '\\|')} | ${entry.type} | ${samples} |`);
}

mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Wrote ${reportPath}`);
console.log(`Project properties found: ${propertySamples.size}`);

