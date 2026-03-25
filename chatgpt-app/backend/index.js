import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { ExperienceEdgeClient } from "experience-edge-client";
import { configDotenv } from "dotenv";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createMcpServer } from "./server.js";

configDotenv({ path: ["../.env", "./.env"], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, "..");
const ASSETS_DIR = resolve(ROOT_DIR, "frontend", "dist");

const app = new Hono();

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
  IMS_HOST: ExperienceEdgeClient.InstanceConfigSchema.shape.imsHost,
  ORG_ID: ExperienceEdgeClient.InstanceConfigSchema.shape.orgId,
  CLIENT_ID: ExperienceEdgeClient.InstanceConfigSchema.shape.clientId,
  CLIENT_SECRET: ExperienceEdgeClient.InstanceConfigSchema.shape.clientSecret,
  ACCESS_SCOPES: ExperienceEdgeClient.InstanceConfigSchema.shape.accessScopes,
  DATASTREAM_ID: ExperienceEdgeClient.InstanceConfigSchema.shape.datastreamId,
  AEP_EDGE_DOMAIN: ExperienceEdgeClient.InstanceConfigSchema.shape.edgeDomain,
  TIMEOUT: z.coerce
    .number()
    .pipe(ExperienceEdgeClient.InstanceConfigSchema.shape.timeout),
});
const env = EnvSchema.parse(process.env);
const edgeClient = new ExperienceEdgeClient({
  edgeDomain: env.AEP_EDGE_DOMAIN,
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

const mcpServerOptions = { edgeClient, resourceAssets };

const LOG_PREFIX = "[adobe-office-backend] ";
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
    } catch {
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
    String.raw`<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 501.71 444.05"><defs><style>.cls-1 {fill: #eb1000;stroke-width: 0px;}</style></defs><g id="Layer_1-2" data-name="Layer 1"><polygon class="cls-1" points="297.58 444.05 261.13 342.65 169.67 342.65 246.54 149.12 363.19 444.05 501.71 444.05 316.80 0 186.23 0 0 444.05 297.58 444.05 297.58 444.05"/></g></svg>`,
  );
});

app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPTransport();
  const server = createMcpServer(mcpServerOptions);
  await server.connect(transport);
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
