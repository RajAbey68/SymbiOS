import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { bootstrap } from './bootstrap'; // Mandatory 4-Eyes Bootstrap
import { fourEyesMiddleware } from './middleware/FourEyesMiddleware'; // Compliance Middleware
import { roleRouter } from './routes/roleRoutes';
import { synthesisRouter } from './routes/synthesisRoutes';
import { executionRouter } from './routes/executionRoutes';
import { pipelineRouter } from './routes/pipelineRoutes';
import { automationRouter } from './routes/automationRoutes';
import { server as mcpServer } from './mcp';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// Load environment variables (.env should include GEMINI_API_KEY)
dotenv.config();

// Initialize Global 4-Eyes Governance
bootstrap();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use('/governance', express.static('public'));

// ── SymbiOS HyperAutomation API ─────────────────────────────────
app.use('/api/v1/roles', roleRouter);
app.use('/api/v1/synthesis', synthesisRouter);
app.use('/api/v1/execution', fourEyesMiddleware, executionRouter); // 4-Eyes Protected
app.use('/api/v1/pipeline', fourEyesMiddleware, pipelineRouter);   // 4-Eyes Protected
app.use('/api/v1/automation', fourEyesMiddleware, automationRouter); // 4-Eyes Protected

// ── MCP Integration (Secure Enterprise Bridge) ────────────────
let sseTransport: SSEServerTransport | null = null;

app.get('/mcp/sse', async (req, res) => {
  sseTransport = new SSEServerTransport("/mcp/messages", res as any);
  await mcpServer.connect(sseTransport);
});

app.post('/mcp/messages', async (req, res) => {
  if (sseTransport) {
    await sseTransport.handlePostMessage(req, res as any);
  } else {
    res.status(503).json({ error: "MCP SSE Transport not initialized" });
  }
});

// ── BMAD Standard Healthcheck ──────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'SymbiOS-HyperAutomation',
    version: '1.0.0',
    endpoints: {
      roles: '/api/v1/roles',
      synthesis: '/api/v1/synthesis',
      execution: '/api/v1/execution',
      pipeline: '/api/v1/pipeline/run',
      mcp: '/mcp/sse'
    }
  });
});

app.listen(PORT, () => {
  console.log(`[SymbiOS] HyperAutomation Engine running on http://localhost:${PORT}`);
  console.log(`[SymbiOS] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SymbiOS] Pipeline: POST /api/v1/pipeline/run`);
  if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is missing. LLM endpoints will error out.");
  }
});
