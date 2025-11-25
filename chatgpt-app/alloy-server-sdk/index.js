import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAepEdgeClient, getAepCookieName } from "./aepEdgeClient.js";
import { createImsClient } from "./imsAuthentication.js";
import { StateStore } from "./stateStore.js";

const LOG_PREFIX = "[alloy-server-sdk] ";
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
 * Server-side Alloy SDK instance for Adobe Experience Platform Edge Network.
 * For client-side integration, see frontend/src/resources.js which uses @adobe/alloy.
 */
export class AlloyServerInstance {
  /**
   * @typedef {z.infer<typeof InstanceConfigSchema>} InstanceConfig
   * @type {InstanceConfig}
   */
  config = null;
  #aepEdgeClient = null;
  #imsClient = null;
  #accessTokenPromise = null;
  #stateStore = new StateStore();
  static InstanceConfigSchema = z.object({
    edgeDomain: z
      .string()
      .refine(isDomainName, { message: "Invalid domain name" })
      .default("server.adobedc.net"),
    edgeRegion: z.string().min(1).default("irl1"),
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
    this.config = AlloyServerInstance.InstanceConfigSchema.parse(config);
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
   * @param {string} args.sessionId
   * @param {"interact" | "collect"} args.endpoint
   * @returns
   */
  async sendEvent({
    identityMap,
    xdm = {},
    data,
    query,
    meta,
    sessionId,
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

    // Inject state store entries if available for this session
    const stateEntries = sessionId
      ? this.#stateStore.toMetaEntries(sessionId)
      : [];
    if (stateEntries.length > 0) {
      requestBody.meta = requestBody.meta || {};
      requestBody.meta.state = {
        entries: stateEntries,
      };
    }

    const clusterCookieName = getAepCookieName(this.config.orgId, "cluster");
    const cluster = sessionId
      ? this.#stateStore.get(sessionId).get(clusterCookieName)
      : undefined;

    const headers = createEdgeRequestHeaders(accessToken, this.config);

    // Log outgoing request info
    log(
      `[OUT] Edge ${endpoint} - eventType: ${
        xdm.eventType || "none"
      }, sessionId: ${sessionId?.substring(0, 8)}...`,
    );
    if (query?.personalization) {
      log(
        `    Query: personalization scopes=${
          query.personalization.decisionScopes?.join(",") || "none"
        }`,
      );
    }
    if (identityMap) {
      const identityTypes = Object.keys(identityMap);
      log(`    IdentityMap: ${identityTypes.join(", ")}`);
    }

    const result = await this.#aepEdgeClient[endpoint](
      requestBody,
      headers,
      cluster,
    );

    // Log incoming response info
    const handles = result.response?.body?.handle || [];
    const handleTypes = handles.map((h) => h.type).join(", ");
    log(`[IN]  Edge ${endpoint} - handles: [${handleTypes || "none"}]`);
    if (handles.length > 0) {
      log(`    ${handles.length} handle(s) received`);
    }

    // Persist any state handles returned by the server
    if (sessionId) {
      this.#stateStore.update(sessionId, handles);
    }

    return result;
  }
}
