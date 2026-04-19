import Anthropic from '@anthropic-ai/sdk';
import { CanonicalRole } from '../models/CanonicalRole';

export class BlueprintDesignerService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '', // defaults to process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Translates an automatable task from a CanonicalRole into an Executable DAG using Claude Prompt Caching.
   */
  public async generateBlueprint(canonicalRole: CanonicalRole, taskId: string): Promise<any> {
    const taskDef = canonicalRole.tasks.find(t => t.taskId === taskId);
    
    if (!taskDef) {
       throw new Error(`Task ${taskId} not found in the provided CanonicalRole`);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: "You are the Antigravity Role-to-Agent Designer. Your job is to generate a JSON DAG (Directed Acyclic Graph) blueprint for agents to execute the requested task. Follow rigorous compliance and Maker-Checker segregation rules.",
          },
          {
            type: "text",
            // We use cache_control on the massive CanonicalRole Context to leverage Prompt Caching!
            text: `--- GLOBAL CONTEXT & CANONICAL ROLE DEFINITION ---\n${JSON.stringify(canonicalRole, null, 2)}`,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [
          {
            role: "user",
            content: `Generate an execution DAG blueprint for task_id: ${taskId} (${taskDef.description}). Respond only with raw JSON representing the DAG nodes and edges with no markdown wrapping.`
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
         return JSON.parse(content.text);
      }
      throw new Error("Unexpected content format received from Anthropic.");

    } catch (error: any) {
      console.error("[BlueprintDesignerService] Claude Blueprint Generation Failed:", error);
      throw error;
    }
  }
}
