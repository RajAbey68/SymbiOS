import { Request, Response, NextFunction } from 'express';

/**
 * SymbiOS 4-Eyes Compliance Middleware
 * 
 * Intercepts high-risk routes and ensures that any automated intent
 * produced is subject to HIL (Human-In-The-Loop) review before execution.
 * 
 * STRICT MODE: Rejects requests without x-maker-identity and x-tenant-id.
 */
export const fourEyesMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const makerIdentity = req.headers['x-maker-identity'];
  const tenantId = req.headers['x-tenant-id'];
  
  if (!makerIdentity || !tenantId) {
    console.error(`[SymbiOS] [4-Eyes] BLOCKED: Missing identity or tenant headers. Identity: ${makerIdentity}, Tenant: ${tenantId}`);
    return res.status(403).json({ 
      error: "Governance Violation", 
      message: "Requests to protected routes must include 'x-maker-identity' and 'x-tenant-id' headers." 
    });
  }

  // EU AI Act Compliance: Confidence Thresholding
  const agentConfidence = parseFloat(req.headers['x-agent-confidence'] as string || '1.0');
  const MIN_CONFIDENCE = 0.8;

  if (agentConfidence < MIN_CONFIDENCE) {
    console.warn(`[SymbiOS] [4-Eyes] HIL REQUIRED: Agent confidence ${agentConfidence} is below threshold ${MIN_CONFIDENCE}`);
    // Return 202 ACCEPTED (pending human review) — do NOT call next()
    res.status(202).json({
      status: 'PENDING_HUMAN_REVIEW',
      message: 'Low confidence execution. Awaiting human approval.',
    });
    return; // CRITICAL: Do not call next()
  }
  
  console.log(`[SymbiOS] [4-Eyes] Request Protected: ${req.method} ${req.url}`);
  console.log(`[SymbiOS] [4-Eyes] Verified Maker: ${makerIdentity} | Tenant: ${tenantId}`);
  
  next();
};
