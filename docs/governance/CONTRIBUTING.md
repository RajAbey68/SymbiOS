# Antigravity (AG): Contribution & Governance Standards

All modifications to this codebase are bound by the global AG rules enforced by the OpenClaw / Gravity Claw architectural layers.

## 1. The 4-Eyes Principle
No PR may be merged without explicit approval from at least **two** parties. 
1. **Reviewer #1 (The Architect):** Usually the Antigravity agent or primary developer writing the implementation.
2. **Reviewer #2 (The Human Gatekeeper):** A second distinct human actor or lead engineer must provide a formal 'Approve' review.
*Our CI pipelines actively block merges until this 2-reviewer count is met on the PR.*

## 2. BMAD Workflow Standards
We enforce **BMAD** principles via our `.github/workflows/bmad-preflight.yml` pipeline:
- Every build runs dependency vulnerability audits.
- Every build runs strict AST linting and static analysis.
- **Rollback Contracts:** No branch can be merged if the operational configuration lacks a defined `fallback_state` or blue/green toggle.

## 3. EU AI Act Compliance
High-stake execution requires oversight.
Modifying files in `/policies/`, `/models/`, and `/deployments/` requires sign-off from `@compliance-officers` per the `CODEOWNERS` file. 
Our release pipelines hash output artifacts to an immutable audit ledger (`provenance.json`) and enforce an explicit click-to-release (Human-in-the-Loop) deployment interceptor.
