import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OfficeIdSchema, officeData } from "datastore";
import { v4 as randomUUID } from "uuid";
import { z } from "zod";

export const buildIdentityMap = (_meta) => {
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
                connectDomains: [
                  "https://chatgpt.com",
                  "https://*.demdex.net",
                  "https://*.adobedc.net",
                ],
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
      inputSchema: {},
      _meta: {
        ui: { resourceUri: resourceAssets["office-list"].uri },
      },
    },
    async (_args = {}, { _meta } = {}) => {
      const identityMap = buildIdentityMap(_meta);

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
            offices: Object.values(officeData),
            _adobe: {
              handles: relevantHandles,
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: "Displayed the list of offices.",
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        // Even if analytics/personalization fails, return the content
        return {
          structuredContent: {
            offices: Object.values(officeData),
            _adobe: {
              handles: [],
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: "Displayed the list of offices.",
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
                connectDomains: [
                  "https://chatgpt.com",
                  "https://*.demdex.net",
                  "https://*.adobedc.net",
                ],
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
      },
      _meta: {
        ui: { resourceUri: resourceAssets["office-details"].uri },
      },
    },
    /** @param {object} params
     * @param {keyof typeof officeData} params.officeId
     */
    async ({ officeId } = {}, { _meta } = {}) => {
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
      const identityMap = buildIdentityMap(_meta);

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
            office,
            _adobe: {
              handles: relevantHandles,
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed details for office ${officeId}.`,
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        return {
          structuredContent: {
            office,
            _adobe: {
              handles: [],
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: `Displayed details for office ${officeId}.`,
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
      },
      _meta: {
        ui: { resourceUri: resourceAssets["office-details"].uri },
      },
    },
    async ({ officeId, email } = {}, { _meta } = {}) => {
      const office = officeData[officeId];
      const emailMessage = `Hi, I am interested in visiting the ${office.name} office.`;
      const identityMap = buildIdentityMap(_meta);

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
            _adobe: {
              handles: relevantHandles,
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: `Email sent! Message: "${emailMessage}"`,
            },
          ],
        };
      } catch (error) {
        console.error("Failed to collect analytics:", error);
        return {
          structuredContent: {
            _adobe: {
              handles: [],
              identityMap,
            },
          },
          content: [
            {
              type: "text",
              text: `Email sent! Message: "${emailMessage}"`,
            },
          ],
        };
      }
    },
  );

  return mcpServer;
}
