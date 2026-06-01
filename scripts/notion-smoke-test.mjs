import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const envPath = path.join(root, '.env');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const values = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    values[key] = value.replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = { ...process.env, ...loadEnvFile(envPath) };
const token = env.NOTION_TOKEN;
const databaseId = env.NOTION_DATABASE_ID;
const dataSourceId = env.NOTION_DATA_SOURCE_ID;
const notionVersion = env.NOTION_VERSION || '2026-03-11';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
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
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { response, body };
}

if (!token) {
  fail('Missing NOTION_TOKEN. Copy .env.example to .env and fill NOTION_TOKEN first.');
} else if (!databaseId && !dataSourceId) {
  fail('Missing NOTION_DATABASE_ID or NOTION_DATA_SOURCE_ID in .env.');
} else {
  console.log(`Using Notion-Version: ${notionVersion}`);

  if (databaseId) {
    const { response, body } = await notionRequest(`https://api.notion.com/v1/databases/${databaseId}`);
    console.log(`Retrieve database: HTTP ${response.status}`);

    if (!response.ok) {
      console.error(JSON.stringify(body, null, 2));
      process.exitCode = 1;
    } else {
      console.log(`Database title: ${body.title?.map((item) => item.plain_text).join('') || '(untitled)'}`);
      if (Array.isArray(body.data_sources)) {
        console.log('Data sources:');
        for (const source of body.data_sources) {
          console.log(`- ${source.id} | ${source.name || '(unnamed)'}`);
        }
      } else {
        console.log('No data_sources array returned on database object.');
      }
    }
  }

  if (dataSourceId) {
    const { response, body } = await notionRequest(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({ page_size: 3 }),
      }
    );
    console.log(`Query data source: HTTP ${response.status}`);

    if (!response.ok) {
      console.error(JSON.stringify(body, null, 2));
      process.exitCode = 1;
    } else {
      console.log(`Results returned: ${body.results?.length || 0}`);
      for (const item of body.results || []) {
        console.log(`- ${item.id} | ${item.object}`);
      }
    }
  }
}
