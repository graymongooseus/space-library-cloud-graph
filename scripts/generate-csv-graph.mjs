import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildGraphFromSpaces, slug } from './notion-graph-lib.mjs';

const root = path.resolve('.');
const csvPath = path.join(root, 'data downloaded', '7 SPACE LIBRARY 空间产品库_all.csv');
const outputPath = path.join(root, 'space-library-graph.json');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, '').trim());
  return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNotionRelations(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const relations = [];
  const pattern = /([^,(]+(?:\s+[^,(]+)*?)\s*\(https:\/\/www\.notion\.so\/([^)]+)\)/g;
  let match;

  while ((match = pattern.exec(text))) {
    const name = match[1].trim();
    const urlPart = match[2].trim();
    relations.push({
      id: urlPart.replace(/\?.*$/, '').split('-').pop() || slug(name),
      name,
      notionUrl: `https://www.notion.so/${urlPart}`,
    });
  }

  if (!relations.length) {
    for (const name of splitList(text)) {
      relations.push({ id: slug(name), name });
    }
  }

  return relations;
}

function imagePaths(value) {
  return splitList(value)
    .map((file) => file.replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
    .map((file) => `images/${file}`);
}

if (!existsSync(csvPath)) {
  throw new Error(`Missing CSV file: ${path.relative(root, csvPath)}`);
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const spaces = rows
  .filter((row) => row['空间名称'])
  .map((row, index) => ({
    id: `${index + 1}-${row['空间名称']}`,
    name: row['空间名称'],
    roomType: row['房间类型'],
    schoolType: row['学校类型'],
    activities: splitList(row['活动内容']),
    styles: splitList(row['设计风格']),
    colors: splitList(row['色系']),
    cost: row['单方造价'],
    materials: [
      ...splitList(row['地面材料']),
      ...splitList(row['天花材料']),
    ],
    equipment: splitList(row['配套设备']),
    images: imagePaths(row['缩略图预览']),
    projects: parseNotionRelations(row['Related to 1.PROJECT 工作项目 (🖼Space 空间产品)'] || row['相关项目']),
    description: [
      row['学校类型'],
      row['房间类型'],
      row['活动内容'],
    ].filter(Boolean).join(' · '),
  }));

const graph = buildGraphFromSpaces(spaces);

writeFileSync(outputPath, `${JSON.stringify({
  meta: {
    title: 'SPACE LIBRARY 空间产品库 · 3D 知识关系云图',
    source: 'CSV - data downloaded/7 SPACE LIBRARY 空间产品库_all.csv',
    generated: new Date().toISOString().slice(0, 10),
  },
  ...graph,
}, null, 2)}\n`, 'utf8');

console.log(`CSV rows: ${rows.length}`);
console.log(`Spaces: ${spaces.length}`);
console.log(`Categories: ${graph.categories.length}`);
console.log(`Nodes: ${graph.nodes.length}`);
console.log(`Links: ${graph.links.length}`);
console.log(`Wrote ${path.relative(root, outputPath)}`);
