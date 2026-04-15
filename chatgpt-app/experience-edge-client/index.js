import { z } from "zod";
import { createAepEdgeClient } from "./aepEdgeClient.js";
import { createImsClient } from "./imsAuthentication.js";

const LOG_PREFIX = "[experience-edge-client] ";
const log = (...args) => console.log(LOG_PREFIX, ...args);

const isDomainName = (val) => {
  // must be a valid domain name, without the protocol or path
  const url = new URL(`https://${val}`);
  return url.hostname === val;
};

const createEdgeRequestHeaders = (accessToken, { orgId, clientId }) => ({
  Authorization: `Bearer ${accessToken}`,
  "x-gw-ims-org-id": orgId,
  "x-api-key": clientId,
});

/**
 * Server-side Experience Edge client instance for Adobe Experience Platform Edge Network.
 * For client-side integration, see frontend/src/resources.js which uses @adobe/alloy.
 */
export class ExperienceEdgeClient {
  /**
   * @typedef {z.infer<typeof InstanceConfigSchema>} InstanceConfig
   * @type {InstanceConfig}
   */
  config = null;
  #aepEdgeClient = null;
  #imsClient = null;
  #accessTokenPromise = null;
  static InstanceConfigSchema = z.object({
    edgeDomain: z
      .string()
      .refine(isDomainName, { message: "Invalid domain name" })
      .default("server.adobedc.net"),
    imsHost: z
      .string()
      .refine(isDomainName, { message: "Invalid domain name" })
      .default("ims-na1.adobelogin.com"),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    accessScopes: z.string().min(1),
    timeout: z.number().min(1).default(10000),
    datastreamId: z.string().min(1),
    orgId: z.string().min(1).max(50),
  });
  /**
   * @param {InstanceConfig} config
   */
  constructor(config) {
    this.config = ExperienceEdgeClient.InstanceConfigSchema.parse(config);
    this.#aepEdgeClient = createAepEdgeClient(
      this.config.datastreamId,
      this.config.edgeDomain,
    );
    this.#imsClient = createImsClient(
      this.config.clientId,
      this.config.clientSecret,
      this.config.accessScopes,
      this.config.imsHost,
    );
    this.#accessTokenPromise = this.#imsClient.generateAccessToken();
  }

  /**
   *
   * @param {Object} args
   * @param {Object} args.identityMap
   * @param {Object} args.xdm
   * @param {Object} args.data
   * @param {Object} args.query
   * @param {Object} args.meta
   * @param {"interact" | "collect"} args.endpoint
   * @returns
   */
  async sendEvent({
    identityMap,
    xdm = {},
    data,
    query,
    meta,
    endpoint = "interact",
  }) {
    const accessToken = await this.#accessTokenPromise;

    const event = {
      xdm: {
        timestamp: new Date().toISOString(),
        identityMap,
        ...xdm,
      },
    };

    if (data) {
      event.data = data;
    }

    const requestBody = { event };

    if (query) {
      requestBody.query = query;
    }

    if (meta) {
      requestBody.meta = meta;
    }

    const headers = createEdgeRequestHeaders(accessToken, this.config);

    // Log outgoing request info
    log(`[OUT] Edge ${endpoint} - eventType: ${xdm.eventType || "none"}`);
    if (query?.personalization) {
      log(
        `    Query: personalization scopes=${
          query.personalization.decisionScopes?.join(",") || "none"
        }, surfaces=${
          query.personalization.surfaces?.join(",") || "none"
        }`,
      );
    }
    if (identityMap) {
      const identityTypes = Object.keys(identityMap);
      log(`    IdentityMap: ${identityTypes.join(", ")}`);
    }

    const result = await this.#aepEdgeClient[endpoint](requestBody, headers);

    // Log incoming response info
    const handles = result.response?.body?.handle || [];
    const handleTypes = handles.map((h) => h.type).join(", ");
    log(`[IN]  Edge ${endpoint} - handles: [${handleTypes || "none"}]`);
    for (const handle of handles) {
      const count = handle.payload?.length ?? 0;
      if (handle.type === "personalization:decisions" && count > 0) {
        for (const decision of handle.payload) {
          log(
            `    [decision] scope=${decision.scope}, provider=${decision.scopeDetails?.decisionProvider}, items=${decision.items?.length ?? 0}`,
          );
          for (const item of decision.items ?? []) {
            log(
              `      [item] schema=${item.schema}, content=${JSON.stringify(item.data?.content).slice(0, 200)}`,
            );
          }
        }
      } else if (handle.type === "identity:result" && count > 0) {
        for (const id of handle.payload) {
          log(`    [identity] ${id.namespace?.code}=${id.id}`);
        }
      } else {
        log(`    [${handle.type}] ${count} payload(s)`);
      }
    }

    return result;
  }
}
