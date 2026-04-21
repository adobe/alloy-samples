import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { ExperienceEdgeClient } from "experience-edge-client";
import { configDotenv } from "dotenv";
import { initLogger } from "evlog";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createMcpServer } from "./server.js";

configDotenv({ path: ["../.env", "./.env"], quiet: true });

initLogger({
  env: { service: "chatgpt-app-backend" },
  redact: true,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, "..");
const ASSETS_DIR = resolve(ROOT_DIR, "frontend", "dist");

/** @type {Hono<import("evlog/hono").EvlogVariables>} */
const app = new Hono();

app.use(evlog());

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
  TIMEOUT: z.coerce.number().pipe(ExperienceEdgeClient.InstanceConfigSchema.shape.timeout),
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
 * @returns {{ html: string, uri: string }}
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

app.use(async (c, next) => {
  c.get("log").set({
    request: {
      userAgent: c.req.header("user-agent"),
    },
  });
  await next();
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
  const log = c.get("log");

  if (c.req.method === "POST") {
    try {
      const body = await c.req.raw.clone().json();
      log.set({
        mcp: {
          jsonrpcId: body?.id,
          method: body?.method,
          toolName: body?.params?.name,
          resourceUri: body?.params?.uri,
        },
      });
    } catch {
      log.set({ mcp: { parseError: true } });
    }
  }

  const transport = new StreamableHTTPTransport();
  const server = createMcpServer(mcpServerOptions);
  await server.connect(transport);
  return transport.handleRequest(c);
});

const server = serve(app, (addressInfo) => {
  const address = `http://${
    addressInfo.address === "::" ? "[::1]" : addressInfo.address
  }:${addressInfo.port}`;
  console.log("[adobe-office-backend] listening on", address);
});

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      process.exit(1);
    }
    process.exit(0);
  });
});

export default app;
