const CATEGORY_COLORS = {
  '学校类型': '#e17055',
  '房间类型': '#6c5ce7',
  '活动内容': '#00b894',
  '空间产品': '#0984e3',
  '项目': '#2d3436',
};

const ROOM_TYPE_LABELS = new Map([
  ['CANTEEN', '餐厅 CANTEEN'],
  ['HALLWAY', '走廊楼梯 HALLWAY'],
  ['HALLWAY / STAIR', '走廊楼梯 HALLWAY'],
  ['STAIR', '走廊楼梯 HALLWAY'],
  ['REGULAR CLASSROOM', '普通教室 CLASSROOM'],
  ['CLASSROOM', '普通教室 CLASSROOM'],
  ['RESTROOM / TOILET', '卫生间 RESTROOM'],
  ['TOILET', '卫生间 RESTROOM'],
  ['RESTROOM', '卫生间 RESTROOM'],
  ['COMMON', '公共空间 COMMON'],
  ['LIBRARY', '图书馆 LIBRARY'],
  ['AUDITORIUM / PERFM. CENTER / MUTI-FUNCTION', '剧场报告厅 AUDITORIUM'],
  ['AUDITORIUM', '剧场报告厅 AUDITORIUM'],
  ['MAKER SPACE', '创客空间 MAKER'],
  ['MAKER', '创客空间 MAKER'],
  ['STEAM & LAB', 'STEAM实验室'],
  ['LAB', 'STEAM实验室'],
  ['STADIUM', '体育场 STADIUM'],
  ['DORM', '宿舍 DORM'],
  ['ENTRANCE', '门厅 ENTRANCE'],
  ['GYM', '健身更衣 GYM'],
  ['POOL', '游泳池 POOL'],
  ['OFFICE', '办公室 OFFICE'],
  ['OUTDOOR', '室外 OUTDOOR'],
  ['SHOWROOM', '展厅 SHOWROOM'],
  ['ADMIN', '行政 ADMIN'],
  ['SPECIAL', '功能教室 SPECIAL'],
]);

const ROOM_TYPE_IDS = new Map([
  ['餐厅 CANTEEN', 'room_canteen'],
  ['走廊楼梯 HALLWAY', 'room_hallway'],
  ['普通教室 CLASSROOM', 'room_classroom'],
  ['卫生间 RESTROOM', 'room_restroom'],
  ['公共空间 COMMON', 'room_common'],
  ['图书馆 LIBRARY', 'room_library'],
  ['剧场报告厅 AUDITORIUM', 'room_auditorium'],
  ['创客空间 MAKER', 'room_maker'],
  ['STEAM实验室', 'room_steam_lab'],
  ['体育场 STADIUM', 'room_stadium'],
  ['宿舍 DORM', 'room_dorm'],
  ['门厅 ENTRANCE', 'room_entrance'],
  ['健身更衣 GYM', 'room_gym'],
  ['游泳池 POOL', 'room_pool'],
  ['办公室 OFFICE', 'room_office'],
  ['室外 OUTDOOR', 'room_outdoor'],
  ['展厅 SHOWROOM', 'room_showroom'],
  ['行政 ADMIN', 'room_admin'],
  ['功能教室 SPECIAL', 'room_special'],
]);

export function normalizeRoomType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return '';
  return ROOM_TYPE_LABELS.get(normalized) || String(value).trim();
}

export function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function roomTypeId(label) {
  return ROOM_TYPE_IDS.get(label) || `room_${slug(label)}`;
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
  }
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

export function buildGraphFromSpaces(spaces) {
  const nodes = new Map();
  const links = new Map();

  for (const space of spaces) {
    const spaceId = `space_${slug(space.id)}`;
    addNode(nodes, spaceId, space.name || '未命名空间', '空间产品', {
      description: space.description || '',
      images: cleanList(space.images),
      size: 8,
      meta: {
        notionPageId: space.id,
        roomType: space.roomType || '',
        schoolType: space.schoolType || '',
      },
    });

    const roomLabel = normalizeRoomType(space.roomType);
    if (roomLabel) {
      const id = roomTypeId(roomLabel);
      addNode(nodes, id, roomLabel, '房间类型', { size: 22 });
      addLink(links, spaceId, id, '房间类型');
    }

    if (space.schoolType) {
      const schoolId = `school_${slug(space.schoolType)}`;
      addNode(nodes, schoolId, space.schoolType, '学校类型', { size: 20 });
      addLink(links, spaceId, schoolId, '学校类型');
    }

    for (const activity of cleanList(space.activities)) {
      const activityId = `activity_${slug(activity)}`;
      addNode(nodes, activityId, activity, '活动内容', { size: 16 });
      addLink(links, spaceId, activityId, '活动内容');
    }

    for (const project of space.projects || []) {
      if (!project?.name) continue;
      const projectId = `project_${slug(project.id || project.name)}`;
      addNode(nodes, projectId, project.name, '项目', {
        size: 16,
        meta: {
          project: projectMeta(project),
        },
      });
      addLink(links, spaceId, projectId, '相关项目');
    }
  }

  const linkValues = [...links.values()];
  const projectSpaceCounts = new Map();
  for (const link of linkValues) {
    if (link.relation !== '相关项目') continue;
    projectSpaceCounts.set(link.target, (projectSpaceCounts.get(link.target) || 0) + 1);
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

  return {
    categories: Object.entries(CATEGORY_COLORS).map(([name, color]) => ({ name, color })),
    nodes: [...nodes.values()],
    links: linkValues,
  };
}
