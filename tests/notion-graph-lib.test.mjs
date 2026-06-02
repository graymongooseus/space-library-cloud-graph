import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGraphFromSpaces,
  normalizeRoomType,
} from '../scripts/notion-graph-lib.mjs';

test('keeps room type normalization as a plain compatibility helper', () => {
  assert.equal(normalizeRoomType(' CANTEEN '), 'CANTEEN');
  assert.equal(normalizeRoomType(''), '');
});

test('creates space name nodes linked through school projects to school types', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'page-a',
      name: '走廊楼梯 A',
      activities: ['DISPLAY'],
      equipment: ['电子白板'],
      unitPrice: '$$',
      projects: [{ id: 'project-1', name: 'Project One', schoolType: '国际学校 INTERNATIONAL' }],
      images: ['uploads/page-a.jpg'],
    },
    {
      id: 'page-b',
      name: '图书馆 B',
      activities: ['STUDY'],
      equipment: [],
      unitPrice: '$$$',
      projects: [{ id: 'project-1', name: 'Project One', schoolType: '国际学校 INTERNATIONAL' }],
      images: [],
    },
  ]);

  const spaceNodes = graph.nodes.filter((node) => node.category === '空间名称');
  assert.equal(spaceNodes.length, 2);
  assert.ok(spaceNodes.some((node) => node.id === 'space_page_a'));
  assert.ok(spaceNodes.some((node) => node.id === 'space_page_b'));

  const projectNode = graph.nodes.find((node) => node.id === 'project_project_1');
  assert.equal(projectNode.category, '学校项目');
  assert.equal(projectNode.meta.project.spaceCount, 2);

  const schoolTypeNode = graph.nodes.find((node) => node.category === '学校类型');
  assert.equal(schoolTypeNode.label, '国际学校 INTERNATIONAL');

  assert.ok(graph.links.some((link) => link.source === 'space_page_a' && link.target === 'project_project_1' && link.relation === '学校项目'));
  assert.ok(graph.links.some((link) => link.source === 'project_project_1' && link.target === schoolTypeNode.id && link.relation === '学校类型'));
});

test('keeps requested space attributes on space detail metadata', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-attrs',
      name: '带属性空间',
      activities: ['SERVICE', 'STUDY'],
      equipment: ['活动桌椅'],
      unitPrice: '$$ - （￥1000 -￥2000）',
      projects: [],
      images: [],
    },
  ]);

  const spaceNode = graph.nodes.find((node) => node.id === 'space_space_attrs');
  assert.deepEqual(spaceNode.meta.space, {
    activities: ['SERVICE', 'STUDY'],
    equipment: ['活动桌椅'],
    unitPrice: '$$ - （￥1000 -￥2000）',
  });
});

test('keeps project detail metadata on school project nodes for front-end panels', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: '餐厅案例',
      activities: [],
      equipment: [],
      unitPrice: '',
      images: [],
      projects: [
        {
          id: 'project-rich',
          name: 'Rich Project',
          status: 'Done',
          period: '2023-08-01',
          managers: ['Alice'],
          schoolType: '国际学校 INTERNATIONAL',
          description: '项目说明',
        },
      ],
    },
  ]);

  const projectNode = graph.nodes.find((node) => node.id === 'project_project_rich');
  assert.equal(projectNode.category, '学校项目');
  assert.deepEqual(projectNode.meta.project, {
    id: 'project-rich',
    name: 'Rich Project',
    status: 'Done',
    period: '2023-08-01',
    managers: ['Alice'],
    schoolType: '国际学校 INTERNATIONAL',
    description: '项目说明',
    spaceCount: 1,
  });
});

test('scales school project nodes by connected space count and keeps space name nodes smaller', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: '空间 1',
      activities: [],
      equipment: [],
      unitPrice: '',
      images: [],
      projects: [{ id: 'project-many', name: 'Many Spaces' }],
    },
    {
      id: 'space-2',
      name: '空间 2',
      activities: [],
      equipment: [],
      unitPrice: '',
      images: [],
      projects: [{ id: 'project-many', name: 'Many Spaces' }],
    },
    {
      id: 'space-3',
      name: '空间 3',
      activities: [],
      equipment: [],
      unitPrice: '',
      images: [],
      projects: [{ id: 'project-one', name: 'One Space' }],
    },
  ]);

  const many = graph.nodes.find((node) => node.id === 'project_project_many');
  const one = graph.nodes.find((node) => node.id === 'project_project_one');
  const space = graph.nodes.find((node) => node.id === 'space_space_1');

  assert.ok(many.size > one.size);
  assert.ok(space.size < one.size);
});

test('scales school type nodes by connected school project count', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: '空间 1',
      projects: [{ id: 'project-a', name: 'A', schoolType: '国际学校 INTERNATIONAL' }],
    },
    {
      id: 'space-2',
      name: '空间 2',
      projects: [{ id: 'project-b', name: 'B', schoolType: '国际学校 INTERNATIONAL' }],
    },
    {
      id: 'space-3',
      name: '空间 3',
      projects: [{ id: 'project-c', name: 'C', schoolType: '幼儿园 KINDERGARTEN' }],
    },
  ]);

  const many = graph.nodes.find((node) => node.id === 'school_type_国际学校_international');
  const one = graph.nodes.find((node) => node.id === 'school_type_幼儿园_kindergarten');

  assert.equal(many.meta.schoolType.projectCount, 2);
  assert.equal(one.meta.schoolType.projectCount, 1);
  assert.ok(many.size > one.size);
});

test('adds one central education project node connected to every school type', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: 'Space 1',
      projects: [{ id: 'project-a', name: 'A', schoolType: 'Type A' }],
    },
    {
      id: 'space-2',
      name: 'Space 2',
      projects: [{ id: 'project-b', name: 'B', schoolType: 'Type B' }],
    },
  ]);

  const centerNode = graph.nodes.find((node) => node.id === 'education_project');
  const schoolTypeNodes = graph.nodes.filter((node) => node.category === '学校类型');

  assert.equal(centerNode.label, 'Education Project');
  assert.equal(centerNode.category, 'Education Project');
  assert.equal(schoolTypeNodes.length, 2);
  assert.equal(
    graph.links.filter((link) => link.source === 'education_project' && link.relation === 'Education Project').length,
    schoolTypeNodes.length,
  );
});
