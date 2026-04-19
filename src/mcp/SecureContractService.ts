import { HilGatewayService } from '../services/HilGatewayService';
import { prisma } from '../prisma.config';
import { ActionIntent } from '../services/AgentRunnerService';
import { ErpConnectorService } from '../services/ErpConnectorService';

export class SecureContractService {
  private gateway = new HilGatewayService();
  private erp = new ErpConnectorService();

  public async evaluateMcpExecution(
    roleId: string, 
    taskId: string, 
    payload: any, 
    agentIdentity: string,
    executeCallback: () => Promise<any>
  ) {
    // 1. Authenticate the governance contract for this specific Task
    const role = await prisma.canonicalRole.findUnique({
      where: { id: roleId },
      include: { tasks: true }
    });

    if (!role) throw new Error("CanonicalRole not found in DB.");
    const taskDef = role.tasks.find((t: any) => t.id === taskId);
    if (!taskDef) throw new Error("CanonicalTask not found DB.");

    // AI Agents report their internal extraction confidence via MCP params
    const confidenceScore = payload._agent_confidence || 0.99; 

    const intent: ActionIntent = {
      intentId: `mcp-req-${Date.now()}`,
      tenantId: role.tenantId,
      timestamp: new Date().toISOString(),
      roleId,
      taskId,
      proposedPayload: payload,
      confidenceScore,
      makerIdentity: agentIdentity
    };

    // 2. Pass to the Gateway which checks Role constraints
    const decision = await this.gateway.evaluateIntent(intent, taskDef);

    if (decision.status === 'AUTO_APPROVED_FOR_EXECUTION') {
      // 3. EXECUTE THE ACTUAL ENTERPRISE CALL
      console.log(`[SymbiOS] [MCP] Governance PASSED for ${agentIdentity}. Forwarding to ERP...`);
      const erpResult = await this.erp.postTransaction(payload, role.tenantId, agentIdentity);
      
      // Also execute any side-effects provided in the callback
      const callbackResult = await executeCallback();
      
      return { 
        status: "success", 
        executed: true, 
        erp: erpResult,
        localResult: callbackResult 
      };
    } else {
      // 4. BLOCK EXECUTION AND ADD TO POSTGRES PENDING QUEUE
      console.warn(`[SymbiOS] [MCP] Governance BLOCKED for ${agentIdentity}. Reason: ${decision.reason}`);
      return { 
        status: "blocked", 
        executed: false, 
        message: `MCP Execution Blocked by SymbiOS Governance: ${decision.reason} - Queued for Human Review.`,
        queueId: decision.queueId
      };
    }
  }
}
