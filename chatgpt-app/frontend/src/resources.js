import { createInstance } from "@adobe/alloy";
import { z } from "zod";
import { useRef } from "react";

const AlloyConfigSchema = z
  .object({
    datastreamId: z.string().min(1).optional().describe("Adobe Experience Platform datastream ID (legacy)"),
    orgId: z.string().min(1).max(50).describe("Adobe organization ID"),
    edgeConfigId: z.string().min(1).optional().describe("Edge configuration ID (preferred over datastreamId)"),
    debugEnabled: z.boolean().optional().default(false),
    clickCollectionEnabled: z.boolean().optional().default(true),
    context: z.array(z.string()).optional(),
    defaultConsent: z.enum(["in", "out", "pending"]).optional(),
  })
  .refine(
    (data) => data.edgeConfigId || data.datastreamId,
    {
      message: "Either edgeConfigId or datastreamId must be provided",
      path: ["edgeConfigId"],
    }
  );

/**
 * Gets alloy configuration from environment variables (injected at build-time)
 * Uses the same environment variable names as the backend (DATASTREAM_ID, ORG_ID)
 * @returns {z.infer<typeof AlloyConfigSchema> | null}
 */
const getConfig = () => {
  // These are injected at build time via esbuild define
  // esbuild replaces these with JSON.stringify'd values, so empty strings become ""
  const datastreamId = process.env.DATASTREAM_ID && process.env.DATASTREAM_ID !== "" ? process.env.DATASTREAM_ID : null;
  const orgId = process.env.ORG_ID && process.env.ORG_ID !== "" ? process.env.ORG_ID : null;

  if ((datastreamId || edgeConfigId) && orgId) {
    const envConfig = {
      datastreamId: datastreamId || undefined,
      orgId: orgId,
    };

    try {
      return AlloyConfigSchema.parse(envConfig);
    } catch (error) {
      console.error("[alloy] Invalid configuration from environment variables:", error);
      return null;
    }
  }
  return null;
};


/**
 * Creates and configures an alloy instance with validated configuration
 * @returns {import("@adobe/alloy").AlloyInstance | null}
 */
export const createAlloyInstance = () => {
  const config = getConfig();

  if (!config) {
    console.warn(
      "[alloy] Configuration not found. Set environment variables (DATASTREAM_ID, ORG_ID)."
    );
    return null;
  }

  try {
    const validatedConfig = AlloyConfigSchema.parse(config);
    const alloy = createInstance({ name: "alloy" });

    const configureOptions = {
      orgId: validatedConfig.orgId,
      debugEnabled: true
    };

    if (validatedConfig.edgeConfigId) {
      configureOptions.edgeConfigId = validatedConfig.edgeConfigId;
    } else if (validatedConfig.datastreamId) {
      configureOptions.datastreamId = validatedConfig.datastreamId;
    }

    if (validatedConfig.clickCollectionEnabled !== undefined) {
      configureOptions.clickCollectionEnabled = validatedConfig.clickCollectionEnabled;
    }

    if (validatedConfig.context) {
      configureOptions.context = validatedConfig.context;
    }

    if (validatedConfig.defaultConsent) {
      configureOptions.defaultConsent = validatedConfig.defaultConsent;
    }

    alloy("configure", configureOptions);

    return alloy;
  } catch (error) {
    console.error("[alloy] Failed to create and configure alloy instance:", error);
    return null;
  }
};

/**
 * Default alloy instance (lazy initialized)
 * @type {import("@adobe/alloy").AlloyInstance | null}
 */
let alloyInstance = null;

/**
 * Gets or creates the default alloy instance
 * @returns {import("@adobe/alloy").AlloyInstance | null}
 */
export const getAlloy = () => {
  if (!alloyInstance) {
    alloyInstance = createAlloyInstance();
  }
  return alloyInstance;
};

/**
 * React hook to access the Alloy instance
 * @returns {import("@adobe/alloy").AlloyInstance | null}
 */
export const useAlloy = () => {
  const alloyRef = useRef(null);

  if (!alloyRef.current) {
    alloyRef.current = getAlloy();
  }

  return alloyRef.current;
};

export default getAlloy;
