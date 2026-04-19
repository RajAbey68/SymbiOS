/**
 * Model Context Protocol (MCP) Bindings for the Antigravity Opal integrations.
 * Mocking Workday and ServiceNow enterprise endpoints.
 */

export interface MCPResource {
  uri: string; // e.g., mcp://workday/users/{id}
  name: string;
  description: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object; // JSON Schema for the tool inputs
}

export const MockEnterpriseTools: MCPTool[] = [
  {
    name: "workday_get_role_competencies",
    description: "Fetches structured HR competency data for a given role ID.",
    inputSchema: {
      type: "object",
      properties: {
        roleId: { type: "string" }
      },
      required: ["roleId"]
    }
  },
  {
    name: "servicenow_get_ticket_log_telemetry",
    description: "Retrieves a backlog of closing logs associated with tasks to derive 'Work Intelligence'.",
    inputSchema: {
      type: "object",
      properties: {
        assignmentGroup: { type: "string" },
        limit: { type: "number" }
      },
      required: ["assignmentGroup"]
    }
  }
];
