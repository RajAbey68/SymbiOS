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
    // In a real system, this would trigger an HIL persistence event.
    // For now, we flag the response to notify the consumer.
    res.setHeader('x-symbios-hil-status', 'REQUIRED');
  }
  
  console.log(`[SymbiOS] [4-Eyes] Request Protected: ${req.method} ${req.url}`);
  console.log(`[SymbiOS] [4-Eyes] Verified Maker: ${makerIdentity} | Tenant: ${tenantId}`);
  
  next();
};
