import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyDisplayOverrides,
  mergeGraphWithOverrides,
  normalizeDisplayOverrides,
} from '../scripts/display-overrides-lib.mjs';

test('creates an empty display override document', () => {
  assert.deepEqual(emptyDisplayOverrides(), {
    nodes: {},
    theme: {
      categories: {},
      links: {},
      scene3d: {},
    },
  });
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
  assert.deepEqual(merged.displayTheme, {
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
    normalizeDisplayOverrides({
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
    }),
    emptyDisplayOverrides(),
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
  assert.deepEqual(normalizeDisplayOverrides(), emptyDisplayOverrides());
  assert.deepEqual(
    normalizeDisplayOverrides({
      nodes: null,
      theme: {
        categories: null,
        links: null,
        scene3d: null,
      },
    }),
    emptyDisplayOverrides(),
  );
});
