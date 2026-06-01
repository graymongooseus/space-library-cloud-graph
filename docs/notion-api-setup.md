# Notion API Setup

This project will use Notion as the main data source.

Do not paste your Notion token into chat. Keep it only in your local `.env` file and later in aaPanel environment variables.

## Step 1: Create a Notion Internal Connection

1. Open the Notion developer portal:
   `https://www.notion.so/profile/integrations`
2. Create a new internal connection.
3. Give it a clear name, for example:
   `SPACE LIBRARY Website Sync`
4. Enable read access. Write access is not needed for the first version.
5. Copy the installation access token.

## Step 2: Grant the Connection Access to the Database

The connection has no page/database access until you explicitly share content with it.

Use either method:

- In the developer portal, open the connection, go to Content access, and add the SPACE LIBRARY database/page.
- Or open the Notion database page, click the top-right menu, choose Connections, and add `SPACE LIBRARY Website Sync`.

If this step is skipped, API requests usually fail with 404 or access errors.

## Step 3: Create a Local `.env`

Copy `.env.example` to `.env`, then fill:

```env
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=4289a1d14f3e4f10b950105849e96ae8
NOTION_DATA_SOURCE_ID=
NOTION_VERSION=2026-03-11
```

Leave `NOTION_DATA_SOURCE_ID` empty for the first test. The test script will try to inspect the database/data source shape first.

## Step 4: Run the Connection Test

Run:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'scripts\notion-smoke-test.mjs'
```

Expected result:

- It confirms the token exists.
- It tries to retrieve the configured database ID.
- It prints any available data source IDs or a clear error message.

