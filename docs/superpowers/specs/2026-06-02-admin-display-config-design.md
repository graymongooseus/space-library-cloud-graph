# Admin Display Config Design

## Goal

Build a lightweight admin surface for the Space Library graph that lets one maintainer tune display behavior without turning the project into a full CMS.

Notion remains the source of truth for core data: spaces, projects, relations, and database properties. Images are treated as already-hosted display assets outside this admin flow. The local admin manages only presentation-specific overrides: hover text, detail-panel supplemental notes, and visual style settings.

## Assumptions

- The first version saves changes locally, not back to Notion.
- Notion write-back is a later phase behind a small local API, not a browser-side direct Notion API call.
- The admin is for one trusted maintainer running the project locally.
- The existing static graph pages should keep working with generated JSON data.
- The project should avoid a large framework unless the implementation plan proves it is necessary.
- Image upload, image hosting, and Notion image syncing are out of scope. Existing VPS-hosted image URLs should continue to render as display data.

## Recommended Approach

Use a local display override JSON file that is merged with Notion-generated graph data.

Data flow:

```text
Notion database
  -> scripts/generate-notion-graph.mjs
  -> generated/notion-graph.json
  +  local display overrides
  -> final graph data consumed by 2D and 3D pages
```

The admin edits the local override file. The frontend graph pages read merged graph data so hover labels, detail notes, and style settings apply without modifying Notion.

This keeps the architecture small and reversible. It also avoids exposing the Notion token in browser code.

## Override Data Model

Store overrides by stable graph node id.

Example shape:

```json
{
  "nodes": {
    "project_example": {
      "hoverTag": "重点案例",
      "detailNote": "用于点击弹窗的补充说明。"
    },
    "space_example": {
      "hoverTag": "需要补图",
      "detailNote": "这里可以补充 Notion 字段之外的展示说明。"
    }
  },
  "theme": {
    "categories": {
      "项目": {
        "color": "#ff8fbd",
        "sizeScale": 1.05,
        "opacity": 1
      },
      "空间产品": {
        "color": "#8ea2ff",
        "sizeScale": 0.9,
        "opacity": 0.58
      }
    },
    "links": {
      "opacity": 0.28,
      "width": 0.34
    },
    "scene3d": {
      "backgroundColor": "#000106",
      "glowStrength": 1
    }
  }
}
```

Only fields present in the override file change display behavior. Missing fields fall back to the generated Notion graph data and existing frontend defaults.

## Admin UI

The first version should be a simple local page focused on editing display overrides.

Primary areas:

- Node browser: searchable list of graph nodes with category filters.
- Node editor: selected node name, category, current Notion-derived description, hover tag input, and detail note textarea.
- Theme editor: category colors, size scale, opacity, link opacity, and a small set of 3D scene controls.
- Preview controls: open or refresh the existing 2D or 3D graph pages using the merged data.

The UI should not provide Notion database editing in version one. If the maintainer wants to change core project data, images, or relations, they should edit Notion directly and regenerate the graph.

## Frontend Display Behavior

Hover tooltip:

- Always show the node label from generated graph data.
- Show the override `hoverTag` under the label when present.
- Keep category display available, but make it secondary.

Detail panel:

- Continue showing generated metadata, existing hosted images, description, and relations.
- Add the override `detailNote` as a supplemental section when present.
- Escape all user-authored text before rendering.

Theme:

- Category color overrides replace generated category colors at render time.
- Size and opacity overrides apply as multipliers or explicit display values.
- Link and 3D scene settings should be constrained to a small set of safe numeric/color fields.

## Local Save Strategy

The first version should save to a local JSON file, not to Notion.

Preferred files:

- `admin/display-overrides.json` for maintainer-authored overrides.
- `generated/notion-graph.json` for generated Notion graph data.
- `generated/notion-graph-merged.json` if a merge step is easier to test and serve.

The implementation plan should choose between runtime merge and generated merged file based on what keeps the frontend simplest.

## Future Notion Sync

A later phase can add a small local API:

```text
Admin page -> local API -> Notion API
```

That API can support explicit actions such as:

- Pull latest Notion graph data.
- Push selected supplemental fields to mapped Notion properties.
- Compare local overrides with Notion properties before writing.

Browser code must not call the Notion API directly because it would expose the Notion token.

## Error Handling

- If the override file is missing, use empty overrides.
- If the override file is invalid JSON, show a clear admin error and do not overwrite it.
- If a node id in overrides no longer exists in generated graph data, keep the override but mark it as orphaned in the admin.
- If a color or numeric style value is invalid, ignore that field and keep the default.

## Testing

Focused tests should cover:

- Merging Notion graph data with node overrides.
- Missing override file behavior.
- Invalid style value fallback.
- Hover tooltip rendering with and without `hoverTag`.
- Detail panel rendering with and without `detailNote`.
- Existing 2D and 3D static frontend checks after the merge path is introduced.

## Success Criteria

- A maintainer can add hover text and detail-panel notes without editing Notion.
- Existing Notion-generated data remains the source of truth for core graph content.
- Existing graph pages still load when overrides are absent.
- Notion credentials are never exposed in frontend files.
- The design leaves a clear path to future Notion write-back without requiring it in version one.
