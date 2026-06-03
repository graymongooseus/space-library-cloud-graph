import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const graph = JSON.parse(readFileSync(path.join(root, 'space-library-graph.json'), 'utf8'));
const html = readFileSync(path.join(root, 'space-library-cloud.html'), 'utf8');

const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
const referencedImages = new Set(
  graph.nodes.flatMap((node) => Array.isArray(node.images) ? node.images : [])
);
const endpointId = (endpoint) => endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;

assert.equal(
  [...referencedImages].filter((relativePath) => relativePath.startsWith(['images', 'notion'].join('/') + '/')).length,
  0,
  'graph image references should point directly under images/ for VPS packaging'
);

function relatedNodes(node) {
  return graph.links
    .filter((link) => endpointId(link.source) === node.id || endpointId(link.target) === node.id)
    .map((link) => nodesById.get(endpointId(link.source) === node.id ? endpointId(link.target) : endpointId(link.source)))
    .filter(Boolean);
}

function detailImages(node) {
  const seen = new Set();
  const images = [];
  const addImages = (sourceNode) => {
    for (const image of sourceNode.images || []) {
      if (seen.has(image)) continue;
      seen.add(image);
      images.push(image);
    }
  };
  addImages(node);
  relatedNodes(node).forEach(addImages);
  return images;
}

for (const relativePath of referencedImages) {
  assert.ok(
    existsSync(path.join(root, relativePath)),
    `${relativePath} is referenced in graph JSON but missing on disk`
  );
}

const projectWithRelatedImages = graph.nodes.find((node) => (
  node.category === '学校项目' && detailImages(node).length > 0
));
assert.ok(projectWithRelatedImages, 'at least one school project should show detail images from related spaces');

for (const file of readdirSync(path.join(root, 'images'))) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;

  const relativePath = `images/${file}`;
  const baseName = file.replace(/\.(jpe?g|png|webp)$/i, '');
  const nodeId = baseName.endsWith('_photo') ? baseName.slice(0, -6) : baseName;

  if (!nodesById.has(nodeId)) continue;

  assert.ok(
    referencedImages.has(relativePath),
    `${relativePath} exists locally and matches node ${nodeId}, but is not referenced in graph JSON`
  );

  assert.ok(
    existsSync(path.join(root, relativePath)),
    `${relativePath} is referenced but missing on disk`
  );
}

assert.match(
  html,
  /function getDetailImages\(/,
  'detail panel should collect images through getDetailImages()'
);

assert.match(
  html,
  /const detailImages = getDetailImages\(d, rels\);/,
  'click handler should collect current and related-node images before rendering the detail gallery'
);

assert.match(
  html,
  /detailImages\.map/,
  'detail gallery should render collected detailImages instead of only d.images'
);

