import { GoogleGenAI } from '@google/genai';
import { AgentRequirementSpecification, agentRequirementSpecificationSchema } from '../types/ARS';

export class ArsExtractorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({}); // Relies on GEMINI_API_KEY
  }

  /**
   * 2-Stage Pipeline to extract ARS from unstructured JD and SOP
   */
  public async extractArs(
    jobDescription: string, 
    businessProcess: string
  ): Promise<{ ars: AgentRequirementSpecification; decompositionLog: string }> {
    
    // ----------------------------------------------------
    // STAGE 1: DECOMPOSITION AGENT
    // ----------------------------------------------------
    const decompositionPrompt = `
      You are the Antigravity Decomposition Agent for Accounting & Finance.
      Your job is to read the Job Description and Business Process (SOP) below and break them into:
      1. Role Identity and Accountability
      2. Atomic capability and tool requirements (e.g. NetSuite API, Postgres)
      3. Precise sequential steps with triggers
      4. Governance constraints:
         - Segregation of Duties (Maker-Checker needed?)
         - Dollar Limits (Financial thresholds)
         - EU AI Act Risk Tier: 
            * HIGH_RISK: If the agent makes credit decisions, HR/recruitment cuts, or interacts with critical financial infrastructure.
            * LIMITED_RISK: If it involves chatbots/transparency.
            * MINIMAL_RISK: Low-level administrative automation.
      
      --- Job Description ---
      ${jobDescription}

      --- Business Process (SOP) ---
      ${businessProcess}

      Return a detailed markdown analysis that maps these constraints out explicitly so that the Architect Agent can seamlessly convert them to structured JSON.
    `;

    let decompositionLog = "";
    try {
      const decompResponse = await this.ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: decompositionPrompt,
      });
      decompositionLog = decompResponse.text || "No decomposition generated.";
    } catch (e: any) {
        console.error("Decomposition Agent Failed:", e);
        throw new Error("Failed at Decomposition Stage: " + e.message);
    }

    // ----------------------------------------------------
    // STAGE 2: ARCHITECT AGENT
    // ----------------------------------------------------
    const architectPrompt = `
      You are the Antigravity Architect Agent.
      Map the following decomposed tasks onto the strict Agent Requirement Specification JSON schema.
      
      CRITICAL COMPLIANCE:
      - governance.euAiActRiskTier: MUST be "HIGH", "LIMITED", or "MINIMAL" based on the analysis.
      - governance.segregationOfDuties: Enforce "true" for any task involving financial disbursement or ledger modifications.
      
      --- Decomposition Log ---
      ${decompositionLog}
    `;

    try {
      const architectResponse = await this.ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: architectPrompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You MUST return ONLY a strict JSON object that satisfies the AgentRequirementSpecification schema exactly (roleIdentity, capabilities, executionWorkflows, governance, performanceSLAs). Ensure you map identified financial thresholds to governance.hitlThresholds.dollarLimit as a number. Do not include markdown 'json' blocks. Just the raw JSON object.",
        }
      });

      if (!architectResponse.text) {
          throw new Error("Architect returned an empty response.");
      }

      const rawJson = JSON.parse(architectResponse.text);

      // ----------------------------------------------------
      // STAGE 3: STRICT ZOD VALIDATION
      // ----------------------------------------------------
      const validatedArs = agentRequirementSpecificationSchema.parse(rawJson);

      return {
          ars: validatedArs,
          decompositionLog
      };

    } catch (error: any) {
      console.error("[ArsExtractorService] Architect / Zod Validation Failed:", error.errors || error);
      throw error;
    }
  }
}
