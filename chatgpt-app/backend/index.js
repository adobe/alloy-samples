import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serve } from "@hono/node-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { logger } from "hono/logger";

import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

const mcpServer = new McpServer({
  name: "alloy-vacations",
  version: "1.0.0",
});

// Load locally built frontend assets
const FRONTEND_DIST = join(__dirname, "..", "frontend", "dist");
const loadViewAssets = (viewName) => {
  const js = (() => {
    try {
      return readFileSync(join(FRONTEND_DIST, `${viewName}.js`), "utf8");
    } catch (err) {
      console.error(`Failed to load ${viewName} JS:`, err.message);
      return "";
    }
  })();
  const css = (() => {
    try {
      return readFileSync(join(FRONTEND_DIST, `${viewName}.css`), "utf8");
    } catch {
      return ""; // CSS optional
    }
  })();
  return { js, css };
};

const hotelListAssets = loadViewAssets("hotel-list");

// Register UI resource for hotel-list view
mcpServer.registerResource(
  "hotel-list",
  "ui://widget/hotel-list.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/hotel-list.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="root"></div>
${hotelListAssets.css ? `<style>${hotelListAssets.css}</style>` : ""}
<script type="module">${hotelListAssets.js}</script>
        `.trim(),
        _meta: {
          "openai/widgetPrefersBorder": true,
          "openai/widgetDomain": "https://chatgpt.com",
          "openai/widgetCSP": {
            connect_domains: ["https://chatgpt.com"],
            resource_domains: ["https://*.oaistatic.com"],
          },
        },
      },
    ],
  })
);

const LOG_PREFIX = "[alloy-vacations-backend] ";
const log = (...args) => console.log(LOG_PREFIX, ...args);
app.use(logger(log));

app.get("/", (c) => {
  return c.text("Hello, World!");
});

app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

const server = serve(app, (addressInfo) => {
  const address = `http://${
    addressInfo.address === "::" ? "[::1]" : addressInfo.address
  }:${addressInfo.port}`;
  log("[alloy-vacations-backend] listening on", address);
});
log("[alloy-vacations-backend] valid endpoints are:");
for (const route of app.routes) {
  log(`  - [${route.method}] ${route.path}`);
}

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

export default app;
