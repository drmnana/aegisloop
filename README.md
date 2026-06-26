# AegisLoop

AegisLoop is a secure collaboration engine where human teams and AI agents work together inside customer controlled project memory, with roles, workflows, human approvals, decision logs, and audit trails.

This repository is intentionally prepared for Phase 1 only.

Phase 1 is a local vertical slice that proves the core workflow:

Draft → Critique → Revise → Human Approve

## Current instruction

Codex should read these files before writing code:

1. `prompts/codex-phase-1-final-prompt.md`
2. `docs/phase-1-build-spec.md`
3. `docs/architecture.md`
4. `docs/roadmap.md`
5. `docs/non-goals.md`

## Critical rule

Build Phase 1 as a real working vertical slice. Treat later phases as design constraints, not implementation tasks.

Do not implement GitHub, S3, SharePoint, Google Drive, Claude, Gemini, SSO, billing, Temporal, embeddings, or enterprise deployment in Phase 1.

## Phase 1 success definition

A developer can run the app locally and demonstrate:

1. A user opens a project room.
2. The user starts Draft, Critique, Revise, Human Approve workflow.
3. The workflow advances exactly one step per `/api/workflows/runNext` call.
4. The workflow persists state between steps.
5. The workflow pauses for human approval.
6. The human approves.
7. The approved output is written to local disk.
8. The Decision table stores a path or reference, not the full approved output text.
9. A decision is created.
10. Audit events are visible.
11. Model calls are visible.
12. AI approval is impossible.
13. Automated tests use MockAIProvider and do not require OpenAI.
