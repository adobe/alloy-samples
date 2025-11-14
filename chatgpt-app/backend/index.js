import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AlloyServerInstance } from "alloy-server-sdk";
import { OfficeIdSchema, officeData } from "datastore";
import { configDotenv } from "dotenv";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

configDotenv({ path: ["../.env", "./.env"], quiet: true });

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
  return readFileSync(join(ASSETS_DIR, name), "utf8");
};

const EnvSchema = z.object({
  IMS_HOST: AlloyServerInstance.InstanceConfigSchema.shape.imsHost,
  ORG_ID: AlloyServerInstance.InstanceConfigSchema.shape.orgId,
  CLIENT_ID: AlloyServerInstance.InstanceConfigSchema.shape.clientId,
  CLIENT_SECRET: AlloyServerInstance.InstanceConfigSchema.shape.clientSecret,
  ACCESS_SCOPES: AlloyServerInstance.InstanceConfigSchema.shape.accessScopes,
  DATASTREAM_ID: AlloyServerInstance.InstanceConfigSchema.shape.datastreamId,
  AEP_EDGE_DOMAIN: AlloyServerInstance.InstanceConfigSchema.shape.edgeDomain,
  AEP_EDGE_REGION: AlloyServerInstance.InstanceConfigSchema.shape.edgeRegion,
  TIMEOUT: z.coerce
    .number()
    .pipe(AlloyServerInstance.InstanceConfigSchema.shape.timeout),
});
const env = EnvSchema.parse(process.env);
const alloy = new AlloyServerInstance({
  edgeDomain: env.AEP_EDGE_DOMAIN,
  edgeRegion: env.AEP_EDGE_REGION,
  imsHost: env.IMS_HOST,
  clientId: env.CLIENT_ID,
  clientSecret: env.CLIENT_SECRET,
  accessScopes: env.ACCESS_SCOPES,
  timeout: env.TIMEOUT,
  datastreamId: env.DATASTREAM_ID,
  orgId: env.ORG_ID,
});

/**
 * @param {string} name
 * @returns { html: string, uri: string };
 */
const createResourceAssets = (name) => {
  const css = readAsset(`${name}.css`) || "";
  const js = readAsset(`${name}.js`) || "";
  const html = generateHtml({ css, js });
  const uri = `ui://widget/${name}.html`;
  return { uri, html };
};

const resourceAssets = Object.freeze({
  "office-list": createResourceAssets("office-list"),
  "office-details": createResourceAssets("office-details"),
});

mcpServer.registerResource(
  "office-list-widget",
  resourceAssets["office-list"].uri,
  {
    title: "Office List Widget",
    description: "Renders an interactive list of available Adobe offices",
  },
  async () => ({
    contents: [
      {
        uri: resourceAssets["office-list"].uri,
        text: resourceAssets["office-list"].html,
        mimeType: "text/html+skybridge",
        _meta: {
          "openai/widgetDescription":
            "Renders an interactive list of available Adobe offices with location details and photos.",
          "openai/widgetPrefersBorder": true,
          "openai/widgetDomain": "https://chatgpt.com",
          "openai/widgetCSP": {
            connect_domains: ["https://chatgpt.com"],
            resource_domains: [
              "https://*.oaistatic.com",
              "https://fastly.picsum.photos",
              "https://picsum.photos",
            ],
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
    inputSchema: {
      adobeMeta: alloy.RequestMetadataSchema,
    },
    _meta: {
      "openai/outputTemplate": resourceAssets["office-list"].uri,
      "openai/toolInvocation/invoking": "Listing offices",
      "openai/toolInvocation/invoked": "Listed offices",
    },
  },
  async ({ adobeMeta }, { _meta } = {}) => {
    const meta = alloy.extractMetadataFromRequest(adobeMeta, { _meta });

    try {
      const result = await alloy.collect({
        ecid: meta.ecid,
        fpid: meta.fpid,
        xdm: {
          eventType: "office.list.view",
          web: {
            webPageDetails: {
              name: "Office List",
            },
          },
        },
      });
      // Update ECID from response if Adobe generated one
      if (result.generatedEcid) {
        meta.ecid = result.generatedEcid;
      }
    } catch (error) {
      console.error("Failed to collect analytics:", error);
    }

    return {
      structuredContent: {
        offices: Object.values(officeData),
        adobeMeta: meta,
      },
      content: [{ type: "text", text: "Displayed the list of offices." }],
    };
  }
);

mcpServer.registerResource(
  "office-details-widget",
  resourceAssets["office-details"].uri,
  {
    title: "Office Details Widget",
    description: "Displays detailed information about a specific Adobe office",
  },
  async () => ({
    contents: [
      {
        uri: resourceAssets["office-details"].uri,
        text: resourceAssets["office-details"].html,
        mimeType: "text/html+skybridge",
        _meta: {
          "openai/widgetDescription":
            "Displays detailed information about a specific Adobe office including amenities, photos, and contact options.",
          "openai/widgetPrefersBorder": true,
          "openai/widgetDomain": "https://chatgpt.com",
          "openai/widgetCSP": {
            connect_domains: ["https://chatgpt.com"],
            resource_domains: [
              "https://*.oaistatic.com",
              "https://fastly.picsum.photos",
              "https://picsum.photos",
            ],
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
      adobeMeta: alloy.RequestMetadataSchema,
    },
    _meta: {
      "openai/outputTemplate": resourceAssets["office-details"].uri,
      "openai/toolInvocation/invoking": "Loading office details",
      "openai/toolInvocation/invoked": "Displayed office details",
    },
  },
  /** @param {object} params
   * @param {keyof typeof officeData} params.officeId
   */
  async ({ officeId, adobeMeta }, { _meta } = {}) => {
    const meta = alloy.extractMetadataFromRequest(adobeMeta, { _meta });
    try {
      if (!(officeId in officeData)) {
        throw new Error(`Office with ID ${officeId} not found`);
      }
    } catch (error) {
      console.error(error);
      return {
        structuredContent: {
          adobeMeta: meta,
        },
        content: [
          {
            type: "text",
            text: `Error displaying office details: ${error.message}`,
          },
        ],
      };
    }
    const office = officeData[officeId];

    try {
      const result = await alloy.collect({
        ecid: meta.ecid,
        fpid: meta.fpid,
        xdm: {
          eventType: "office.details.view",
          web: {
            webPageDetails: {
              name: `Office Details - ${office.name}`,
            },
          },
          _adobe: {
            office: {
              id: officeId,
              name: office.name,
              city: office.city,
              country: office.country,
            },
          },
        },
      });
      if (result.generatedEcid) {
        meta.ecid = result.generatedEcid;
      }
    } catch (error) {
      console.error("Failed to collect analytics:", error);
    }

    return {
      structuredContent: {
        office,
        adobeMeta: meta,
      },
      content: [
        { type: "text", text: `Displayed details for office ${officeId}` },
      ],
    };
  }
);

mcpServer.registerTool(
  "request-visit",
  {
    title: "Notify Adobe that you would like to visit an office.",
    inputSchema: {
      officeId: OfficeIdSchema,
      email: z.string().email().describe("The email address of the user"),
      adobeMeta: alloy.RequestMetadataSchema,
    },
    _meta: {
      "openai/toolInvocation/invoking": "Requesting visit",
      "openai/toolInvocation/invoked": "Visit requested.",
    },
  },
  async ({ officeId, adobeMeta }, { _meta } = {}) => {
    const meta = alloy.extractMetadataFromRequest(adobeMeta, { _meta });
    const office = officeData[officeId];
    const emailMessage = `Hi, I am interested in visiting the ${office.name} office.`;

    try {
      const result = await alloy.collect({
        ecid: meta.ecid,
        fpid: meta.fpid,
        xdm: {
          eventType: "office.visit.request",
          web: {
            webPageDetails: {
              name: `Request Visit - ${office.name}`,
            },
          },
          _adobe: {
            office: {
              id: officeId,
              name: office.name,
              city: office.city,
              country: office.country,
            },
          },
        },
      });
      // Update ECID from response if Adobe generated one
      if (result.generatedEcid) {
        meta.ecid = result.generatedEcid;
      }
    } catch (error) {
      console.error("Failed to collect analytics:", error);
    }

    return {
      structuredContent: {
        adobeMeta: meta,
      },
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
/**
 *
 * @param {string | number} status
 */
const colorStatus = (status) => {
  const s = typeof status === "string" ? Number.parseInt(status, 10) : status;
  switch (
    (status / 100) |
    0 // most significant digit
  ) {
    case 5: // red -- error
      return `\x1b[31m${s}\x1b[0m`;
    case 4: // yellow -- warning
      return `\x1b[33m${s}\x1b[0m`;
    case 3: // cyan -- redirect
      return `\x1b[36m${s}\x1b[0m`;
    case 2: // green -- success
      return `\x1b[32m${s}\x1b[0m`;
    default: // 1
      return `${s}`;
  }
};

app.use(async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;

  log(`[IN]  ${method} ${path}`);

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

  const start = Date.now();
  await next();
  const elapsed = Date.now() - start;
  log(`[OUT] ${method} ${path} ${colorStatus(c.res.status)} ${elapsed}ms`);
});

app.get("/", (c) => {
  return c.text("Hello, World!");
});

app.get("/favicon.ico", (c) => {
  c.header("Content-Type", "image/svg+xml");
  return c.text(
    String.raw`<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 501.71 444.05"><defs><style>.cls-1 {fill: #eb1000;stroke-width: 0px;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><polygon class="cls-1" points="297.58 444.05 261.13 342.65 169.67 342.65 246.54 149.12 363.19 444.05 501.71 444.05 316.8 0 186.23 0 0 444.05 297.58 444.05 297.58 444.05"/></g></svg>`
  );
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
