import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { slug } from './notion-graph-lib.mjs';

export function imageManifestKey({ pageId, propertyName, index }) {
  return `${pageId}:${propertyName}:${index}`;
}

function extensionFromContentType(contentType = '') {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  return 'jpg';
}

function asciiPathPart(value) {
  const aliases = new Map([
    ['缩略图预览', 'thumbnail_preview'],
  ]);
  const alias = aliases.get(String(value || '').trim());
  if (alias) return alias;

  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'image';
}

export function localImagePathForFile({ pageId, propertyName, index, contentType }) {
  const extension = extensionFromContentType(contentType);
  return `images/${asciiPathPart(pageId)}-${asciiPathPart(propertyName)}-${index}.${extension}`;
}

export function readImageManifest(filePath) {
  if (!existsSync(filePath)) return { images: {} };
  const manifest = JSON.parse(readFileSync(filePath, 'utf8'));
  return {
    ...manifest,
    images: manifest.images || {},
  };
}

export function localImagesForPage(manifest, pageId, propertyName) {
  return Object.values(manifest?.images || {})
    .filter((image) => image.notionPageId === pageId && image.propertyName === propertyName && image.localPath)
    .sort((left, right) => left.index - right.index)
    .map((image) => image.localPath);
}

export function hasDownloadedImage(root, entry) {
  if (!entry?.localPath) return false;
  const filePath = path.join(root, entry.localPath);
  return existsSync(filePath) && statSync(filePath).size > 0;
}
