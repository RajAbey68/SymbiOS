# Antigravity Role-to-Agent OS: Google-Centric Domain Architecture

This document maps the core four-layer "Role-to-Agent" operating model specifically to the capabilities of Google AI Studio, Google Antigravity, Opal, and Agentic Vision.

## 1. Domain Mapping Summary

| OS Layer | Canonical Concept | Google Stack Implementation | Protocol / Data Exchange |
| :--- | :--- | :--- | :--- |
| **Role Intelligence** | Sourcing & Knowledge Grounding | **NotebookLM (Google Labs)** | RAG injection into `CanonicalRole` Context object. |
| **Work Intelligence** | Observability & Task Telemetry | **Agentic Vision (Gemini 3 Flash)** | Image matrices & bounding boxes parsed into `AgenticVisionTelemetry` arrays. |
| **Agentic Execution** | Orchestrator & Tool Caller | **Google Antigravity & Opal** | **Agent-to-Agent (A2A)** and **Model Context Protocol (MCP)** execution boundaries. |
| **Governance & HIL** | Policy & Human Controls | **AI Studio Safety Settings & Antigravity Policies** | System instructions emitting specific Stop Sequences mapping to the `Governance` schema. |

## 2. Component Capabilities

### **NotebookLM Integration (Contextual Grounding Engine)**
Instead of writing complex parsing pipelines from scratch, NotebookLM is treated as the foundational "Brain" for a specific role. 
*   **Action:** We upload thousands of PDFs (SOPs, employee handbooks) and raw text JDs into a NotebookLM workspace.
*   **Result:** The Antigravity OS queries NotebookLM via API to extract structured capabilities without hallucination, outputting directly to the `CanonicalRole` JSON schema.

### **Gemini 3 Flash "Think, Act, Observe" (Telemetry)**
Instead of relying strictly on traditional process mining logs, we utilize Gemini 3 Flash's Agentic Vision capabilities.
*   **Action:** The system ingests streams of desktop recordings or UI screenshots from task workers.
*   **Result:** Gemini 3 parses the specific buttons clicked, delays, and context switches into our `AgenticVision` JSON structure, acting as the ground-truth "Work Reality."

### **Antigravity & Agent-to-Agent (A2A)**
Antigravity is the host IDE and execution backend. It utilizes the Agent Manager to construct multi-agent networks.
*   **The Orchestrator:** The `Role-to-Agent Designer` is an Antigravity Agent. It designs workflows by passing structured A2A JSON payloads to specialized "Worker Agents."

### **Model Context Protocol (MCP) via Opal**
Opal handles the low-code connection blocks. We use MCP to standardize the schema for external tools.
*   **Action:** Exposing a `getEmployeePermissions` endpoint from Workday.
*   **Result:** Antigravity agents use the Opal MCP standard to verify if a user has the authority to approve a generated workflow.

### **AI Studio & Governance Stop Sequences**
Human-in-the-Loop is enforced at the model instruction level.
*   **Action:** The `Governance` schema defines strict approval thresholds. These are injected into the Gemini 3 System Prompt via AI Studio.
*   **Result:** When an agent infers a high-risk action, it intentionally generates an "A2A_STOP_SEQUENCE" which triggers an Antigravity Artifact Review Policy hook, pausing the agent permanently until a designated Human Architect clicks "Approve."
