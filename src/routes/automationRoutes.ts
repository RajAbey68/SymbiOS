import { Router, Request, Response } from 'express';
import { ReceiptVisionService } from '../services/ReceiptVisionService';
import { AgentRunnerService } from '../services/AgentRunnerService';
import { HilGatewayService } from '../services/HilGatewayService';
import { prisma } from '../prisma.config';

export const automationRouter = Router();
const visionService = new ReceiptVisionService();
const agentRunner = new AgentRunnerService();
const gatewayService = new HilGatewayService();

/**
 * POST /api/v1/automation/extract-receipt
 * 
 * Takes a base64 encoded receipt image, extracts metadata via Gemini,
 * and submits the result to the HIL Gateway for internal governance evaluation.
 */
automationRouter.post('/extract-receipt', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, roleId, taskId } = req.body;
    const makerIdentity = req.headers['x-maker-identity'] as string || "VISION_AGENT_V1";
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!image) {
      return res.status(400).json({ error: "Missing required 'image' (base64) field." });
    }

    // 1. Vision Extraction
    const extraction = await visionService.extractReceiptData(image, mimeType || 'image/jpeg');

    // 2. Identify the Internal Governance Context
    const effectiveRoleId = roleId || "role_ap_clerk_automated";
    const effectiveTaskId = taskId || "task_receipt_ingestion";

    const role = await prisma.canonicalRole.findUnique({
      where: { id: effectiveRoleId },
      include: { tasks: true }
    });

    const taskDef = role?.tasks.find((t: any) => t.id === effectiveTaskId) || {
        requiresApproval: true, // Default to strict if task not found
        approvalThresholdConfidence: 0.98,
        segregationOfDutiesEnforced: true,
        dollarLimit: 50
    };

    // 3. Create Intent for Internal Governance Evaluation
    const intent = agentRunner.createIntent(
      tenantId || "tenant_default",
      effectiveRoleId,
      effectiveTaskId,
      makerIdentity,
      { 
        action: "EXTRACT_RECEIPT", 
        amount: extraction.totalAmount, 
        vendor: extraction.vendorName,
        date: extraction.date,
        fullExtraction: extraction 
      },
      extraction.confidence
    );

    // 4. HIL Policy Evaluation
    const gatewayDecision = await gatewayService.evaluateIntent(intent, taskDef);

    return res.status(200).json({
      status: "success",
      source: "SymbiOS-Vision-Governance",
      extraction,
      gatewayDecision
    });
  } catch (error: any) {
    console.error("[AutomationRoute] Extraction/Governance Error:", error);
    return res.status(500).json({ 
      error: "Failed to process receipt governance", 
      details: error.message 
    });
  }
});
