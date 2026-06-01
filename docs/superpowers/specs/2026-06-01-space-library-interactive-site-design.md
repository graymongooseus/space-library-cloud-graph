# SPACE LIBRARY Interactive Site Design

Date: 2026-06-01
Project root: `H:\My Drive\Cloud diagram`

## Goal

Upgrade the current static D3 point-cloud page into a lightweight interactive website with:

- A public front-end graph for exploring SPACE LIBRARY keywords, projects, schools, spaces, and images.
- A private admin console for one owner to sync data, manage images, preview relationships, and publish graph data.
- Notion as the long-term source of truth, with local SQLite/cache data for speed and reliability.
- An embed-friendly front-end route that can be used inside an iframe on a personal homepage.

The owner does not write code during normal maintenance.

## Current State

The project is currently a static folder, not a git repository.

Important files:

- `space-library-cloud.html`: existing D3 force graph with inline data, search, category filter, hover highlight, click detail panel, and image lightbox.
- `space-library-graph.json`: separate graph data snapshot.
- `data downloaded\7 SPACE LIBRARY 空间产品库_all.csv`: Notion-exported CSV with rich fields.
- `images\`: local image assets already used by the current graph.

The current front-end style should remain recognizable: white background, colored node categories, light graph controls, and floating detail UI.

## Recommended Architecture

Use a Node.js app with SQLite and a static front-end.

```text
Notion database
  -> Node.js sync service using Notion API
  -> SQLite local cache
  -> cached images and generated graph.json
  -> D3 front-end / iframe embed route
```

Notion API is the primary sync mechanism. Webhooks are optional for a later phase. Notion MCP is not used for the production website backend because it is better suited to AI/tool workflows than deployed site data syncing.

## Data Sync Strategy

Phase 1 starts from the local CSV so the data mapping can be verified before adding Notion credentials.

Phase 2 adds Notion API sync:

- Store `NOTION_TOKEN` and database/data source ID in server environment variables.
- Fetch SPACE LIBRARY database rows through the Notion API.
- Normalize Notion properties into local SQLite tables.
- Download Notion images into local server storage when possible.
- Generate a stable front-end `graph.json`.

Phase 3 may add Notion webhooks:

- Webhook receives "data changed" events from Notion.
- Server verifies the webhook request.
- Server calls Notion API to fetch latest changed page/database data.
- Admin console shows latest sync status.

Manual "Sync Notion" remains available even if webhooks are added.

## Local Data Model

Use SQLite tables with simple ownership and maintenance:

- `spaces`: one row per space product.
- `entities`: normalized nodes such as school types, room types, activity keywords, projects, styles, materials, costs, and designers.
- `relationships`: links between spaces and entities, plus optional manual links.
- `images`: cached image records linked to spaces or projects.
- `sync_runs`: status, counts, errors, and timestamps for CSV/Notion sync jobs.
- `settings`: admin configuration that should not be hard-coded into front-end files.

The graph generator converts these tables into:

- `public/data/graph.json`
- `public/uploads/...` image paths

## Graph Mapping Rules

Create nodes from these source fields:

- Space node: `空间名称`
- School type nodes: `学校类型`
- Room type nodes: `房间类型`
- Activity keyword nodes: `活动内容`
- Project nodes: `相关项目`
- Cost nodes: `单方造价`
- Material nodes: `地面材料`, `天花材料`, selected related materials where useful
- Style nodes: `设计风格`
- Equipment nodes: `配套设备`
- Designer nodes: `设计师`

Create links such as:

- Space -> School Type
- Space -> Room Type
- Space -> Activity
- Space -> Project
- Space -> Cost
- Space -> Material
- Space -> Style
- Space -> Equipment
- Space -> Designer

Project and school/project-like names should be graph nodes, but they can be smaller and filterable so the front-end does not feel crowded.

Every Notion SPACE LIBRARY row should become its own independent `Space` / `空间产品` node. Do not merge rows that share the same project and room type. Room type nodes such as `走廊楼梯 HALLWAY` and `餐厅 CANTEEN` act as aggregation entry points: every space whose Notion `房间类型` matches that category links to the corresponding room type node. This lets a user click `餐厅 CANTEEN` to see all canteen cases and their thumbnails, or click a project node to see all spaces in that project.

The Notion `房间类型` values may use English or mixed labels such as `REGULAR CLASSROOM`, `RESTROOM / TOILET`, or `COMMON`. The graph generator should normalize these raw values into stable bilingual display labels where possible, for example:

- `CANTEEN` -> `餐厅 CANTEEN`
- `HALLWAY` -> `走廊楼梯 HALLWAY`
- `REGULAR CLASSROOM` -> `普通教室 CLASSROOM`
- `RESTROOM / TOILET` -> `卫生间 RESTROOM`
- `COMMON` -> `公共空间 COMMON`

## Front-End Experience

Keep the current visual direction and improve interaction quality.

Main route:

- Shows the D3 force graph.
- Loads graph data from external JSON instead of inline data.
- Keeps search, zoom, reset, category legend, hover highlight, click detail, and lightbox.
- Adds richer detail panels based on node type.

Embed route:

- Same graph experience, optimized for iframe.
- Hides admin entry points and extra page chrome.
- Uses responsive height and compact controls.

Node click behavior:

- Space node: floating detail panel with image gallery, space metadata, project, school type, room type, activity keywords, materials, cost, style, equipment, and linked nodes.
- Project node: related spaces, image thumbnails, and available project links.
- School/school type node: related spaces and thumbnails.
- Keyword node: associated spaces/projects, thumbnails, and graph highlight of related nodes.

Search behavior:

- Search by Chinese, English, category, project, and tags.
- Matching nodes should be highlighted and easy to navigate.

## Admin Experience

The admin console is intentionally small and owner-focused.

Pages:

- Login
- Dashboard
- Data preview
- Image status
- Relationship preview
- Settings

Primary actions:

- Sync from CSV
- Sync from Notion
- Sync/cache images
- Generate graph JSON
- Preview front-end

The admin should show human-readable status:

- Last sync time
- Number of rows imported
- Number of graph nodes and links generated
- Missing images
- Sync errors that need attention

No multi-user permissions are needed in the first version.

## Deployment

Target deployment is aaPanel with Node.js support.

Recommended process:

- Run Node.js app behind aaPanel reverse proxy.
- Store uploads and generated graph data on the server filesystem.
- Configure environment variables in aaPanel or a server-side `.env` file.
- Public pages expose only front-end routes and generated assets.
- Admin routes require login.

The front-end iframe URL should be stable, for example:

- `https://your-domain.com/embed`

## Security

- Never expose Notion token to the browser.
- Keep Notion token on the server only.
- Use an admin password for the private console.
- Use environment variables for secrets.
- Validate uploaded image files.
- Keep generated `graph.json` public, but keep raw sync logs and settings private.

## Implementation Phases

1. Externalize graph data.
   - Move front-end data loading to `graph.json`.
   - Keep current visual style.
   - Verify current graph still renders.
   - Implementation note: the front-end now loads `space-library-graph.json` with `fetch()`, so later admin tooling can regenerate that file without editing HTML.

2. Build richer front-end panels.
   - Add node-type-specific floating panels.
   - Add project/school/keyword panels with thumbnails.
   - Add embed route styling.

3. Build Node.js + SQLite admin.
   - Add login.
   - Add CSV import from the existing Notion export.
   - Add graph JSON generation.
   - Add preview and sync status.

4. Add Notion API sync.
   - Read Notion database rows.
   - Map properties to the same normalized model as CSV.
   - Cache images locally.
   - Keep manual sync button.

5. Optional: Add Notion webhooks.
   - Use webhook as a change signal.
   - Fetch latest data with Notion API.
   - Keep manual sync as fallback.

## Success Criteria

- Owner can maintain data in Notion and update the website without editing code.
- Front-end can be embedded via iframe.
- Front-end keeps the existing point-cloud style while showing richer project, school, keyword, and image details.
- Admin can import/sync data, cache images, generate graph JSON, and preview the result.
- Notion API credentials are never exposed in front-end code.
