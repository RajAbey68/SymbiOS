export interface ActionIntent {
  intentId: string;
  tenantId: string;
  roleId: string;
  taskId: string;
  proposedPayload: any;
  confidenceScore: number;
  makerIdentity: string;
  timestamp: string;
}

export class AgentRunnerService {
  /**
   * Creates an intent representing an agent wanting to execute an action.
   */
  public createIntent(
    tenantId: string, 
    roleId: string, 
    taskId: string, 
    makerIdentity: string,
    proposedPayload: any,
    confidenceScore: number = 0.9
  ): ActionIntent {
    return {
      intentId: `intent-${Math.random().toString(36).substring(2, 9)}`,
      tenantId,
      roleId,
      taskId,
      proposedPayload,
      confidenceScore,
      makerIdentity,
      timestamp: new Date().toISOString()
    };
  }
}
