import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAepEdgeClient } from "./aepEdgeClient.js";
import { createImsClient } from "./imsAuthentication.js";
import { collect } from "./collection.js";

const generateEcid = () => randomUUID();
const generateSessionId = () => randomUUID();
const isDomainName = (val) => {
  // must be a valid domain name, without the protocol or path
  const url = new URL(`https://${val}`);
  return url.hostname === val;
};

const GENERATE = "GENERATE";
export class AlloyServerInstance {
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
      this.config.edgeRegion,
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

  static RequestMetadataSchema = z.object({
    sessionId: z
      .literal(GENERATE)
      .or(z.string().uuid())
      .describe(
        "Prefer the prior session ID; use GENERATE only when none available."
      ),
    ecid: z
      .literal(GENERATE)
      .or(z.string())
      .optional()
      .describe(
        "Prefer the prior ECID; use GENERATE only when none available."
      ),
  });
  get RequestMetadataSchema() {
    return AlloyServerInstance.RequestMetadataSchema;
  }
  /**
   * @typedef {z.infer<typeof this.RequestMetadataSchema>} RequestMetadata
   * @param {RequestMetadata} adobeMeta
   * @param {object} [options]
   * @param {object} [options._meta] MCP metadata object containing client context (e.g., openai/subject)
   * @returns {RequestMetadata & { fpid?: string }}
   */
  extractMetadataFromRequest(adobeMeta, { _meta } = {}) {
    let { sessionId, ecid } = adobeMeta;
    if (!sessionId || sessionId === GENERATE) {
      sessionId = generateSessionId();
    }
    if (ecid === GENERATE) {
      ecid = undefined;
    }
    const fpid = _meta?.["openai/subject"];
    return { sessionId, ecid, fpid };
  }

  async collect({ ecid, fpid, xdm = {} }) {
    const accessToken = await this.#accessTokenPromise;

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
    // V 2 konductor APIs require some form of identity. So we use a generated FPID if nothing else is present.
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

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "x-gw-ims-org-id": this.config.orgId,
      "x-api-key": this.config.clientId,
    };

    const result = await this.#aepEdgeClient.collect(requestBody, headers);

    if (!ecid) {
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
    }

    console.log("=== ALLOY SERVER COLLECT RESULT ===");
    console.log("Result:", JSON.stringify(result, null, 2));

    return result;
  }
}
