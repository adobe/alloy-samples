import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAepEdgeClient, getAepCookieName } from "./aepEdgeClient.js";
import { createImsClient } from "./imsAuthentication.js";
import { StateStore } from "./stateStore.js";

const isDomainName = (val) => {
  // must be a valid domain name, without the protocol or path
  const url = new URL(`https://${val}`);
  return url.hostname === val;
};

const GENERATE = "GENERATE";

const createEdgeRequestHeaders = (accessToken, { orgId, clientId }) => ({
  Authorization: `Bearer ${accessToken}`,
  "x-gw-ims-org-id": orgId,
  "x-api-key": clientId,
});

const buildIdentityMap = ({ ecid, fpid }) => {
  const identityMap = {};
  const hasValidEcid = typeof ecid === "string" && ecid !== GENERATE;

  if (hasValidEcid) {
    identityMap.ECID = [
      {
        id: ecid,
        primary: true,
      },
    ];
  }

  // Include FPID when present, or generate one if no ECID is provided.
  // When both ECID and FPID exist, ECID remains the primary identity.
  // V2 Konductor APIs require some form of identity, so generate FPID if nothing else is present.
  const shouldGenerateFpid = !hasValidEcid && !fpid;
  const fpidValue = fpid ?? (shouldGenerateFpid ? randomUUID() : undefined);
  if (fpidValue) {
    identityMap.FPID = [
      {
        id: fpidValue,
        authenticatedState: "ambiguous",
        primary: !hasValidEcid,
      },
    ];
  }

  return identityMap;
};

const attachGeneratedEcidFromResult = (result) => {
  const handles = result.response?.body?.handle || [];
  const identityResult = handles.find((h) => h.type === "identity:result");
  if (identityResult?.payload) {
    const ecidEntry = identityResult.payload.find(
      (p) => p.namespace?.code === "ECID"
    );
    if (ecidEntry?.id) {
      result.generatedEcid = ecidEntry.id;
    }
  }
};

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
      this.config.edgeDomain
    );
    this.#imsClient = createImsClient(
      this.config.clientId,
      this.config.clientSecret,
      this.config.accessScopes,
      this.config.imsHost
    );
    this.#accessTokenPromise = this.#imsClient.generateAccessToken();
  }

  async collect({ ecid, fpid, xdm = {} }) {
    if (!ecid && fpid) {
      ecid = this.#stateStore.getEcidForFpid(fpid);
    }

    const accessToken = await this.#accessTokenPromise;

    const identityMap = buildIdentityMap({ ecid, fpid });

    const requestBody = {
      events: [
        {
          xdm: {
            timestamp: new Date().toISOString(),
            identityMap,
            ...xdm,
          },
        },
      ],
    };

    const headers = createEdgeRequestHeaders(accessToken, this.config);

    // Inject state store entries if available for this session (using ecid as key)
    const stateEntries = this.#stateStore.toMetaEntries(ecid);
    if (stateEntries.length > 0) {
      requestBody.meta = requestBody.meta || {};
      requestBody.meta.state = {
        entries: stateEntries,
      };
    }

    const clusterCookieName = getAepCookieName(this.config.orgId, "cluster");
    const cluster = this.#stateStore.get(ecid).get(clusterCookieName);

    const result = await this.#aepEdgeClient.collect(
      requestBody,
      headers,
      cluster
    );

    if (!ecid) {
      attachGeneratedEcidFromResult(result);
    }

    // Persist any state handles returned by the server
    const handles = result.response?.body?.handle || [];
    // Use the final ECID (either original or generated) to store state
    const finalEcid = ecid || result.generatedEcid;
    if (finalEcid) {
      this.#stateStore.update(finalEcid, handles);
      if (fpid) {
        this.#stateStore.setEcidForFpid(fpid, finalEcid);
      }
    }

    return result;
  }

  async interact({ ecid, fpid, xdm = {}, data, query, meta }) {
    if (!ecid && fpid) {
      ecid = this.#stateStore.getEcidForFpid(fpid);
    }

    const accessToken = await this.#accessTokenPromise;

    const identityMap = buildIdentityMap({ ecid, fpid });
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

    // Inject state store entries if available for this session (using ecid as key)
    const stateEntries = this.#stateStore.toMetaEntries(ecid);
    if (stateEntries.length > 0) {
      requestBody.meta = requestBody.meta || {};
      requestBody.meta.state = {
        entries: stateEntries,
      };
    }

    const clusterCookieName = getAepCookieName(this.config.orgId, "cluster");
    const cluster = this.#stateStore.get(ecid).get(clusterCookieName);

    const headers = createEdgeRequestHeaders(accessToken, this.config);

    const result = await this.#aepEdgeClient.interact(
      requestBody,
      headers,
      cluster
    );

    if (!ecid) {
      attachGeneratedEcidFromResult(result);
    }

    // Persist any state handles returned by the server
    const handles = result.response?.body?.handle || [];
    // Use the final ECID (either original or generated) to store state
    const finalEcid = ecid || result.generatedEcid;
    if (finalEcid) {
      this.#stateStore.update(finalEcid, handles);
      if (fpid) {
        this.#stateStore.setEcidForFpid(fpid, finalEcid);
      }
    }

    return result;
  }
}
