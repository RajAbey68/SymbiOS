import { GoogleGenAI } from '@google/genai';
import { CanonicalRole, NotebookLMReference } from '../models/CanonicalRole';

export class RoleParserService {
  private ai: GoogleGenAI;

  constructor() {
    // This assumes process.env.GEMINI_API_KEY is available as per global AG rules
    // and initialized in server.ts
    // @ts-ignore - The constructor doesn't need explicit keys if process.env is set, but we handle it generically
    this.ai = new GoogleGenAI({}); 
  }

  /**
   * Executes the Role-to-Agent Translation Prompt
   */
  public async parseJobDescription(
    rawText: string, 
    notebookDeltas: NotebookLMReference[]
  ): Promise<CanonicalRole | null> {
    
    const contextStr = notebookDeltas.map(d => `[${d.documentId}]: "${d.sourceTextExcerpt}"`).join('\n');
    
    const prompt = `
      You are the Antigravity Role Intelligence Engine.
      Translate the following textual Job Description into a Canonical Role Object JSON schema.
      Pay specific attention to the "Grounded Truth" SOPs extracted from NotebookLM below. If the JD contradicts the SOP, defer to the SOP and classify the automation accordingly.

      --- Grounded Truth (NotebookLM) ---
      ${contextStr}

      --- Raw JD Input ---
      ${rawText}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          // Mocks the exact CanonicalRole interface structure for the output.
          // In a real execution, we would map the actual Type Definition Object directly into Google GenAI schemas.
          systemInstruction: "You MUST return ONLY a JSON object that satisfies the CanonicalRole interface matching our Antigravity standards. Do not include markdown formatting.",
        }
      });

      if (!response.text) {
          throw new Error("Gemini returned an empty response.");
      }

      const parsed: CanonicalRole = JSON.parse(response.text);
      return parsed;

    } catch (error) {
      console.error("[RoleParserService] Gemini Generation Failed:", error);
      throw error;
    }
  }
}
