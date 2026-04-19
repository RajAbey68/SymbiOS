import { GoogleGenAI } from '@google/genai';
import { CanonicalRole } from '../models/CanonicalRole';

export class DeltaSynthesisService {
  private ai: GoogleGenAI;

  constructor() {
    // @ts-ignore - Defaults to process.env.GEMINI_API_KEY
    this.ai = new GoogleGenAI({}); 
  }

  /**
   * Evaluates the recorded Work Reality (telemetry) against the requested HR Intent.
   */
  public async computeRealityDelta(
    canonicalRole: CanonicalRole, 
    aggregatedTelemetryStr: string
  ): Promise<any> {
    
    const prompt = `
      You are the Antigravity Work Reality Engine.
      Compare the Documented HR Intent (CanonicalRole) against the actual recorded Agentic UI telemetry of physical work.
      
      Identify specific "Deltas":
      1. Shadow IT: Are they using tools not defined in the SOP/Intent (e.g., executing in Excel instead of SAP)?
      2. Missing Work: Are there tasks in the Intent they never performed?
      3. Process Deviation: Are they performing the task, but in an unauthorized flow?

      --- Documented Intent (CanonicalRole JSON) ---
      ${JSON.stringify(canonicalRole, null, 2)}

      --- Observed Reality (Agentic Vision Telemetry) ---
      ${aggregatedTelemetryStr}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Return ONLY a strict JSON object containing keys: shadowTasks (array), processDeviations (array), complianceWarnings (array). No markdown format.",
        }
      });

      if (!response.text) {
          throw new Error("Gemini returned an empty response.");
      }

      return JSON.parse(response.text);

    } catch (error) {
      console.error("[DeltaSynthesisService] Gemini Generation Failed:", error);
      throw error;
    }
  }
}
