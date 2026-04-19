/**
 * Agent-To-Agent (A2A) Payload standard for the Symbio orchestrator.
 * Used for inter-agent communication within the HyperAutomation pipeline.
 */
export interface A2AMessage {
  messageId: string;
  originatingAgentId: string;
  destinationAgentId: string;
  intent: "DECOMPOSE_ROLE" | "VERIFY_POLICY" | "DESIGN_OPAL_WORKFLOW" | "AWAIT_HUMAN_REVIEW" | "EXTRACT_ARS" | "GENERATE_BLUEPRINT";
  payload: any; // Context-dependent JSON
}
