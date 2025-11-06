import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serve } from "@hono/node-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";

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
  capabilities: {
    resources: {},
    tools: {},
  },
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

console.log("[DEBUG] Registering resources and tools...");

mcpServer.registerResource(
  "office-list-widget",
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
          "openai/widgetDescription":
            "Renders an interactive list of available Adobe offices with location details and photos.",
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
  "office-details-widget",
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
          "openai/widgetDescription":
            "Displays detailed information about a specific Adobe office including amenities, photos, and contact options.",
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
    description: "Show the list of available offices",
    inputSchema: {},
    _meta: {
      "openai/outputTemplate": "ui://widget/office-list.html",
      "openai/toolInvocation/invoking": "Loading office list",
      "openai/toolInvocation/invoked": "Displayed office list",
    },
  },
  async () => {
    return {
      content: [{ type: "text", text: "Displayed the office list!" }],
    };
  }
);

mcpServer.registerTool(
  "office-details",
  {
    description: "Show details for a specific office",
    inputSchema: {
      officeId: z.string().describe("The ID of the office to show details for"),
    },
    _meta: {
      "openai/outputTemplate": "ui://widget/office-details.html",
      "openai/toolInvocation/invoking": "Loading office details",
      "openai/toolInvocation/invoked": "Displayed office details",
    },
  },
  async ({ officeId }) => {
    return {
      content: [
        { type: "text", text: `Displayed details for office ${officeId}` },
      ],
    };
  }
);

mcpServer.registerTool(
  "send-email",
  {
    description: "Send an email expressing interest in visiting an office",
    inputSchema: {
      officeId: z.string().describe("The ID of the office the user is interested in visiting"),
      officeName: z.string().describe("The name of the office the user is interested in visiting"),
    },
    _meta: {
      "openai/toolInvocation/invoking": "Sending email",
      "openai/toolInvocation/invoked": "Email sent successfully",
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
console.log("[DEBUG] send-email tool registered successfully");

const LOG_PREFIX = "[alloy-vacations-backend] ";
const log = (...args) => console.log(LOG_PREFIX, ...args);
app.use(logger(log));

// Add detailed request logging middleware
app.use(async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;

  log(`>>> ${method} ${path}`);

  // Log important headers
  const acceptHeader = c.req.header("accept");
  const contentType = c.req.header("content-type");
  const userAgent = c.req.header("user-agent");

  if (acceptHeader) log("    Accept:", acceptHeader);
  if (contentType) log("    Content-Type:", contentType);
  if (userAgent) log("    User-Agent:", userAgent);

  // Log body for POST/PUT/PATCH by cloning the request
  if (method !== "GET" && method !== "HEAD") {
    try {
      const cloned = c.req.raw.clone();
      const text = await cloned.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          log("    Body:", JSON.stringify(json, null, 2));
        } catch {
          log("    Body (text):", text.substring(0, 500));
        }
      }
    } catch (e) {
      log("    Body: (could not read)");
    }
  }

  await next();
});

app.get("/", (c) => {
  return c.text("Hello, World!");
});

// OAuth 2.0 Discovery Endpoints - return 404 to signal no OAuth support
// ChatGPT will then rely on tool-level securitySchemes (noauth)
app.get("/.well-known/oauth-protected-resource", (c) => {
  return c.notFound();
});

app.get("/.well-known/oauth-authorization-server", (c) => {
  return c.notFound();
});

app.get("/.well-known/openid-configuration", (c) => {
  return c.notFound();
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
