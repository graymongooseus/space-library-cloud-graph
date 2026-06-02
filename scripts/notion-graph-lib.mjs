const CATEGORY_COLORS = {
  '空间名称': '#1f77b4',
  '学校项目': '#ff7f0e',
  '学校类型': '#2ca02c',
  'Education Project': '#c7d2fe',
};

const EDUCATION_PROJECT_NODE = {
  id: 'education_project',
  label: 'Education Project',
  category: 'Education Project',
};

export function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

export function normalizeRoomType(value) {
  return String(value || '').trim();
}

function addNode(nodes, id, label, category, extra = {}) {
  if (!id || !label) return;
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      label,
      category,
      size: extra.size || 14,
      ...extra,
    });
    return;
  }

  const existing = nodes.get(id);
  nodes.set(id, {
    ...existing,
    ...extra,
    meta: {
      ...(existing.meta || {}),
      ...(extra.meta || {}),
    },
  });
}

function addLink(links, source, target, relation) {
  if (!source || !target || source === target) return;
  const key = `${source}|${target}|${relation}`;
  if (!links.has(key)) {
    links.set(key, { source, target, relation });
  }
}

function cleanList(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function projectMeta(project) {
  const meta = {};
  for (const [key, value] of Object.entries(project || {})) {
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    meta[key] = value;
  }
  return meta;
}

function spaceMeta(space) {
  const meta = {};
  const activities = cleanList(space.activities);
  const equipment = cleanList(space.equipment);

  if (activities.length) meta.activities = activities;
  if (equipment.length) meta.equipment = equipment;
  if (space.unitPrice) meta.unitPrice = space.unitPrice;

  return meta;
}

export function buildGraphFromSpaces(spaces) {
  const nodes = new Map();
  const links = new Map();
  const projectSpaceCounts = new Map();
  const schoolTypeProjectIds = new Map();

  for (const space of spaces) {
    const spaceId = `space_${slug(space.id)}`;
    addNode(nodes, spaceId, space.name || '未命名空间', '空间名称', {
      description: space.description || '',
      images: cleanList(space.images),
      size: 8,
      meta: {
        notionPageId: space.id,
        space: spaceMeta(space),
      },
    });

    for (const project of space.projects || []) {
      if (!project?.name) continue;
      const projectId = `project_${slug(project.id || project.name)}`;
      const schoolTypes = cleanList([project.schoolType, ...(project.schoolTypes || [])]);

      addNode(nodes, projectId, project.name, '学校项目', {
        size: 16,
        meta: {
          project: projectMeta(project),
        },
      });
      addLink(links, spaceId, projectId, '学校项目');
      projectSpaceCounts.set(projectId, (projectSpaceCounts.get(projectId) || 0) + 1);

      for (const schoolType of schoolTypes) {
        const schoolTypeId = `school_type_${slug(schoolType)}`;
        addNode(nodes, schoolTypeId, schoolType, '学校类型', { size: 18 });
        addLink(links, projectId, schoolTypeId, '学校类型');
        if (!schoolTypeProjectIds.has(schoolTypeId)) schoolTypeProjectIds.set(schoolTypeId, new Set());
        schoolTypeProjectIds.get(schoolTypeId).add(projectId);
      }
    }
  }

  for (const [id, count] of projectSpaceCounts.entries()) {
    const project = nodes.get(id);
    if (!project) continue;
    project.size = Math.min(34, 12 + Math.sqrt(count) * 4);
    project.meta = {
      ...(project.meta || {}),
      project: {
        ...(project.meta?.project || {}),
        spaceCount: count,
      },
    };
  }

  for (const [id, projectIds] of schoolTypeProjectIds.entries()) {
    const schoolType = nodes.get(id);
    if (!schoolType) continue;
    const count = projectIds.size;
    schoolType.size = Math.min(42, 18 + Math.sqrt(count) * 6);
    schoolType.meta = {
      ...(schoolType.meta || {}),
      schoolType: {
        ...(schoolType.meta?.schoolType || {}),
        projectCount: count,
      },
    };
  }

  if (schoolTypeProjectIds.size) {
    addNode(nodes, EDUCATION_PROJECT_NODE.id, EDUCATION_PROJECT_NODE.label, EDUCATION_PROJECT_NODE.category, {
      size: 34,
      meta: { center: true },
    });
    for (const schoolTypeId of schoolTypeProjectIds.keys()) {
      addLink(links, EDUCATION_PROJECT_NODE.id, schoolTypeId, 'Education Project');
    }
  }

  return {
    categories: Object.entries(CATEGORY_COLORS).map(([name, color]) => ({ name, color })),
    nodes: [...nodes.values()],
    links: [...links.values()],
  };
}
