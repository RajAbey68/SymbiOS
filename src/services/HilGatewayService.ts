import { ActionIntent } from './AgentRunnerService';
import { prisma } from '../prisma.config';
import { AgentRequirementSpecification } from '../types/ARS';

export type GatewayDecisionStatus = 'AUTO_APPROVED_FOR_EXECUTION' | 'PENDING_HUMAN_REVIEW' | 'REJECTED_POLICY_VIOLATION';

export class HilGatewayService {

  /**
   * Evaluates the Agent's Intent against the Task Governance Policy.
   * COMPLIANCE: Now supports ARS-based Risk Tiers and SoD checks.
   */
  public async evaluateIntent(
    intent: ActionIntent, 
    taskConfig: any, 
    ars?: AgentRequirementSpecification
  ): Promise<{ status: GatewayDecisionStatus, reason?: string, queueId?: string }> {
    
    // 1. EU AI ACT COMPLIANCE: High-Risk AI ALWAYS requires HIL
    if (ars?.governance.euAiActRiskTier === 'High') {
      const queueRec = await this.enqueueForReview(intent, "Policy Trigger: EU AI Act High-Risk Tier requires mandatory human-in-the-loop review.");
      return { status: 'PENDING_HUMAN_REVIEW', reason: 'High-Risk AI Tier (EU AI Act).', queueId: queueRec.id };
    }

    // 2. EXCEPTION BYPASS: Trusted categories can skip HIL
    if (ars?.governance.hitlThresholds.exceptionTypes.includes(intent.proposedPayload.category || "")) {
       console.log(`[SymbiOS] [HIL] Bypass triggered for trusted category: ${intent.proposedPayload.category}`);
       return { status: 'AUTO_APPROVED_FOR_EXECUTION' };
    }

    // 3. Check Hard Requires Approval Rule
    if (taskConfig.requiresApproval || ars?.executionWorkflows.some(w => w.stepId === intent.taskId && w.logic === 'HITL_Required')) {
      const queueRec = await this.enqueueForReview(intent, "Task inherently requires human approval.");
      return { status: 'PENDING_HUMAN_REVIEW', reason: 'Task requires mandatory HIL.', queueId: queueRec.id };
    }

    // 4. Check Confidence Threshold
    const confidenceThreshold = ars?.governance.hitlThresholds.confidenceThreshold || taskConfig.approvalThresholdConfidence || 0.95;
    if (intent.confidenceScore < confidenceThreshold) {
      const queueRec = await this.enqueueForReview(intent, `Confidence (${intent.confidenceScore}) below threshold (${confidenceThreshold}).`);
      return { status: 'PENDING_HUMAN_REVIEW', reason: 'Low AI Confidence.', queueId: queueRec.id };
    }

    // 5. Check Dollar Limit (Universal Financial Governance)
    const dollarLimit = ars?.governance.hitlThresholds.dollarLimit ?? taskConfig.dollarLimit;
    if (dollarLimit !== null && dollarLimit !== undefined) {
      const amount = this.findAmountInPayload(intent.proposedPayload);
      if (amount !== null && amount > dollarLimit) {
        const queueRec = await this.enqueueForReview(intent, `Transaction amount (€${amount}) exceeds task dollar limit (€${dollarLimit}).`);
        return { status: 'PENDING_HUMAN_REVIEW', reason: 'Dollar limit exceeded.', queueId: queueRec.id };
      }
    }

    // 6. Maker-Checker Segregation check via CanonicalRole Registry (Strictest Governance)
    if (taskConfig.segregationOfDutiesEnforced || ars?.governance.segregationOfDuties) {
      const makerRole = await prisma.canonicalRole.findUnique({
        where: { id: intent.roleId },
      });
      const checkerRole = await prisma.canonicalRole.findFirst({
        where: { tenantId: intent.tenantId, titleNormalized: 'CHECKER' },
      });

      // If the maker identity matches the checker identity, reject — SoD violation
      if (checkerRole && intent.makerIdentity === (checkerRole as any).checkerIdentity) {
        return {
          status: 'REJECTED_POLICY_VIOLATION',
          reason: `Segregation of Duties violation: maker cannot be checker.`,
        };
      }

      // Fallback: block if roleRegistry indicates a restricted checker-only role
      if (makerRole && (makerRole.titleNormalized.toUpperCase() === 'CHECKER')) {
        return {
          status: 'REJECTED_POLICY_VIOLATION',
          reason: `Restricted Role Violation: '${makerRole.titleNormalized}' is a checker-only role and cannot initiate maker actions.`,
        };
      }
    }

    return { status: 'AUTO_APPROVED_FOR_EXECUTION' };
  }

  private findAmountInPayload(payload: any): number | null {
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.amount === 'number') return payload.amount;
    
    // Recursive search for 'amount' key
    for (const key in payload) {
      if (typeof payload[key] === 'object') {
        const found = this.findAmountInPayload(payload[key]);
        if (found !== null) return found;
      }
    }
    return null;
  }

  private async enqueueForReview(intent: ActionIntent, reason: string) {
    return prisma.actionIntentQueue.create({
      data: {
        tenantId: intent.tenantId,
        roleId: intent.roleId,
        taskId: intent.taskId,
        proposedPayload: intent.proposedPayload as any,
        confidenceScore: intent.confidenceScore,
        makerIdentity: intent.makerIdentity,
        status: "PENDING",
        reviewReason: reason,
        fourEyesRequirementMet: false
      }
    });
  }

  public async getPendingQueue() {
    return prisma.actionIntentQueue.findMany({
      where: { status: 'PENDING' }
    });
  }

  public async resolveReview(intentId: string, decision: 'APPROVE' | 'REJECT', humanId: string) {
    const item = await prisma.actionIntentQueue.findUnique({ where: { id: intentId } });
    if (!item) return null;

    // Maker and Checker MUST be different identities (Strict 4-Eyes)
    if (item.makerIdentity === humanId) {
      throw new Error("4-Eyes Violation: Maker and Checker cannot be the same person.");
    }

    return prisma.actionIntentQueue.update({
      where: { id: intentId },
      data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        checkerIdentity: humanId,
        fourEyesRequirementMet: decision === 'APPROVE'
      }
    });
  }
}
