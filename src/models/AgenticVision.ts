export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface VisionAction {
  actionType: "CLICK" | "TYPE" | "SCROLL" | "WAIT";
  targetElementDescription: string;
  coordinates?: BoundingBox;
  inputPayload?: string; // If 'TYPE'
}

export interface AgenticVisionTelemetry {
  telemetryId: string;
  timestamp: string;
  originatingUserIdentity: string;
  
  /** The raw screenshot binary reference in Vertex AI Data Stores */
  frameReferenceUri: string;
  
  /** The "Think/Observe" output from Gemini 3 Flash */
  modelObservation: string;
  
  /** The derived action intention */
  inferredAction: VisionAction;
}
