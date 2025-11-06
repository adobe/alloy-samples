import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serve } from "@hono/node-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { OfficeIdSchema, officeData } from "datastore";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";

import process from "node:process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, "..");
const ASSETS_DIR = resolve(ROOT_DIR, "frontend", "dist");

const app = new Hono();

const mcpServer = new McpServer({
  name: "adobe-office-information",
  version: "1.0.0",
});

/**
 *
 * @param {object} params
 * @param {string} params.js
 * @param {string} params.css
 * @returns {string}
 */
const generateHtml = ({ js, css }) =>
  [
    `<div id="root"></div>`,
    css && `<style>${css}</style>`,
    js && `<script type="module">${js}</script>`,
  ]
    .filter(Boolean)
    .join("");

/**
 * @param {string} name
 * @returns {string | null}
 */
const readAsset = (name) => {
  try {
    return readFileSync(join(ASSETS_DIR, name), "utf8");
  } catch (error) {
    return null;
  }
};

/** @typedef {object} Resource
 * @property {string} uri - The URI of the resource.
 * @property {() => Promise<string>} html
 */
const resources = Object.freeze({
  "office-list": {
    uri: "ui://widget/office-list.html",
    text: generateHtml({
      css: readAsset("office-list.css"),
      js: readAsset("office-list.js"),
    }),
  },
  "office-details": {
    uri: "ui://widget/office-detail.html",
    text: generateHtml({
      css: readAsset("office-detail.css"),
      js: readAsset("office-detail.js"),
    }),
  },
});

mcpServer.registerResource(
  "office-list-widget",
  resources["office-list"].uri,
  {},
  async () => ({
    contents: [
      {
        ...resources["office-list"],
        mimeType: "text/html+skybridge",
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

mcpServer.registerTool(
  "office-list",
  {
    title: "List offices",
    _meta: {
      "openai/outputTemplate": resources["office-list"].uri,
      "openai/toolInvocation/invoking": "Listing offices",
      "openai/toolInvocation/invoked": "Listed offices",
    },
  },
  async () => {
    return {
      content: [{ type: "text", text: "Displayed the list of offices." }],
      structuredContent: {
        offices: Object.values(officeData),
      },
    };
  }
);

mcpServer.registerResource(
  "office-details-widget",
  resources["office-details"].uri,
  {},
  async () => ({
    contents: [
      {
        ...resources["office-details"],
        mimeType: "text/html+skybridge",
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
  "office-details",
  {
    title: "Show details for a specific office",
    inputSchema: {
      officeId: OfficeIdSchema,
    },
    _meta: {
      "openai/outputTemplate": resources["office-details"].uri,
      "openai/toolInvocation/invoking": "Loading office details",
      "openai/toolInvocation/invoked": "Displayed office details",
    },
  },
  /** @param {object} params
   * @param {keyof typeof officeData} params.officeId
   */
  async ({ officeId }) => {
    try {
      if (!(officeId in officeData)) {
        throw new Error(`Office with ID ${officeId} not found`);
      }
    } catch (error) {
      console.error(error);
      return {
        content: [
          {
            type: "text",
            text: `Error displaying office details: ${error.message}`,
          },
        ],
      };
    }
    const office = officeData[officeId];

    return {
      content: [
        { type: "text", text: `Displayed details for office ${officeId}` },
      ],
      structuredContent: {
        office,
      },
    };
  }
);

mcpServer.registerTool(
  "request-visit",
  {
    title: "Notify Adobe that you would like to visit an office.",
    inputSchema: {
      officeId: OfficeIdSchema,
      officeName: z
        .string()
        .describe("The name of the office the user is interested in visiting"),
      email: z.string().email().describe("The email address of the user"),
    },
    _meta: {
      "openai/toolInvocation/invoking": "Requesting visit",
      "openai/toolInvocation/invoked": "Visit requested.",
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
