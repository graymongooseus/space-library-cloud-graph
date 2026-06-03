import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyDisplayOverrides,
  mergeGraphWithOverrides,
  normalizeDisplayOverrides,
} from '../scripts/display-overrides-lib.mjs';

function plainOverrides(overrides) {
  return {
    nodes: { ...overrides.nodes },
    theme: {
      categories: { ...overrides.theme.categories },
      links: { ...overrides.theme.links },
      scene3d: { ...overrides.theme.scene3d },
    },
  };
}

test('creates an empty display override document', () => {
  const overrides = emptyDisplayOverrides();

  assert.deepEqual(plainOverrides(overrides), {
    nodes: {},
    theme: {
      categories: {},
      links: {},
      scene3d: {},
    },
  });
  assert.equal(Object.getPrototypeOf(overrides.nodes), null);
  assert.equal(Object.getPrototypeOf(overrides.theme.categories), null);
  assert.equal(Object.getPrototypeOf(overrides.theme.links), null);
});

test('adds node display overrides without replacing node text fields', () => {
  const graph = {
    categories: [{ name: 'Spaces', color: '#123456' }],
    nodes: [
      {
        id: 'space_1',
        label: 'Original label',
        description: 'Original description',
      },
    ],
    links: [],
  };

  const merged = mergeGraphWithOverrides(graph, {
    nodes: {
      space_1: {
        hoverTag: ' Featured ',
        detailNote: ' Use this in the demo ',
      },
    },
  });

  assert.equal(merged.nodes[0].label, 'Original label');
  assert.equal(merged.nodes[0].description, 'Original description');
  assert.deepEqual(merged.nodes[0].display, {
    hoverTag: 'Featured',
    detailNote: 'Use this in the demo',
  });
  assert.equal(graph.nodes[0].display, undefined);
});

test('applies valid category, link, and scene3d theme overrides', () => {
  const graph = {
    categories: [
      { name: 'Spaces', color: '#123456' },
      { name: 'Projects', color: '#abcdef' },
    ],
    nodes: [],
    links: [],
  };

  const merged = mergeGraphWithOverrides(graph, {
    theme: {
      categories: {
        Spaces: {
          color: '#fff',
          sizeScale: 1.5,
          opacity: 0.75,
        },
      },
      links: {
        Project: {
          opacity: 0.4,
          width: 3,
        },
      },
      scene3d: {
        backgroundColor: '#112233',
        glowStrength: 2,
      },
    },
  });

  assert.deepEqual(merged.categories, [
    { name: 'Spaces', color: '#fff' },
    { name: 'Projects', color: '#abcdef' },
  ]);
  assert.deepEqual(plainOverrides({ nodes: {}, theme: merged.displayTheme }).theme, {
    categories: {
      Spaces: {
        color: '#fff',
        sizeScale: 1.5,
        opacity: 0.75,
      },
    },
    links: {
      Project: {
        opacity: 0.4,
        width: 3,
      },
    },
    scene3d: {
      backgroundColor: '#112233',
      glowStrength: 2,
    },
  });
  assert.notEqual(merged.categories[0], graph.categories[0]);
});

test('ignores invalid theme override values', () => {
  assert.deepEqual(
    plainOverrides(normalizeDisplayOverrides({
      theme: {
        categories: {
          Spaces: {
            color: 'red',
            sizeScale: 4.1,
            opacity: -0.1,
          },
          Projects: {
            color: '#abcd',
            sizeScale: 0.19,
            opacity: 1.1,
          },
        },
        links: {
          Project: {
            opacity: 1.1,
            width: 0.09,
          },
        },
        scene3d: {
          backgroundColor: '#12345g',
          glowStrength: 4.1,
        },
      },
    })),
    plainOverrides(emptyDisplayOverrides()),
  );
});

test('records orphaned node overrides in sorted order', () => {
  const merged = mergeGraphWithOverrides(
    {
      categories: [],
      nodes: [{ id: 'node_b' }],
      links: [],
    },
    {
      nodes: {
        node_z: { hoverTag: 'Zed' },
        node_a: { detailNote: 'Aye' },
        node_b: { hoverTag: 'Bee' },
      },
    },
  );

  assert.deepEqual(merged.displayMeta.orphanNodeOverrides, ['node_a', 'node_z']);
});

test('normalizes missing and null override sections', () => {
  assert.deepEqual(plainOverrides(normalizeDisplayOverrides()), plainOverrides(emptyDisplayOverrides()));
  assert.deepEqual(
    plainOverrides(normalizeDisplayOverrides({
      nodes: null,
      theme: {
        categories: null,
        links: null,
        scene3d: null,
      },
    })),
    plainOverrides(emptyDisplayOverrides()),
  );
});

test('ignores parsed prototype keys in user-keyed override maps', () => {
  const rawOverrides = JSON.parse(`{
    "nodes": {
      "__proto__": { "hoverTag": "Prototype node" },
      "safe_node": { "hoverTag": " Safe node " }
    },
    "theme": {
      "categories": {
        "__proto__": { "color": "#fff" },
        "Spaces": { "color": "#000" }
      },
      "links": {
        "__proto__": { "opacity": 0.5 },
        "Project": { "width": 2 }
      }
    }
  }`);

  const normalized = normalizeDisplayOverrides(rawOverrides);
  assert.equal(Object.hasOwn(normalized.nodes, '__proto__'), false);
  assert.equal(Object.hasOwn(normalized.theme.categories, '__proto__'), false);
  assert.equal(Object.hasOwn(normalized.theme.links, '__proto__'), false);
  assert.equal(Object.getPrototypeOf(normalized.nodes), null);
  assert.equal(Object.getPrototypeOf(normalized.theme.categories), null);
  assert.equal(Object.getPrototypeOf(normalized.theme.links), null);

  const merged = mergeGraphWithOverrides(
    {
      categories: [
        { name: '__proto__', color: '#111' },
        { name: 'Spaces', color: '#222' },
      ],
      nodes: [
        { id: '__proto__', label: 'Prototype-looking node' },
        { id: 'safe_node', label: 'Safe node' },
      ],
      links: [],
    },
    rawOverrides,
  );

  assert.equal(merged.categories[0].color, '#111');
  assert.equal(merged.categories[1].color, '#000');
  assert.equal(merged.nodes[0].display, undefined);
  assert.deepEqual(merged.nodes[1].display, { hoverTag: 'Safe node' });
  assert.equal(Object.prototype.hoverTag, undefined);
});
