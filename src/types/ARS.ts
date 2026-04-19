import { z } from 'zod';

export const agentRequirementSpecificationSchema = z.object({
  roleIdentity: z.object({
    originalHumanRole: z.string(),
    agenticAutomationTier: z.enum(["Full", "Partial", "Support"]),
    residualHumanAccountability: z.string(),
  }),
  capabilities: z.object({
    toolAccess: z.array(z.string()),
    requiredSkills: z.array(z.string()),
  }),
  executionWorkflows: z.array(z.object({
    stepId: z.string(),
    action: z.string(),
    logic: z.enum(["Autonomous", "HITL_Required", "HOTL_Approval"]),
    trigger: z.string(),
    inputDataSources: z.array(z.string()),
    outputDataTargets: z.array(z.string()),
  })),
  governance: z.object({
    euAiActRiskTier: z.enum(["Low", "Limited", "High", "Prohibited"]),
    hitlThresholds: z.object({
      dollarLimit: z.number(),
      confidenceThreshold: z.number(),
      exceptionTypes: z.array(z.string()),
    }),
    segregationOfDuties: z.string(),
    auditRequirements: z.array(z.string()),
  }),
  performanceSLAs: z.object({
    accuracyTarget: z.number(),
    maxProcessingTimeMinutes: z.number(),
    throughputTarget: z.number(),
  }),
});

export type AgentRequirementSpecification = z.infer<typeof agentRequirementSpecificationSchema>;
