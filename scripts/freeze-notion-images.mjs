import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  hasDownloadedImage,
  imageManifestKey,
  localImagePathForFile,
  readImageManifest,
} from './notion-image-freeze.mjs';

const root = path.resolve('.');
const envPath = path.join(root, '.env');
const manifestPath = path.join(root, 'generated', 'notion-image-manifest.json');

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
const imageProperty = env.NOTION_IMAGE_PROPERTY || '缩略图预览';
const concurrency = Number(env.NOTION_IMAGE_DOWNLOAD_CONCURRENCY || 6);

if (!token) {
  console.error('Missing NOTION_TOKEN.');
  process.exit(1);
}

if (!dataSourceId) {
  console.error('Missing NOTION_DATA_SOURCE_ID.');
  process.exit(1);
}

async function notionRequest(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': notionVersion,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (response.ok) return body;
      lastError = new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    await wait(500 * attempt);
  }
  throw lastError;
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

function filesFromProperty(page, propertyName) {
  const property = page.properties?.[propertyName];
  if (!property || property.type !== 'files') return [];
  return property.files
    .map((file, index) => {
      const url = file.type === 'external' ? file.external?.url : file.file?.url;
      if (!url) return null;
      return {
        pageId: page.id,
        propertyName,
        index,
        name: file.name || '',
        type: file.type,
        url,
      };
    })
    .filter(Boolean);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
      lastError.status = response.status;
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    await wait(500 * attempt);
  }
  throw lastError;
}

async function fetchImageResponse(image) {
  try {
    return await fetchWithRetry(image.url);
  } catch (error) {
    if (error.status !== 404 || image.type !== 'file') throw error;

    const refreshedPage = await notionRequest(`https://api.notion.com/v1/pages/${image.pageId}`);
    const refreshedImage = filesFromProperty(refreshedPage, image.propertyName)
      .find((item) => item.index === image.index);
    if (!refreshedImage?.url || refreshedImage.url === image.url) throw error;

    return fetchWithRetry(refreshedImage.url);
  }
}

function saveManifest() {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function runLimited(items, limit, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

const manifest = readImageManifest(manifestPath);
const pages = await queryAllDataSource(dataSourceId);
const imageFiles = pages.flatMap((page) => filesFromProperty(page, imageProperty));
const failures = [];
let skipped = 0;
let downloaded = 0;
let completed = 0;

function reportProgress() {
  completed += 1;
  if (completed % 10 === 0 || completed === imageFiles.length) {
    console.log(`Processed ${completed}/${imageFiles.length} images...`);
  }
}

mkdirSync(path.join(root, 'images'), { recursive: true });
mkdirSync(path.dirname(manifestPath), { recursive: true });

await runLimited(imageFiles, concurrency, async (image) => {
  const key = imageManifestKey(image);
  const existing = manifest.images[key];

  if (hasDownloadedImage(root, existing)) {
    skipped += 1;
    reportProgress();
    return;
  }

  try {
    const response = await fetchImageResponse(image);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const localPath = localImagePathForFile({ ...image, contentType });
    const filePath = path.join(root, localPath);
    const bytes = Buffer.from(await response.arrayBuffer());

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, bytes);

    manifest.images[key] = {
      notionPageId: image.pageId,
      propertyName: image.propertyName,
      index: image.index,
      name: image.name,
      type: image.type,
      localPath,
      contentType,
      downloadedAt: new Date().toISOString(),
    };
    downloaded += 1;
    saveManifest();
  } catch (error) {
    const parsedUrl = new URL(image.url);
    failures.push({
      key,
      pageId: image.pageId,
      propertyName: image.propertyName,
      index: image.index,
      name: image.name,
      type: image.type,
      urlPath: `${parsedUrl.host}${parsedUrl.pathname}`,
      error: error.message,
    });
  }
  reportProgress();
});

saveManifest();

console.log(`Notion pages scanned: ${pages.length}`);
console.log(`Image entries found: ${imageFiles.length}`);
console.log(`Images skipped: ${skipped}`);
console.log(`Images downloaded: ${downloaded}`);
console.log(`Failures: ${failures.length}`);
console.log(`Wrote ${path.relative(root, manifestPath)}`);

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
