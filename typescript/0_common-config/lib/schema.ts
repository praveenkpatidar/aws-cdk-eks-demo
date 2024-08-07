import { z } from "zod";

// CommonConfig
export const commonSchema = z
  .object({
    app: z.string(),
    project: z.string(),
    awsRegion: z
      .literal("ap-southeast-2")
      .describe("Only AP Southeast 2 Allowed"),
  })
  .strict();

// Define the schema for EKS
const eksSchema = z
  .object({
    eksVersion: z.string(),
    adminRoleName: z.string(),
    coreNode: z.object({
      maxCount: z.number(),
      minCount: z.number(),
      instance: z.string(),
    }),
    eksAddOns: z.object({
      karpenter: z.object({
        version: z.string(),
      }),
      kubePrometheusStack: z.object({
        version: z.string(),
      }),
      metricsServer: z.object({
        version: z.string(),
      }),
      awsForFluentBit: z.object({
        version: z.string(),
      }),
    }),
  })
  .strict();

// Define the schema for Networking
const networkingSchema = z
  .object({
    vpcCidr: z.string(),
    eksTags: z.boolean(),
    maxAzs: z.literal(2).or(z.literal(3)),
  })
  .strict();

// Define the main schema
export const buildSchema = z
  .object({
    awsAccountID: z.string(),
    environment: z.string(),
    eksConfig: eksSchema,
    networking: networkingSchema,
  })
  .strict();

export type BuildSchemaType = z.infer<typeof buildSchema>;
export type CommonSchemaType = z.infer<typeof commonSchema>;
