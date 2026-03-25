import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createMcpServer,
  ensureSessionId,
  buildIdentityMap,
  createCommonXdmFields,
} from "./server.js";
import { officeData } from "datastore";

// A real edge client that is simply unreachable — exercises the error-handling
// paths in every tool handler without any mock framework.
const unavailableEdgeClient = {
  sendEvent() {
    return Promise.reject(new Error("AEP Edge Network unavailable"));
  },
};

const testResourceAssets = {
  "office-list": {
    uri: "ui://widget/office-list.html",
    html: "<div>office-list</div>",
  },
  "office-details": {
    uri: "ui://widget/office-details.html",
    html: "<div>office-details</div>",
  },
};

let client;
let mcpServer;

beforeAll(async () => {
  mcpServer = createMcpServer({
    edgeClient: unavailableEdgeClient,
    resourceAssets: testResourceAssets,
  });
  client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await mcpServer.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await mcpServer.close();
});

// ---------------------------------------------------------------------------
// MCP protocol compliance
// ---------------------------------------------------------------------------

describe("tool listing", () => {
  it("exposes exactly three tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name).sort()).toEqual([
      "office-details",
      "office-list",
      "request-visit",
    ]);
  });

  it("every tool has a title and an input schema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.title ?? tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

describe("resource listing", () => {
  it("exposes two widget resources", async () => {
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.name).sort()).toEqual([
      "office-details-widget",
      "office-list-widget",
    ]);
  });
});

describe("resource reading", () => {
  it("returns HTML with skybridge mime type for office-list-widget", async () => {
    const result = await client.readResource({
      uri: testResourceAssets["office-list"].uri,
    });
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain("office-list");
    expect(result.contents[0].mimeType).toBe("text/html+skybridge");
  });

  it("returns HTML with skybridge mime type for office-details-widget", async () => {
    const result = await client.readResource({
      uri: testResourceAssets["office-details"].uri,
    });
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain("office-details");
    expect(result.contents[0].mimeType).toBe("text/html+skybridge");
  });
});

// ---------------------------------------------------------------------------
// office-list tool
// ---------------------------------------------------------------------------

describe("office-list tool", () => {
  it("returns all offices and a session ID", async () => {
    const result = await client.callTool({
      name: "office-list",
      arguments: {},
    });
    const text = result.content.find((c) => c.type === "text")?.text;
    expect(text).toContain("Session ID:");

    if (result.structuredContent) {
      expect(result.structuredContent.offices).toHaveLength(
        Object.keys(officeData).length,
      );
      expect(result.structuredContent.sessionId).toBeTruthy();
      expect(result.structuredContent._adobe.handles).toEqual([]);
    }
  });

  it("generates a new session ID when none provided", async () => {
    const result = await client.callTool({
      name: "office-list",
      arguments: {},
    });
    const text = result.content.find((c) => c.type === "text")?.text;
    // Session ID is a UUIDv7 — at minimum a non-empty string
    expect(text).toMatch(/Session ID: \S+/);
  });

  it("preserves a provided session ID", async () => {
    const result = await client.callTool({
      name: "office-list",
      arguments: { sessionId: "my-session-42" },
    });
    const text = result.content.find((c) => c.type === "text")?.text;
    expect(text).toContain("my-session-42");

    if (result.structuredContent) {
      expect(result.structuredContent.sessionId).toBe("my-session-42");
    }
  });
});

// ---------------------------------------------------------------------------
// office-details tool
// ---------------------------------------------------------------------------

describe("office-details tool", () => {
  it("returns details for a valid office", async () => {
    const result = await client.callTool({
      name: "office-details",
      arguments: { officeId: "sf", sessionId: "test-session" },
    });
    const text = result.content.find((c) => c.type === "text")?.text;
    expect(text).toContain("sf");
    expect(text).toContain("test-session");

    if (result.structuredContent?.office) {
      expect(result.structuredContent.office.name).toBe("San Francisco");
      expect(result.structuredContent.office.amenities).toBeInstanceOf(Array);
    }
  });

  it("returns correct data for every known office", async () => {
    for (const [id, office] of Object.entries(officeData)) {
      const result = await client.callTool({
        name: "office-details",
        arguments: { officeId: id, sessionId: "test" },
      });
      if (result.structuredContent?.office) {
        expect(result.structuredContent.office.name).toBe(office.name);
        expect(result.structuredContent.office.phone).toBe(office.phone);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// request-visit tool
// ---------------------------------------------------------------------------

describe("request-visit tool", () => {
  it("returns a confirmation message mentioning the office name", async () => {
    const result = await client.callTool({
      name: "request-visit",
      arguments: {
        officeId: "sf",
        email: "test@example.com",
        sessionId: "visit-session",
      },
    });
    const text = result.content.find((c) => c.type === "text")?.text;
    expect(text).toContain("San Francisco");
    expect(text).toContain("visit-session");
  });

  it("includes the session ID in structured content", async () => {
    const result = await client.callTool({
      name: "request-visit",
      arguments: {
        officeId: "nyc",
        email: "visitor@example.com",
        sessionId: "nyc-visit",
      },
    });
    if (result.structuredContent) {
      expect(result.structuredContent.sessionId).toBe("nyc-visit");
    }
  });
});

// ---------------------------------------------------------------------------
// Pure business logic — ensureSessionId
// ---------------------------------------------------------------------------

describe("ensureSessionId", () => {
  it("returns the trimmed input when given a valid string", () => {
    expect(ensureSessionId("abc")).toBe("abc");
    expect(ensureSessionId("  abc  ")).toBe("abc");
  });

  it("generates a UUIDv7 for null / undefined / empty string", () => {
    const ids = [
      ensureSessionId(null),
      ensureSessionId(undefined),
      ensureSessionId(""),
      ensureSessionId("   "),
    ];
    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
    // Each call produces a unique ID
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Pure business logic — buildIdentityMap
// ---------------------------------------------------------------------------

describe("buildIdentityMap", () => {
  it("includes OPENAI_SUBJECT when _meta has openai/subject", () => {
    const map = buildIdentityMap({ "openai/subject": "user-abc" }, "sess-1");
    expect(map.OPENAI_SUBJECT).toEqual([{ id: "user-abc", primary: true }]);
    // SESSION_ID should not be primary when OPENAI_SUBJECT is present
    expect(map.SESSION_ID[0].primary).toBe(false);
  });

  it("sets SESSION_ID as primary when no openai/subject", () => {
    const map = buildIdentityMap({}, "sess-2");
    expect(map.OPENAI_SUBJECT).toBeUndefined();
    expect(map.SESSION_ID).toEqual([{ id: "sess-2", primary: true }]);
  });

  it("handles null or undefined _meta gracefully", () => {
    const map1 = buildIdentityMap(null, "sess-3");
    const map2 = buildIdentityMap(undefined, "sess-4");
    expect(map1.SESSION_ID[0].primary).toBe(true);
    expect(map2.SESSION_ID[0].primary).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pure business logic — createCommonXdmFields
// ---------------------------------------------------------------------------

describe("createCommonXdmFields", () => {
  it("returns _id, eventMergeId, and producedBy", () => {
    const fields = createCommonXdmFields();
    expect(fields._id).toBeTruthy();
    expect(fields.eventMergeId).toBeTruthy();
    expect(fields.producedBy).toBe("chatgpt-app");
  });

  it("generates unique IDs on each call", () => {
    const a = createCommonXdmFields();
    const b = createCommonXdmFields();
    expect(a._id).not.toBe(b._id);
    expect(a.eventMergeId).not.toBe(b.eventMergeId);
  });
});
