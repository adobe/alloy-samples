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

const officeListAssets = loadViewAssets("office-list");
const officeDetailsAssets = loadViewAssets("office-details");

mcpServer.registerResource(
  "office-list",
  "ui://widget/office-list.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/office-list.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="root"></div>
${officeListAssets.css ? `<style>${officeListAssets.css}</style>` : ""}
<script type="module">${officeListAssets.js}</script>
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

mcpServer.registerResource(
  "office-details",
  "ui://widget/office-details.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/office-details.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="root"></div>
${officeDetailsAssets.css ? `<style>${officeDetailsAssets.css}</style>` : ""}
<script type="module">${officeDetailsAssets.js}</script>
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

mcpServer.registerTool(
  "office-list",
  {
    title: "Show Office List",
    description: "Show the list of available offices",
    _meta: {
      "openai/outputTemplate": "ui://widget/office-list.html",
      "openai/toolInvocation/invoking": "Loading office list",
      "openai/toolInvocation/invoked": "Displayed office list",
    },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  async () => {
    return {
      content: [{ type: "text", text: "Displayed the office list!" }],
      structuredContent: {},
    };
  }
);

mcpServer.registerTool(
  "office-details",
  {
    title: "Show Office Details",
    description: "Show details for a specific office",
    _meta: {
      "openai/outputTemplate": "ui://widget/office-details.html",
      "openai/toolInvocation/invoking": "Loading office details",
      "openai/toolInvocation/invoked": "Displayed office details",
    },
    inputSchema: {
      type: "object",
      properties: {
        officeId: {
          type: "string",
          description: "The ID of the office to show details for",
        },
      },
      required: ["officeId"],
    },
  },
  async ({ officeId }) => {
    return {
      content: [
        { type: "text", text: `Displayed details for office ${officeId}` },
      ],
      structuredContent: {},
    };
  }
);

mcpServer.registerTool(
  "send-email",
  {
    title: "Send Office Visit Interest Email",
    description: "Send an email expressing interest in visiting an office",
    _meta: {
      "openai/toolInvocation/invoking": "Sending email",
      "openai/toolInvocation/invoked": "Email sent successfully",
    },
    inputSchema: {
      type: "object",
      properties: {
        officeId: {
          type: "string",
          description:
            "The ID of the office the user is interested in visiting",
        },
        officeName: {
          type: "string",
          description:
            "The name of the office the user is interested in visiting",
        },
      },
      required: ["officeId", "officeName"],
    },
  },
  async ({ officeId, officeName }) => {
    const emailMessage = `Hi, I am interested in visiting the ${officeName} office.`;
    console.log(
      `[send-email] Would send email for office ${officeId}: "${emailMessage}"`
    );
    return {
      content: [
        {
          type: "text",
          text: `Email sent! Message: "${emailMessage}"`,
        },
      ],
    };
  }
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
  log("listening on", address);
});
log("valid endpoints are:");
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
