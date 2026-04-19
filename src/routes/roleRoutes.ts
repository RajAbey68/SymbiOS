import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.config';
import { RoleParserService } from '../services/RoleParserService';
import { NotebookLMService } from '../services/NotebookLMService';
import { AgenticVisionService } from '../services/AgenticVisionService';
import { DeltaSynthesisService } from '../services/DeltaSynthesisService';
import { BlueprintDesignerService } from '../services/BlueprintDesignerService';

export const roleRouter = Router();
const parserService = new RoleParserService();
const notebookService = new NotebookLMService();
const visionService = new AgenticVisionService();
const deltaService = new DeltaSynthesisService();
const blueprintService = new BlueprintDesignerService();

roleRouter.post('/parse', async (req: Request, res: Response) => {
  try {
    const { rawJobDescription, workspaceId, title } = req.body;
    
    if (!rawJobDescription || !workspaceId || !title) {
      return res.status(400).json({ error: "Missing required fields (rawJobDescription, workspaceId, title)" });
    }

    // 1. Get Grounding Context
    const context = await notebookService.getGroundingReferencesForRole(workspaceId, title);

    // 2. Parse JD against Context to build OS Object
    const canonicalRole = await parserService.parseJobDescription(rawJobDescription, context);

    if (canonicalRole) {
      // 3. PERSIST TO POSTGRES VIA PRISMA ORM
      // First ensure a mock tenant exists for this workspaceId
      await prisma.tenant.upsert({
        where: { id: workspaceId },
        update: {},
        create: { id: workspaceId, name: "Default Tenant" }
      });

      const savedRole = await prisma.canonicalRole.create({
        data: {
          tenantId: workspaceId,
          titleNormalized: canonicalRole.titleNormalized,
          department: canonicalRole.department,
          notebookLmWorkspaceId: canonicalRole.notebookLmWorkspaceId,
          primaryAccountabilities: canonicalRole.residualHumanSpecification.primaryAccountabilities,
          requiredJudgments: canonicalRole.residualHumanSpecification.requiredJudgments,
          tasks: {
            create: canonicalRole.tasks.map((t: any) => ({
              tenantId: workspaceId,
              description: t.description,
              automationClassification: t.automationClassification,
              opalWorkflowId: t.opalWorkflowId,
              requiresApproval: t.hilPolicy.requiresApproval,
              approvalThresholdConfidence: t.hilPolicy.approvalThresholdConfidence,
              segregationOfDutiesEnforced: t.hilPolicy.segregationOfDutiesEnforced,
              stopSequenceTrigger: t.hilPolicy.stopSequenceTrigger
            }))
          }
        },
        include: { tasks: true }
      });

      return res.status(201).json(savedRole);
    } else {
        return res.status(500).json({ error: "Parser failed to generate a valid schema." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Ingestion Core Execution Error", details: error.message });
  }
});

roleRouter.get('/:id', async (req: Request, res: Response) => {
  const role = await prisma.canonicalRole.findUnique({
    where: { id: req.params.id },
    include: { tasks: true }
  });

  if (!role) {
    return res.status(404).json({ error: "Role not found." });
  }
  return res.json(role);
});

roleRouter.post('/:id/reality-delta', async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const { telemetryStream } = req.body;

    const role = await prisma.canonicalRole.findUnique({
      where: { id: roleId },
      include: { tasks: true }
    });

    if (!role) {
      return res.status(404).json({ error: "CanonicalRole not found." });
    }

    if (!telemetryStream || !Array.isArray(telemetryStream)) {
      return res.status(400).json({ error: "Invalid visual telemetry array." });
    }

    const aggregatedObs = visionService.aggregateSession(telemetryStream);
    const delta = await deltaService.computeRealityDelta(role as any, aggregatedObs);

    return res.status(200).json({ roleId: role.id, deltaAnalysis: delta });
  } catch (error: any) {
    return res.status(500).json({ error: "Work Reality Synthesis Error", details: error.message });
  }
});

roleRouter.post('/:id/blueprint', async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const { taskId } = req.body;

    const role = await prisma.canonicalRole.findUnique({
      where: { id: roleId },
      include: { tasks: true }
    });

    if (!role) {
      return res.status(404).json({ error: "CanonicalRole not found." });
    }

    if (!taskId) {
      return res.status(400).json({ error: "Missing required field: taskId" });
    }

    // Adapt prisma model to canonical role expected format for blueprint
    const blueprint = await blueprintService.generateBlueprint(role as any, taskId);

    return res.status(200).json({ roleId: role.id, taskId, blueprint });
  } catch (error: any) {
    return res.status(500).json({ error: "Blueprint Generation Error", details: error.message });
  }
});
