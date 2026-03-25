import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OfficeIdSchema, officeData } from "datastore";
import { v7 as uuidv7, v4 as randomUUID } from "uuid";
import { z } from "zod";

export const SessionIdSchema = z
  .string()
  .trim()
  .nonempty({ message: "Session ID cannot be empty" })
  .max(256, { message: "Session ID must be 256 characters or fewer" })
  .describe("Session identifier issued by the office list tool.");

export const SessionIdOptionalSchema = SessionIdSchema.describe(
  "Reuse this value to continue a session; omit or null to start a new one.",
).nullish();

export const ensureSessionId = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  // UUIDv7 is used because it is randomly generated as well as sortable - it
  // contains the timestamp of creation inside.
  return uuidv7();
};

export const buildIdentityMap = (_meta, sessionId) => {
  const identityMap = {};
  // https://developers.openai.com/apps-sdk/reference#_meta-fields-the-client-provides
  // Apps SDK reference: `_meta["openai/subject"]` is "an anonymized user hint for rate limiting."
  if (_meta?.["openai/subject"]) {
    identityMap.OPENAI_SUBJECT = [
      {
        id: _meta["openai/subject"],
        primary: true,
      },
    ];
  }
  identityMap.SESSION_ID = [
    {
      id: sessionId || uuidv7(),
      primary: !("OPENAI_SUBJECT" in identityMap),
    },
  ];
  return identityMap;
};

export const createCommonXdmFields = () => ({
  _id: randomUUID(),
  eventMergeId: randomUUID(),
  producedBy: "chatgpt-app",
});

/**
 * Creates and configures the MCP server with all tools and resources.
 * @param {object} deps
 * @param {{ sendEvent: Function }} deps.edgeClient
 * @param {Record<string, { uri: string, html: string }>} deps.resourceAssets
 * @returns {McpServer}
 */
export function createMcpServer({ edgeClient, resourceAssets }) {
  const mcpServer = new McpServer({
    name: "adobe-office-information",
    version: "1.0.0",
  });

  registerAppResource(
    mcpServer,
    "office-list-widget",
    resourceAssets["office-list"].uri,
    {
      description:
        "Renders an interactive list of available Adobe offices with location details and photos.",
    },
    async () => ({
      contents: [
        {
          uri: resourceAssets["office-list"].uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: resourceAssets["office-list"].html,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: ["https://chatgpt.com"],
                resourceDomains: [
                  "https://*.oaistatic.com",
                  "https://fastly.picsum.photos",
                  "https://picsum.photos",
                ],
              },
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    mcpServer,
    "office-list",
    {
      title: "List offices",
      inputSchema: {
        sessionId: SessionIdOptionalSchema,
      },
      _meta: {
        ui: { resourceUri: resourceAssets["office-list"].uri },
      },
    },
    async ({ sessionId } = {}, { _meta } = {}) => {
      const activeSessionId = ensureSessionId(sessionId);
      const identityMap = buildIdentityMap(_meta, activeSessionId);

      try {
        const result = await edgeClient.sendEvent({
          identityMap,
          xdm: {
            ...createCommonXdmFields(),
            eventType: "office.list.view",
          },
          query: {
            personalization: {
              decisionScopes: ["__view__"],
            },
          },
        });
        const handles = result.response?.body?.handle || [];
        const relevantHandles = handles.filter(
          (handle) =>
            handle.type === "personalization:decisions" ||
            handle.type === "state:store",
        );
        return {
          structuredContent: {
            sessionId: activeSessionId,
            offices: Object.values(officeData),
            _adobe: {
              handles: relevantHandles,
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed the list of offices. Session ID: ${activeSessionId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        // Even if analytics/personalization fails, return the content
        return {
          structuredContent: {
            sessionId: activeSessionId,
            offices: Object.values(officeData),
            _adobe: {
              handles: [],
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed the list of offices. Session ID: ${activeSessionId}`,
            },
          ],
        };
      }
    },
  );

  registerAppResource(
    mcpServer,
    "office-details-widget",
    resourceAssets["office-details"].uri,
    {
      description:
        "Displays detailed information about a specific Adobe office including amenities, photos, and contact options.",
    },
    async () => ({
      contents: [
        {
          uri: resourceAssets["office-details"].uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: resourceAssets["office-details"].html,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: ["https://chatgpt.com"],
                resourceDomains: [
                  "https://*.oaistatic.com",
                  "https://fastly.picsum.photos",
                  "https://picsum.photos",
                ],
              },
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    mcpServer,
    "office-details",
    {
      title: "Show details for a specific office",
      inputSchema: {
        officeId: OfficeIdSchema,
        sessionId: SessionIdSchema,
      },
      _meta: {
        ui: { resourceUri: resourceAssets["office-details"].uri },
      },
    },
    /** @param {object} params
     * @param {keyof typeof officeData} params.officeId
     */
    async ({ officeId, sessionId } = {}, { _meta } = {}) => {
      const activeSessionId = ensureSessionId(sessionId);
      try {
        if (!(officeId in officeData)) {
          throw new Error(`Office with ID ${officeId} not found`);
        }
      } catch (error) {
        console.error(error);
        return {
          structuredContent: {
            sessionId: activeSessionId,
          },
          content: [
            {
              type: "text",
              text: `Error displaying office details: ${error.message}. Session ID: ${activeSessionId}`,
            },
          ],
        };
      }
      const office = officeData[officeId];
      const identityMap = buildIdentityMap(_meta, activeSessionId);

      try {
        const result = await edgeClient.sendEvent({
          identityMap,
          xdm: {
            ...createCommonXdmFields(),
            eventType: "office.details.view",
            details: {
              _unifiedJsLab: {
                details: {
                  officeId: officeId,
                },
              },
            },
            query: {
              personalization: {
                decisionScopes: ["__view__"],
              },
            },
          },
        });
        const handles = result.response?.body?.handle || [];
        const relevantHandles = handles.filter(
          (handle) =>
            handle.type === "personalization:decisions" ||
            handle.type === "state:store",
        );
        return {
          structuredContent: {
            sessionId: activeSessionId,
            office,
            _adobe: {
              handles: relevantHandles,
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed details for office ${officeId}. Session ID: ${activeSessionId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        return {
          structuredContent: {
            sessionId: activeSessionId,
            office,
            _adobe: {
              handles: [],
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed details for office ${officeId}. Session ID: ${activeSessionId}`,
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    mcpServer,
    "request-visit",
    {
      title: "Notify Adobe that you would like to visit an office.",
      inputSchema: {
        officeId: OfficeIdSchema,
        email: z.string().email().describe("The email address of the user"),
        sessionId: SessionIdSchema,
      },
      _meta: {
        ui: { resourceUri: resourceAssets["office-details"].uri },
      },
    },
    async ({ officeId, email, sessionId } = {}, { _meta } = {}) => {
      const activeSessionId = ensureSessionId(sessionId);
      const office = officeData[officeId];
      const emailMessage = `Hi, I am interested in visiting the ${office.name} office.`;
      const identityMap = buildIdentityMap(_meta, activeSessionId);

      try {
        const result = await edgeClient.sendEvent({
          identityMap,
          xdm: {
            ...createCommonXdmFields(),
            eventType: "office.visit.request",
            _unifiedJsLab: {
              details: {
                officeId: officeId,
                email: Buffer.from(
                  await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(email),
                  ),
                ).toString("hex"),
              },
            },
          },
          query: {
            personalization: {
              decisionScopes: ["__view__"],
            },
          },
        });
        const handles = result.response?.body?.handle || [];
        const relevantHandles = handles.filter(
          (handle) =>
            handle.type === "personalization:decisions" ||
            handle.type === "state:store",
        );

        return {
          structuredContent: {
            sessionId: activeSessionId,
            _adobe: {
              handles: relevantHandles,
            },
          },
          content: [
            {
              type: "text",
              text: `Email sent! Message: "${emailMessage}" Session ID: ${activeSessionId}`,
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        return {
          structuredContent: {
            sessionId: activeSessionId,
            _adobe: {
              handles: [],
            },
          },
          content: [
            {
              type: "text",
              text: `Email sent! Message: "${emailMessage}" Session ID: ${activeSessionId}`,
            },
          ],
        };
      }
    },
  );

  return mcpServer;
}
