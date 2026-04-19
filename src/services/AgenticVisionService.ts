import { AgenticVisionTelemetry } from '../models/AgenticVision';

export class AgenticVisionService {
  /**
   * Mocks the ingestion of visual UI telemetry from Gemini 3 Flash observation streams.
   * Compresses massive UI streams into actionable temporal blocks for the LLM Delta evaluation.
   */
  public aggregateSession(telemetryStream: AgenticVisionTelemetry[]): string {
    if (telemetryStream.length === 0) return "No telemetry provided.";

    // Sort by timestamp and condense actions
    const sorted = telemetryStream.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return sorted.map(t => {
      const action = t.inferredAction;
      return `[${t.timestamp}] User(${t.originatingUserIdentity}) performed ${action.actionType} on target: '${action.targetElementDescription}'. Model Observation: "${t.modelObservation}"`;
    }).join('\n');
  }
}
