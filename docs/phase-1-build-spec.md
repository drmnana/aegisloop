# Phase 1 Build Spec

## Goal

Build the first local vertical slice of AegisLoop.

The goal is to prove that human users and AI agents can collaborate inside a controlled workflow with human approval, decision logging, audit logging, and local customer controlled storage.

## Required stack

Use this stack unless the existing repository clearly requires something else:

1. Next.js
2. TypeScript
3. PostgreSQL
4. Prisma
5. Tailwind CSS
6. OpenAI API as the first AI provider
7. Local disk as the first storage provider
8. Vitest or Jest for tests

## Required workflow

Implement this exact workflow:

Draft → Critique → Revise → Human Approve

## Workflow behavior

1. A human creates a project and thread.
2. The human starts the workflow with an objective.
3. The Draft Agent creates an initial draft.
4. The Critique Agent critiques the draft.
5. The Revise Agent creates a revised output.
6. The workflow pauses for human approval.
7. A human with approval authority approves or rejects.
8. If approved, the final output is saved through LocalDiskProvider.
9. If approved, a decision log entry is created.
10. Every step creates audit events.
11. Every AI call creates a ModelCall record.
12. AI agents cannot approve.

## Workflow runner

Implement an internal endpoint:

```text
/api/workflows/runNext
```

This endpoint must advance exactly one workflow step per call.

Each call must:

1. Load the workflow run from Postgres.
2. Find the next valid pending step.
3. Check status.
4. Check cost and AI call limits.
5. Execute only that step.
6. Persist step output.
7. Persist model call metadata.
8. Create audit events.
9. Update workflow and step status.
10. Return control to the caller.

If the next state is `waiting_for_human`, the endpoint must stop without making more AI calls.

## Required models

Create Prisma models for:

1. Organization
2. User
3. Membership
4. Workspace
5. Project
6. Thread
7. Message
8. Agent
9. WorkflowRun
10. WorkflowStep
11. ModelCall
12. Approval
13. Decision
14. AuditEvent

Do not create future models unless absolutely needed.

## Human roles

Hardcode only these roles for Phase 1:

1. Owner
2. Admin
3. Editor
4. Approver
5. Viewer

Implement permission checks for:

1. Create project
2. Start workflow
3. View workflow
4. Approve output
5. Reject output
6. View audit log
7. View decision log

## AI agents

Implement three default AI agents:

1. Draft Agent
2. Critique Agent
3. Revise Agent

They may all use the same OpenAI provider and model for Phase 1, but each must have a different role and system prompt.

## AI provider

Create an AIProvider interface.

Implement OpenAIProvider only.

Required method:

```text
sendMessage()
```

Optional helpers:

```text
estimateTokens()
estimateCost()
```

Tests must use MockAIProvider and must not call the real OpenAI API.

## Decision log

The Decision table stores decision metadata and the approved output reference or storage path.

It must not store the full approved output content.

The approved output must be written to LocalDiskProvider through BlobStore.

## Audit logging

Audit events are stored in Postgres.

Audit logs must avoid sensitive content by default.

Record audit events for:

1. Organization created
2. Workspace created
3. Project created
4. Thread created
5. Message created
6. Workflow started
7. Workflow step started
8. Workflow step completed
9. AI model called
10. Workflow paused for approval
11. Approval created
12. Approval approved
13. Approval rejected
14. Decision created
15. Decision approved
16. Output saved to storage
17. Permission denied
18. Workflow failed

## Frontend pages

Build only:

1. Project room
2. Workflow run page
3. Approval inbox
4. Decision log
5. Audit log viewer

The Project room should show:

1. Project objective
2. Thread messages
3. AI agents
4. Start workflow button
5. Run next workflow step button for development
6. Workflow runs
7. Pending approvals
8. Recent decisions
9. Recent audit events

## Tests

Add tests for:

1. AI cannot approve final output
2. Human approver can approve
3. Viewer cannot approve
4. Workflow pauses for approval
5. Workflow resumes after approval
6. Audit event is created for workflow start
7. Audit event is created for approval
8. Decision is created only after approval
9. LocalDiskProvider writes approved output
10. ModelCall is recorded for AI step
11. Cost limit stops workflow if exceeded

## Build sequence

Build depth first in this order:

1. Database schema and migrations
2. Core domain services
3. LocalDiskProvider
4. MockAIProvider
5. OpenAIProvider
6. WorkflowEngine interface
7. Postgres backed workflow state machine
8. Step runner and resume endpoint
9. Audit service
10. Approval service
11. Decision log service
12. Permission checks
13. Tests
14. Frontend pages
15. Documentation
