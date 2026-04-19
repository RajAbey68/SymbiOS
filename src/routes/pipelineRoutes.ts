import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.config';
import { RoleParserService } from '../services/RoleParserService';
import { NotebookLMService } from '../services/NotebookLMService';
import { ArsExtractorService } from '../services/ars-extractor.service';
import { BlueprintDesignerService } from '../services/BlueprintDesignerService';
import { AgentRunnerService } from '../services/AgentRunnerService';
import { HilGatewayService } from '../services/HilGatewayService';
import { AgenticVisionService } from '../services/AgenticVisionService';

export const pipelineRouter = Router();

const parserService = new RoleParserService();
const notebookService = new NotebookLMService();
const arsExtractor = new ArsExtractorService();
const blueprintService = new BlueprintDesignerService();
const agentRunner = new AgentRunnerService();
const gatewayService = new HilGatewayService();
const visionService = new AgenticVisionService();

/**
 * SymbiOS HyperAutomation Pipeline — End-to-End Orchestration
 * 
 * POST /api/v1/pipeline/run
 * 
 * Chains the full Role-to-Agent lifecycle in a single request:
 *   1. NotebookLM Grounding → 2. JD Parse → 3. ARS Extraction → 
 *   4. Blueprint Generation → 5. Agent Execution → 6. HIL Gateway
 * 
 * Each stage output feeds into the next. The response contains the 
 * full pipeline trace for audit compliance and transparency.
 */
pipelineRouter.post('/run', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const trace: Record<string, any> = {};

  try {
    const { 
      rawJobDescription, 
      businessProcess,
      workspaceId, 
      title,
      targetTaskIndex = 0,
      forceHighConfidence = false,
      telemetryStream
    } = req.body;

    if (!rawJobDescription || !workspaceId || !title) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["rawJobDescription", "workspaceId", "title"],
        optional: ["businessProcess", "targetTaskIndex", "forceHighConfidence", "telemetryStream"]
      });
    }

    let enrichedBusinessProcess = businessProcess || "";
    if (telemetryStream && Array.isArray(telemetryStream)) {
      const visualContext = visionService.aggregateSession(telemetryStream);
      enrichedBusinessProcess += `\n\n--- Visual Telemetry Observations ---\n${visualContext}`;
      trace.vision_ingestion = "completed";
    }

    // ── STAGE 1: NotebookLM Grounding ──────────────────────────
    const groundingContext = await notebookService.getGroundingReferencesForRole(workspaceId, title);
    trace.stage1_grounding = { 
      referencesFound: groundingContext.length,
      sources: groundingContext.map(r => r.documentId)
    };

    // ── STAGE 2: JD Parse → Canonical Role ─────────────────────
    const canonicalRole = await parserService.parseJobDescription(rawJobDescription, groundingContext);
    if (!canonicalRole) {
      return res.status(500).json({ error: "Stage 2 failed: JD Parser returned no valid schema.", trace });
    }

    // Persist the CanonicalRole to Postgres
    await prisma.tenant.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: title }
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
            dollarLimit: t.hilPolicy.dollarLimit,
            stopSequenceTrigger: t.hilPolicy.stopSequenceTrigger
          }))
        }
      },
      include: { tasks: true }
    });

    trace.stage2_parse = {
      roleId: savedRole.id,
      title: savedRole.titleNormalized,
      department: savedRole.department,
      tasksCreated: savedRole.tasks.length
    };

    // ── STAGE 3: ARS Extraction (if businessProcess provided) ──
    if (enrichedBusinessProcess) {
      try {
        const arsResult = await arsExtractor.extractArs(rawJobDescription, enrichedBusinessProcess);
        trace.stage3_ars = {
          status: "completed",
          riskTier: arsResult.ars.governance.euAiActRiskTier,
          workflowSteps: arsResult.ars.executionWorkflows.length,
          segregationOfDuties: arsResult.ars.governance.segregationOfDuties
        };
      } catch (arsError: any) {
        trace.stage3_ars = { status: "failed", error: arsError.message };
      }
    } else {
      trace.stage3_ars = { status: "skipped", reason: "No businessProcess provided" };
    }

    // ── STAGE 4: Blueprint Generation ──────────────────────────
    const targetTask = savedRole.tasks[targetTaskIndex];
    if (!targetTask) {
      trace.stage4_blueprint = { status: "skipped", reason: `No task at index ${targetTaskIndex}` };
    } else {
      try {
        const blueprint = await blueprintService.generateBlueprint(savedRole as any, targetTask.id);
        trace.stage4_blueprint = {
          status: "completed",
          taskId: targetTask.id,
          taskDescription: targetTask.description,
          dagNodes: blueprint
        };
      } catch (bpError: any) {
        trace.stage4_blueprint = { status: "failed", error: bpError.message };
      }
    }

    // ── STAGE 5: Agent Intent & HIL Gateway ────────────────────
    if (targetTask) {
      const makerIdentity = (req.headers['x-maker-identity'] as string) || "SYSTEM_PIPELINE";
      const tenantId = (req.headers['x-tenant-id'] as string) || workspaceId;

      const intent = agentRunner.createIntent(
        tenantId,
        savedRole.id,
        targetTask.id,
        makerIdentity,
        { 
          action: "PIPELINE_TASK_INITIALIZATION", 
          taskDescription: targetTask.description,
          status: "SIMULATED_PROPOSAL"
        },
        forceHighConfidence ? 0.98 : 0.85
      );

      const gatewayDecision = await gatewayService.evaluateIntent(intent, targetTask);

      trace.stage5_execution = {
        intentId: intent.intentId,
        confidenceScore: intent.confidenceScore,
        makerIdentity: intent.makerIdentity,
        tenantId: intent.tenantId,
        gatewayDecision: gatewayDecision.status,
        reason: gatewayDecision.reason || "Policy evaluation complete",
        queueId: gatewayDecision.queueId || null
      };
    } else {
      trace.stage5_execution = { status: "skipped", reason: "No target task for execution" };
    }

    // ── PIPELINE COMPLETE ──────────────────────────────────────
    const elapsed = Date.now() - startTime;

    return res.status(201).json({
      pipeline: "symbios-hyperautomation-v1",
      status: "complete",
      elapsedMs: elapsed,
      roleId: savedRole.id,
      trace
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: "SymbiOS Pipeline Execution Error", 
      details: error instanceof Error ? error.message : "An unexpected core error occurred." 
    });
  }
});
