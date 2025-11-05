import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serve } from "@hono/node-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { logger } from "hono/logger";

import process from "node:process";

const app = new Hono();

const mcpServer = new McpServer({
  name: "alloy-vacations",
  version: "1.0.0",
});

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
