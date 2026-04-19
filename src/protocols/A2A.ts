/**
 * Agent-To-Agent (A2A) Payload standard for the Antigravity orchestrator.
 */
export interface A2AMessage {
  messageId: string;
  originatingAgentId: string;
  destinationAgentId: string;
  intent: "DECOMPOSE_ROLE" | "VERIFY_POLICY" | "DESIGN_OPAL_WORKFLOW" | "AWAIT_HUMAN_REVIEW";
  payload: any; // Context-dependent JSON
}
