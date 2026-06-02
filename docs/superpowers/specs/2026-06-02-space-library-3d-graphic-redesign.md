# SPACE LIBRARY 3D Graphic Redesign

Date: 2026-06-02
Branch: frontend-3d-cloud-preview

## Goal

Create a new 3D front-end preview for SPACE LIBRARY that references the visual language of the `3d-force-graph` large graph demo: black background, floating nodes, subtle relationship lines, and drag-to-rotate exploration.

The first implementation should be a separate preview page, not a replacement for the existing 2D page.

## Reference

- Visual reference: https://vasturiano.github.io/3d-force-graph/example/large-graph/
- Library reference: https://github.com/vasturiano/3d-force-graph

The project will borrow the spatial feeling, dark canvas, glowing nodes, and dense graph movement from the reference. It will not copy the demo data or reduce the product to a generic graph demo.

## Scope

In scope:

- Add a new `space-library-cloud-3d.html` preview page.
- Use the same graph JSON shape as the current front-end: `nodes` and `links`.
- Support the current `?data=` URL parameter.
- Keep the existing filter concept: activity, room type, and school type.
- Keep the apply-and-lock behavior: filters only change the graph after clicking confirm, and reset only after clicking clear.
- Show a floating detail panel when clicking projects, space products, or category keywords.
- Use existing node metadata and images from the graph JSON.

Out of scope for this step:

- Replacing the existing `space-library-cloud.html`.
- Building the admin backend.
- Changing Notion API sync logic.
- Changing the generated graph schema unless a small compatibility field is required.
- Adding user accounts or content editing.

## Visual Design

The 3D page should feel like a dark spatial knowledge map.

Canvas:

- Full-screen black or near-black background.
- The graph fills the viewport.
- No framed card around the 3D scene.
- The UI floats above the scene.

Nodes:

- Project nodes are the largest and most solid.
- Project size scales by number of connected space products.
- Space product nodes are smaller and semi-transparent.
- Room type, activity, and school type nodes are medium-sized category anchors.
- Colors stay consistent with the existing categories, adjusted for dark mode readability.

Links:

- Thin, semi-transparent lines.
- Link opacity should be low enough that dense clusters remain readable.
- Highlight connected links on hover or click if this is simple to implement.

Labels:

- Avoid always showing all labels, because 3D labels can become noisy.
- Show node label on hover.
- Show selected node title in the detail panel.
- Important selected or focused nodes may show stronger visual emphasis.

Controls:

- Top control bar becomes dark glass: black translucent background, light text, subtle border.
- Search and filters stay compact.
- Confirm and clear remain explicit actions.
- Add a small status count, such as visible nodes and visible links, if it fits without clutter.

## Interaction Design

Default view:

- Load all graph nodes and links.
- Start with a slow stable 3D force layout.
- Allow mouse drag to rotate, wheel to zoom, and pan through the built-in graph controls.

Filtering:

- Selecting a filter does not immediately change the graph.
- Clicking confirm filters to the selected category node and its connected subgraph.
- Clicking clear returns to the full graph.
- Search can highlight or focus matching nodes without destroying the locked filter state.

Click behavior:

- Clicking a project node opens a floating panel with project title, category, project metadata, related space products, and images.
- Clicking a space product node opens available images and relations.
- Clicking an activity, room type, or school type node opens connected projects and space product thumbnails.

Camera behavior:

- Clicking a node should gently move the camera toward it if this is stable.
- The selected node should remain visually emphasized.
- The user must still be able to rotate and zoom after selection.

## Data Flow

The 3D page loads data in the same way as the current 2D page:

1. Read `data` from the query string.
2. Default to `space-library-graph.json` if no query parameter exists.
3. Fetch graph JSON.
4. Normalize links so `source` and `target` can work whether they are IDs or node objects.
5. Build adjacency maps for filtering, detail panels, and node sizing.
6. Pass the visible graph subset into `3d-force-graph`.

The page should work with:

- `space-library-cloud-3d.html`
- `space-library-cloud-3d.html?data=generated/notion-graph.json`

## Implementation Approach

Use `3d-force-graph` from a CDN for the first preview, matching the current project style where D3 is already loaded from a CDN.

This keeps the project lightweight:

- No Node build step.
- No framework migration.
- Easy to upload to aaPanel as static files.
- Easy to embed with iframe later.

If future deployment needs offline/vendor-stable assets, the CDN scripts can be downloaded into a local `vendor/` folder in a later step.

## Testing And Verification

Static checks:

- Add or update a frontend static test so the new page includes required controls and loads `3d-force-graph`.
- Verify the page still supports `?data=`.

Manual browser checks:

- Open `http://localhost:8080/space-library-cloud-3d.html`.
- Open `http://localhost:8080/space-library-cloud-3d.html?data=generated/notion-graph.json` if generated data exists.
- Confirm the canvas is nonblank.
- Confirm the scene is full-screen and black.
- Confirm drag rotate and wheel zoom work.
- Confirm filters apply only after confirm.
- Confirm clear resets the graph.
- Confirm clicking nodes opens the detail panel with images where available.

## Success Criteria

- The 3D page visually resembles the selected large graph reference: black background, floating 3D nodes, subtle links.
- The current 2D page remains untouched and usable.
- Existing graph JSON files can be loaded without schema rewrite.
- Project nodes are visually more important than space product nodes.
- The first 3D preview is simple enough for future maintenance and aaPanel static deployment.
