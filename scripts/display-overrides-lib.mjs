const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function emptyDisplayOverrides() {
  return {
    nodes: {},
    theme: {
      categories: {},
      links: {},
      scene3d: {},
    },
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizedString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function validColor(value) {
  return typeof value === 'string' && COLOR_RE.test(value);
}

function validNumber(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function normalizeNodeOverride(rawNode) {
  if (!isPlainObject(rawNode)) return undefined;
  const node = {};
  const hoverTag = normalizedString(rawNode.hoverTag);
  const detailNote = normalizedString(rawNode.detailNote);

  if (hoverTag) node.hoverTag = hoverTag;
  if (detailNote) node.detailNote = detailNote;

  return Object.keys(node).length ? node : undefined;
}

function normalizeCategoryTheme(rawCategory) {
  if (!isPlainObject(rawCategory)) return undefined;
  const category = {};

  if (validColor(rawCategory.color)) category.color = rawCategory.color;
  if (validNumber(rawCategory.sizeScale, 0.2, 4)) category.sizeScale = rawCategory.sizeScale;
  if (validNumber(rawCategory.opacity, 0, 1)) category.opacity = rawCategory.opacity;

  return Object.keys(category).length ? category : undefined;
}

function normalizeLinkTheme(rawLink) {
  if (!isPlainObject(rawLink)) return undefined;
  const link = {};

  if (validNumber(rawLink.opacity, 0, 1)) link.opacity = rawLink.opacity;
  if (validNumber(rawLink.width, 0.1, 8)) link.width = rawLink.width;

  return Object.keys(link).length ? link : undefined;
}

function normalizeScene3dTheme(rawScene3d) {
  if (!isPlainObject(rawScene3d)) return {};
  const scene3d = {};

  if (validColor(rawScene3d.backgroundColor)) scene3d.backgroundColor = rawScene3d.backgroundColor;
  if (validNumber(rawScene3d.glowStrength, 0, 4)) scene3d.glowStrength = rawScene3d.glowStrength;

  return scene3d;
}

function normalizeKeyedObject(rawValues, normalizeValue) {
  if (!isPlainObject(rawValues)) return {};
  const values = {};

  for (const [key, rawValue] of Object.entries(rawValues)) {
    const normalized = normalizeValue(rawValue);
    if (normalized) values[key] = normalized;
  }

  return values;
}

export function normalizeDisplayOverrides(rawOverrides = {}) {
  const raw = isPlainObject(rawOverrides) ? rawOverrides : {};
  const rawTheme = isPlainObject(raw.theme) ? raw.theme : {};

  return {
    nodes: normalizeKeyedObject(raw.nodes, normalizeNodeOverride),
    theme: {
      categories: normalizeKeyedObject(rawTheme.categories, normalizeCategoryTheme),
      links: normalizeKeyedObject(rawTheme.links, normalizeLinkTheme),
      scene3d: normalizeScene3dTheme(rawTheme.scene3d),
    },
  };
}

export function mergeGraphWithOverrides(graph, rawOverrides) {
  const overrides = normalizeDisplayOverrides(rawOverrides);
  const nodeIds = new Set((graph.nodes || []).map((node) => node.id));
  const orphanNodeOverrides = Object.keys(overrides.nodes)
    .filter((nodeId) => !nodeIds.has(nodeId))
    .sort();

  return {
    ...graph,
    categories: (graph.categories || []).map((category) => ({
      ...category,
      ...(overrides.theme.categories[category.name]?.color
        ? { color: overrides.theme.categories[category.name].color }
        : {}),
    })),
    nodes: (graph.nodes || []).map((node) => {
      const display = overrides.nodes[node.id];
      if (!display) return { ...node };
      return {
        ...node,
        display: {
          ...(node.display || {}),
          ...display,
        },
      };
    }),
    displayTheme: overrides.theme,
    displayMeta: {
      ...(graph.displayMeta || {}),
      orphanNodeOverrides,
    },
  };
}
