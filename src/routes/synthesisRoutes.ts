import { Router, Request, Response } from 'express';
import { ArsExtractorService } from '../services/ars-extractor.service';

export const synthesisRouter = Router();
const extractorService = new ArsExtractorService();

synthesisRouter.post('/ars', async (req: Request, res: Response) => {
  try {
    const { jobDescription, businessProcess } = req.body;
    
    if (!jobDescription || !businessProcess) {
      return res.status(400).json({ error: "Missing required fields (jobDescription, businessProcess)" });
    }

    // 2-Stage Extract ARS
    const result = await extractorService.extractArs(
      jobDescription, 
      businessProcess
    );

    if (result && result.ars) {
      return res.status(201).json({
        summary: result.decompositionLog,
        specification: result.ars
      });
    } else {
        return res.status(500).json({ error: "Synthesis Service failed to generate a valid ARS schema." });
    }

  } catch (error: any) {
    return res.status(500).json({ error: "ARS Synthesis Execution Error", details: error.message });
  }
});
