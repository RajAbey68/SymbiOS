import { Router, Request, Response } from 'express';
import { AgentRunnerService } from '../services/AgentRunnerService';
import { HilGatewayService } from '../services/HilGatewayService';
import { DriftMonitoringService } from '../services/DriftMonitoringService';
import { prisma } from '../prisma.config';

export const executionRouter = Router();

const agentRunner = new AgentRunnerService();
const gatewayService = new HilGatewayService();
const driftMonitor = new DriftMonitoringService();

executionRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    const { roleId, taskId, proposedPayload, confidenceScore } = req.body;
    const makerIdentity = req.headers['x-maker-identity'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!roleId || !taskId) {
      return res.status(400).json({ error: "Missing required fields (roleId, taskId)" });
    }

    const role = await prisma.canonicalRole.findUnique({
      where: { id: roleId },
      include: { tasks: true }
    });

    if (!role) {
      return res.status(404).json({ error: "CanonicalRole not found in DB." });
    }

    const taskDef = role.tasks.find((t: any) => t.id === taskId);
    if (!taskDef) {
       return res.status(404).json({ error: "Task not found within CanonicalRole." });
    }

    // Agent proposes a payload — transition from Mock to Real Data
    const intent = agentRunner.createIntent(
      tenantId, 
      roleId, 
      taskId, 
      makerIdentity || "EXTERNAL_AGENT_V1",
      proposedPayload || { action: "PENDING_ACTION", detail: "No payload provided" },
      confidenceScore !== undefined ? confidenceScore : 0.85
    );

    // HIL API intercepts and evaluates
    const gatewayDecision = await gatewayService.evaluateIntent(intent, taskDef);

    // Monitoring: If auto-approved, analyze for drift/hallucination immediately
    if (gatewayDecision.status === 'AUTO_APPROVED_FOR_EXECUTION') {
        // Run in background to avoid blocking the user
        driftMonitor.monitorExecution(intent, { status: 'SUCCESS', details: 'Auto-approved' });
    }

    return res.status(200).json({ intent, gatewayDecision });
  } catch (error: any) {
    return res.status(500).json({ error: "Agent Submission Failed", details: error.message });
  }
});

executionRouter.get('/pending', async (req: Request, res: Response) => {
  try {
    const pendingItems = await gatewayService.getPendingQueue();
    return res.status(200).json(pendingItems);
  } catch (error: any) {
     return res.status(500).json({ error: "Failed to fetch pending queue", details: error.message });
  }
});

executionRouter.post('/review/:intentId', async (req: Request, res: Response) => {
  try {
    const { intentId } = req.params;
    const { decision } = req.body; 
    const checkerIdentity = req.headers['x-maker-identity'] as string; // The person hitting this endpoint is the Checker

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
       return res.status(400).json({ error: "Invalid review payload. Requires 'decision' (APPROVE/REJECT)." });
    }

    if (!checkerIdentity) {
      return res.status(403).json({ error: "Governance Violation", message: "Reviewer identity missing in 'x-maker-identity' header." });
    }

    const reviewResult = await gatewayService.resolveReview(intentId, decision as 'APPROVE'|'REJECT', checkerIdentity);

    if (!reviewResult) {
       return res.status(404).json({ error: "Intent not found in DB." });
    }

    if (decision === 'APPROVE') {
        driftMonitor.monitorExecution({ ...reviewResult, proposedPayload: JSON.parse(JSON.stringify(reviewResult.proposedPayload)) }, { status: 'SUCCESS', details: 'Manually approved' });
    }

    return res.status(200).json(reviewResult);
  } catch(error: any) {
    return res.status(500).json({ error: "Review submission failed.", details: error.message });
  }
});
