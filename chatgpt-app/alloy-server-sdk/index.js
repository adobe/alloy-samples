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
    orgId: z.string().min(1).max(30),
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
  }

  static RequestMetadataSchema = z.object({
    sessionId: z.literal(GENERATE).or(z.string().uuid()).describe("Prefer the prior session ID; use GENERATE only when none available."),
    ecid: z.literal(GENERATE).or(z.string()).describe("Prefer the prior ECID; use GENERATE only when none available."),
  });
  get RequestMetadataSchema() {
    return AlloyServerInstance.RequestMetadataSchema;
  }
  /**
   * @typedef {z.infer<typeof this.RequestMetadataSchema>} RequestMetadata
   * @param {RequestMetadata} adobeMeta
   * @returns {RequestMetadata}
   */
  extractMetadataFromRequest(adobeMeta) {
    let { sessionId, ecid } = adobeMeta;
    if (!sessionId || sessionId === GENERATE) {
      sessionId = generateSessionId();
    }
    if (!ecid || ecid === GENERATE) {
      ecid = generateEcid();
    }
    return { sessionId, ecid };
  }

  async collect() {}
}
