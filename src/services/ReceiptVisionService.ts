import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export const receiptExtractionSchema = z.object({
  vendorName: z.string(),
  date: z.string(),
  totalAmount: z.number(),
  taxAmount: z.number().optional(),
  currency: z.string().default('EUR'),
  categorySuggestion: z.string(),
  confidence: z.number(),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export class ReceiptVisionService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({}); // Relies on GEMINI_API_KEY
  }

  /**
   * Processes a receipt image (base64 or URL) and extracts financial data.
   */
  public async extractReceiptData(imageContent: string, mimeType: string = 'image/jpeg'): Promise<ReceiptExtraction> {
    const prompt = `
      You are the SymbiOS Receipt Analysis Agent.
      Analyze the provided receipt image and extract the following information into a strict JSON format:
      1. Vendor Name
      2. Transaction Date (try to format as YYYY-MM-DD)
      3. Total Amount (as a number)
      4. Tax Amount (if visible, as a number)
      5. Currency (standard 3-letter code, e.g. EUR, USD)
      6. Category Suggestion (e.g., Cleaning, Maintenance, Utilities, Office Supplies, Travel)
      7. Confidence score (0.0 to 1.0)
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageContent,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      if (!result.text) {
        throw new Error("Gemini returned an empty vision response.");
      }

      const rawJson = JSON.parse(result.text);
      return receiptExtractionSchema.parse(rawJson);
    } catch (error: any) {
      console.error("[ReceiptVisionService] Vision Extraction Failed:", error);
      throw error;
    }
  }
}
