export interface SafetyThresholds {
  harassment: "BLOCK_NONE" | "BLOCK_LOW_AND_ABOVE" | "BLOCK_MEDIUM_AND_ABOVE" | "BLOCK_ONLY_HIGH";
  hateSpeech: "BLOCK_NONE" | "BLOCK_LOW_AND_ABOVE" | "BLOCK_MEDIUM_AND_ABOVE" | "BLOCK_ONLY_HIGH";
}

export interface GovernancePolicy {
  requiresApproval: boolean;
  approvalThresholdConfidence: number; // 0.0 - 1.0
  segregationOfDutiesEnforced: boolean;
  dollarLimit?: number;
  
  /** Mapped directly to Google AI Studio Safety Settings */
  aiStudioSafety: SafetyThresholds;

  /** The specific sequence the model must output to trigger the Antigravity review block. e.g., <HIL_APPROVAL_REQUIRED> */
  stopSequenceTrigger?: string;
}
