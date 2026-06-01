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

const counts = new Map();
let cursor;
let pagesScanned = 0;

while (pagesScanned < 100) {
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
    for (const [name, property] of Object.entries(page.properties || {})) {
      if (property.type !== 'relation') continue;
      if (!counts.has(name)) {
        counts.set(name, { pagesWithValue: 0, relationItems: 0 });
      }
      const count = property.relation?.length || 0;
      if (count > 0) {
        counts.get(name).pagesWithValue += 1;
        counts.get(name).relationItems += count;
      }
    }
  }

  if (!data.has_more || !data.next_cursor) break;
  cursor = data.next_cursor;
}

console.log(`Spaces scanned: ${pagesScanned}`);
for (const [name, count] of [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-Hans-CN'))) {
  console.log(`${name} | pagesWithValue=${count.pagesWithValue} | relationItems=${count.relationItems}`);
}

