import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SecureContractService } from "./SecureContractService";

const server = new McpServer({
  name: "Symbio HyperAutomation MCP",
  version: "1.0.0"
});

const contractService = new SecureContractService();

// Tool parameter schema for AP Clerk Invoice Submission
const invoiceParams = {
  roleId: z.string().describe("The CanonicalRole ID binding this agent"),
  taskId: z.string().describe("The CanonicalTask ID representing this AP Step"),
  vendorId: z.string(),
  amount: z.string().describe("Invoice amount as string"),
  invoiceNumber: z.string(),
  _agent_confidence: z.string().optional().describe("Agent confidence (0-1) as string")
};

// Tool callback — defined separately to keep types clean
async function handleInvoiceSubmission(args: {
  roleId: string;
  taskId: string;
  vendorId: string;
  amount: string;
  invoiceNumber: string;
  _agent_confidence?: string;
}) {
  const parsedArgs = {
    ...args,
    amount: parseFloat(args.amount),
    _agent_confidence: args._agent_confidence ? parseFloat(args._agent_confidence) : undefined
  };

  // Force strict Proxy Evaluation — Agent CANNOT bypass HIL
  const response = await contractService.evaluateMcpExecution(
    parsedArgs.roleId,
    parsedArgs.taskId,
    parsedArgs,
    "AP_CLERK_AGENT_V1",
    async () => {
      return { erpTransactionId: `TX-${Date.now()}` };
    }
  );

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }]
  };
}

// @ts-expect-error — Known Zod 3.25+ / MCP SDK deep type instantiation issue (TS2589)
// Runtime behaviour is correct; the SDK resolves the schema at runtime via zod-to-json-schema.
// See: https://github.com/modelcontextprotocol/typescript-sdk/issues/256
server.tool(
  "erp_submit_invoice",
  "Securely submits an invoice to the enterprise ERP backend via the Symbio HIL Gateway.",
  invoiceParams,
  handleInvoiceSubmission
);

export { server };
