import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGraphFromSpaces,
  normalizeRoomType,
} from '../scripts/notion-graph-lib.mjs';

test('normalizes common room type labels', () => {
  assert.equal(normalizeRoomType('CANTEEN'), '餐厅 CANTEEN');
  assert.equal(normalizeRoomType('HALLWAY'), '走廊楼梯 HALLWAY');
  assert.equal(normalizeRoomType('REGULAR CLASSROOM'), '普通教室 CLASSROOM');
  assert.equal(normalizeRoomType('RESTROOM / TOILET'), '卫生间 RESTROOM');
  assert.equal(normalizeRoomType('COMMON'), '公共空间 COMMON');
});

test('creates one independent space node per Notion row and links each to its room type', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'page-a',
      name: '走廊楼梯 A',
      roomType: 'HALLWAY',
      schoolType: '国际学校',
      activities: ['DISPLAY'],
      styles: ['现代'],
      cost: '$$ - （￥1000 -￥2000）',
      materials: ['PVC地板'],
      equipment: [],
      projects: [{ id: 'project-1', name: 'Project One' }],
      images: ['uploads/page-a.jpg'],
    },
    {
      id: 'page-b',
      name: '走廊楼梯 B',
      roomType: 'HALLWAY',
      schoolType: '民办双语',
      activities: ['WAITING'],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
      projects: [{ id: 'project-2', name: 'Project Two' }],
      images: [],
    },
  ]);

  const spaceNodes = graph.nodes.filter((node) => node.category === '空间产品');
  assert.equal(spaceNodes.length, 2);
  assert.ok(spaceNodes.some((node) => node.id === 'space_page_a'));
  assert.ok(spaceNodes.some((node) => node.id === 'space_page_b'));

  const roomNode = graph.nodes.find((node) => node.id === 'room_hallway');
  assert.equal(roomNode.label, '走廊楼梯 HALLWAY');

  assert.ok(graph.links.some((link) => link.source === 'space_page_a' && link.target === 'room_hallway'));
  assert.ok(graph.links.some((link) => link.source === 'space_page_b' && link.target === 'room_hallway'));

  const projectNode = graph.nodes.find((node) => node.id === 'project_project_1');
  assert.equal(projectNode.label, 'Project One');
  assert.deepEqual(projectNode.meta.project, {
    id: 'project-1',
    name: 'Project One',
    spaceCount: 1,
  });
});

test('omits design attribute and material equipment nodes from the public browsing graph', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-attrs',
      name: '带材料和风格的空间',
      roomType: 'CANTEEN',
      schoolType: '国际学校',
      activities: ['DINING'],
      styles: ['现代'],
      cost: '$$',
      materials: ['PVC地板'],
      equipment: ['电子白板'],
      projects: [],
      images: [],
    },
  ]);

  assert.equal(graph.categories.some((category) => category.name === '设计属性'), false);
  assert.equal(graph.categories.some((category) => category.name === '材料设备'), false);
  assert.equal(graph.nodes.some((node) => node.category === '设计属性'), false);
  assert.equal(graph.nodes.some((node) => node.category === '材料设备'), false);
  assert.equal(graph.links.some((link) => ['设计风格', '造价', '材料', '配套设备'].includes(link.relation)), false);
});

test('keeps project detail metadata on project nodes for front-end panels', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: '餐厅案例',
      roomType: 'CANTEEN',
      schoolType: '',
      activities: [],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
      images: [],
      projects: [
        {
          id: 'project-rich',
          name: 'Rich Project',
          type: '委托',
          status: 'Done',
          priority: 'High',
          period: '2023-08-01',
          description: '项目说明',
          managers: ['Alice'],
          evaPath: 'P:\\PROJECT',
        },
      ],
    },
  ]);

  const projectNode = graph.nodes.find((node) => node.id === 'project_project_rich');
  assert.equal(projectNode.category, '项目');
  assert.deepEqual(projectNode.meta.project, {
    id: 'project-rich',
    name: 'Rich Project',
    type: '委托',
    status: 'Done',
    priority: 'High',
    period: '2023-08-01',
    description: '项目说明',
    managers: ['Alice'],
    evaPath: 'P:\\PROJECT',
    spaceCount: 1,
  });
});

test('scales project nodes by connected space count and keeps space product nodes smaller', () => {
  const graph = buildGraphFromSpaces([
    {
      id: 'space-1',
      name: '空间 1',
      roomType: 'CANTEEN',
      schoolType: '',
      activities: [],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
      images: [],
      projects: [{ id: 'project-many', name: 'Many Spaces' }],
    },
    {
      id: 'space-2',
      name: '空间 2',
      roomType: 'CANTEEN',
      schoolType: '',
      activities: [],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
      images: [],
      projects: [{ id: 'project-many', name: 'Many Spaces' }],
    },
    {
      id: 'space-3',
      name: '空间 3',
      roomType: 'LIBRARY',
      schoolType: '',
      activities: [],
      styles: [],
      cost: '',
      materials: [],
      equipment: [],
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
