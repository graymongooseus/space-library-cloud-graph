import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const graphPath = path.join(root, 'space-library-graph.json');
const imagesDir = path.join(root, 'images');
const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

for (const file of readdirSync(imagesDir)) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;

  const relativePath = `images/${file}`;
  const baseName = file.replace(/\.(jpe?g|png|webp)$/i, '');
  const nodeId = baseName.endsWith('_photo') ? baseName.slice(0, -6) : baseName;
  const node = nodesById.get(nodeId);
  if (!node) continue;

  if (!Array.isArray(node.images)) {
    node.images = [];
  }
  if (!node.images.includes(relativePath)) {
    node.images.push(relativePath);
  }
}

writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');

