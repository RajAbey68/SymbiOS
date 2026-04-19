import { GovernancePolicy } from "./Governance";

export interface NotebookLMReference {
  documentId: string;
  sourceTextExcerpt: string;
  confidenceScore: number;
}

export interface CanonicalRoleTask {
  taskId: string;
  description: string;

  /** Derived from NotebookLM grounding */
  documentedIntent: NotebookLMReference[];

  /** Derived from Agentic Vision observations */
  observedRealityIds: string[];

  automationClassification: "FULLY_AUTOMATED" | "AGENT_ASSISTED" | "HUMAN_LED_AI_SUPPORTED" | "NON_AUTOMATABLE";
  
  /** The workflow block ID within Opal or the A2A DAG */
  opalWorkflowId?: string;

  hilPolicy: GovernancePolicy;
}

export interface CanonicalRole {
  roleId: string;
  titleNormalized: string;
  department: string;
  notebookLmWorkspaceId: string; 

  tasks: CanonicalRoleTask[];
  
  residualHumanSpecification: {
    primaryAccountabilities: string[];
    requiredJudgments: string[];
  };
}
