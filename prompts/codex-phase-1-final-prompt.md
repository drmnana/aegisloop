# Codex Phase 1 Final Prompt

You are Codex acting as a senior full stack architect, principal engineer, and implementation agent.

Project name: AegisLoop

## Important instruction about roadmap versus implementation

You will receive a full product roadmap for AegisLoop.

The roadmap is reference material only.

For this run, you must implement Phase 1 only.

Do not implement Phase 2, Phase 3, Phase 4, or later features.

Do not create fake integrations for future phases.

Do not create empty modules just because the roadmap mentions them.

Do not build GitHub, S3, SharePoint, Google Drive, Claude, Gemini, SSO, billing, Temporal, embeddings, or enterprise deployment in Phase 1.

If a future phase affects Phase 1 architecture, create a clean interface or documentation note only.

If there is a conflict between the roadmap and the Phase 1 build spec, the Phase 1 build spec wins.

The roadmap should help you avoid architectural dead ends, not expand the Phase 1 scope.

Build Phase 1 as a real working vertical slice. Treat all later phases as design constraints, not implementation tasks.

## Core product thesis

AegisLoop is a secure collaboration engine where human teams and AI agents work together inside customer controlled project memory, with roles, workflows, human approvals, decision logs, and audit trails.

This is not a chatbot.
This is not a generic AI wrapper.
This is not a multi AI chatroom.
This is not a toy demo.

It is a project collaboration platform where humans and AI agents participate in controlled workflows, while the customer’s chosen storage remains the long term system of record.

## Important architecture principle

Build the architecture for the full enterprise vision, but only implement Phase 1 in code.

Do not create a giant empty skeleton.
Do not create fake integrations.
Do not build 20 half working modules.
Do not pretend future providers are complete.

The code must prove the core thesis through one real working path.

## Phase 1 goal

A developer should be able to run the app locally and demonstrate:

1. Create an organization
2. Create a workspace
3. Create a project
4. Open a project thread
5. Run a controlled AI workflow
6. Pause for human approval
7. Approve or reject as a human
8. Save approved output to local disk
9. Create a decision log entry
10. Create audit events for every important action
11. Show model call records with provider, model, step, token estimate, cost estimate, and status
12. Verify AI agents cannot approve final outputs

## First workflow

Implement this exact workflow:

Draft
Critique
Revise
Human Approve

Workflow behavior:

1. A human user creates a project and thread.
2. The user starts the workflow with an objective.
3. The Draft AI agent creates an initial draft.
4. The Critique AI agent critiques the draft.
5. The Revise AI agent creates a revised output.
6. The workflow pauses for human approval.
7. A human with approval authority approves or rejects.
8. If approved, the final output is saved through LocalDiskProvider.
9. If approved, a decision log entry is created.
10. Every step creates audit events.
11. Every AI call creates a model call record.
12. AI agents may recommend approval but cannot approve.

Only humans can approve final outputs, final decisions, or approved project memory.

## Critical correction about storage and memory

Do not put decision log or project memory domain logic inside the storage provider interface.

Storage providers must expose storage primitives only.

Decision log logic belongs in a domain service.
Project memory logic belongs in a domain service.
Approval logic belongs in a domain service.
Workflow logic belongs in a domain service.
Audit logic belongs in a domain service.

Bad design:

```text
LocalDiskProvider.appendDecision()
S3Provider.appendApprovedFact()
GitHubProvider.readDecisionLog()
```

Good design:

```text
DecisionLogService uses a storage provider when it needs to persist an approved artifact.
MemoryService uses storage primitives when needed.
Storage providers only read, write, list, delete, and report capabilities.
```

## Storage provider architecture

Use capability based storage interfaces.

For Phase 1, implement only LocalDiskProvider.

LocalDiskProvider should support BlobStore.

BlobStore interface:

```text
readBlob()
writeBlob()
deleteBlob()
listBlobs()
getBlobMetadata()
```

Future architecture may include:

VersionedStore
SearchIndexStore

Do not implement those in Phase 1 unless absolutely needed.

Do not implement MemoryStore.
Do not implement AuditSink.
Do not put audit as a storage provider capability in Phase 1.

Audit is stored in Postgres in Phase 1.

Future storage providers to document only:

GitHub
GitLab
S3
Azure Blob
SharePoint
Google Drive
OneDrive
Box
Private database

GitHub future behavior:

Document that GitHub may later become a first class memory backend for technical teams.

GitHub backed projects may later store structured project memory in paths such as:

project memory summary
decision log
open questions
approved facts
workflow files
output files
thread summaries
task files

AI proposed changes may later become branches and pull requests.

Do not implement GitHub in Phase 1.

## Zero content storage correction

Do not claim pure zero content storage in the technical architecture.

The honest architecture is:

1. Customer selected storage is the long term system of record.
2. AegisLoop may keep operational data needed to run workflows.
3. AegisLoop may keep temporary content cache if configured.
4. AegisLoop may keep indexes or embeddings if configured.
5. AegisLoop stores audit metadata.
6. AegisLoop should avoid storing sensitive customer content in audit logs by default.

Classify data sensitivity clearly in documentation:

1. Customer source content is high sensitivity.
2. Temporary operational cache is high sensitivity.
3. Embeddings and derived indexes are medium to high sensitivity because they may leak or partially reconstruct information.
4. Audit metadata is medium sensitivity.
5. Billing and account metadata is medium sensitivity.
6. Provider secrets are high sensitivity.

Caching and embeddings must be separately disableable in the future architecture.

For Phase 1, do not implement embeddings.

## Workflow engine direction

Do not use Temporal in Phase 1.

Implement a Postgres backed workflow state machine behind a WorkflowEngine interface.

The workflow state machine must support:

1. Starting a workflow run
2. Creating workflow steps
3. Running AI steps in order
4. Recording model calls
5. Pausing for human approval
6. Resuming after approval or rejection
7. Marking workflow run status
8. Recording errors
9. Recording audit events

Temporal should be documented as a future Phase 4 upgrade when workflows become long running, multi day, cross provider, high retry, high fan out, or require durable replay at scale.

Do not use BullMQ for Phase 1 unless a simple background task is absolutely needed.

Keep the workflow simple and reliable.

## Workflow runner

Do not run the entire Draft, Critique, Revise, Human Approve workflow synchronously inside one long API request.

The workflow must run as a persisted step based state machine.

For Phase 1, implement a simple step runner using an internal API endpoint:

```text
/api/workflows/runNext
```

This endpoint must advance exactly one workflow step per call.

It must not loop through all remaining AI steps in one request.

A development button in the UI may call this endpoint to run the next pending step.

Each call should:

1. Load the workflow run from Postgres
2. Find the next valid pending step
3. Check current status
4. Check cost and call limits
5. Execute only that step
6. Persist the step output
7. Persist model call metadata
8. Create audit events
9. Update workflow and step status
10. Return control to the caller

If the next state is waiting_for_human, the endpoint must stop and return without making more AI calls.

The frontend must not wait for the entire Draft, Critique, Revise workflow in one blocking request.

The workflow must be resumable from persisted database state.

The human approval pause is represented by a persisted status such as:

```text
waiting_for_human
```

The resume endpoint should approve or reject the pending approval and then advance or close the workflow.

Do not rely on in memory workflow state.
Do not lose workflow progress if the request ends.

## Technology stack

Use this stack unless the existing repository clearly requires something else:

1. Next.js
2. TypeScript
3. PostgreSQL
4. Prisma
5. Tailwind CSS
6. OpenAI API as the first AI provider
7. Local disk as the first storage provider
8. Vitest or Jest for tests

Use environment variables for the OpenAI API key in Phase 1.

Do not create a provider credential table yet.
Do not build encrypted multi level credential management yet.
Document it as a future requirement.

## AI provider architecture

Create an AIProvider interface.

For Phase 1, implement OpenAIProvider only.

Required method:

```text
sendMessage()
```

Optional lightweight helpers:

```text
estimateTokens()
estimateCost()
```

Do not implement streaming.
Do not implement structured output.
Do not implement listModels.
Do not implement Anthropic.
Do not implement Gemini.
Do not fake provider integrations.

Future providers should be documented only:

Anthropic Claude
Google Gemini
Azure OpenAI
Local OpenAI compatible endpoint
Private enterprise LLM endpoint

Automated tests must not call the real OpenAI API.

Use a MockAIProvider for tests.

The MockAIProvider should return deterministic outputs for:

Draft step
Critique step
Revise step

Only manual local integration testing should use the real OpenAIProvider.

Tests should work without an OpenAI API key.

## AI agent model

AI agents are participants, but they are not legal or final approvers.

Each AI agent should have:

ID
Name
Role
Provider
Model
System prompt
Can draft
Can critique
Can revise
Can recommend approval
Cannot final approve

Implement three default AI agents:

Draft Agent
Critique Agent
Revise Agent

They may all use the same OpenAI provider and model for now, but they must have different roles and system prompts.

## Human roles for Phase 1

Do not build a full permission builder yet.

Hardcode only the roles needed for Phase 1:

Owner
Admin
Editor
Approver
Viewer

Implement permission checks for:

Create project
Start workflow
View workflow
Approve output
Reject output
View audit log
View decision log

AI agents must fail permission checks if they attempt final approval.

Future role builder should be documented, not implemented.

## Database models

Create Prisma models for only the needed Phase 1 slice.

Required models:

Organization
User
Membership
Workspace
Project
Thread
Message
Agent
WorkflowRun
WorkflowStep
ModelCall
Approval
Decision
AuditEvent

Do not add these models yet unless absolutely needed:

Role
Permission
Evaluation
MemorySnapshot
FileReference
StorageProviderConfig
ProviderCredential

Those are future architecture items.

## Workflow outputs and messages

Draft, Critique, and Revise outputs should be stored as workflow step outputs or workflow artifacts linked to WorkflowStep.

They may be surfaced in the thread UI as system or agent messages, but they should not be treated only as ordinary chat messages.

The source of truth for workflow outputs is the WorkflowStep or related workflow artifact record.

## Decision log

The decision log is a core product feature.

Implement it seriously.

Each decision should include:

ID
Organization ID
Workspace ID
Project ID
Title
Approved output reference or storage path
Status
Proposed by
Approved by human user
Workflow run ID
Supersedes decision ID if applicable
Superseded by decision ID if applicable
Created timestamp
Approved timestamp

Statuses:

proposed
approved
rejected
superseded
archived

Only a human can move a decision to approved.

## Decision content rule

The approved output must be written to LocalDiskProvider through the BlobStore interface.

The Decision row must store a reference or path to the approved output, not the full approved output content.

The decision log should prove the product thesis:

Postgres stores the decision metadata.
Customer selected storage stores the approved content.

Do not dump the final approved output text directly into the Decision table.

## Audit logging

Audit logging is a core product feature.

Implement audit events in Postgres.

Audit events should be append only from the application perspective.

Record audit events for:

Organization created
Workspace created
Project created
Thread created
Message created
Workflow started
Workflow step started
Workflow step completed
AI model called
Workflow paused for approval
Approval created
Approval approved
Approval rejected
Decision created
Decision approved
Output saved to storage
Permission denied
Workflow failed

AuditEvent fields should include:

ID
Organization ID
Workspace ID when available
Project ID when available
Actor type
Actor ID
Action
Target type
Target ID
Workflow run ID when available
Workflow step ID when available
Provider when available
Model when available
Estimated tokens when available
Estimated cost when available
Result
Error code when available
Created timestamp

Do not store sensitive prompt text or full document content in audit logs by default.

## Model call records

Create ModelCall records for every AI call.

Fields:

ID
Organization ID
Project ID
Workflow run ID
Workflow step ID
Agent ID
Provider
Model
Input reference or short non sensitive summary
Output reference or short non sensitive summary
Estimated input tokens
Estimated output tokens
Estimated cost
Latency
Status
Error message if failed
Created timestamp

## Frontend pages for Phase 1

Build only the pages needed to demonstrate the product.

Required pages:

Project room
Workflow run page
Approval inbox
Decision log
Audit log viewer

The project room should show:

Project objective
Thread messages
AI agents
Start workflow button
Run next workflow step button for development
Workflow runs
Pending approvals
Recent decisions
Recent audit events

Do not build landing page.
Do not build billing page.
Do not build full admin console.
Do not build integration settings page.
Do not build role builder UI.
Do not build agent marketplace.

## Documentation

Create documentation for the full architecture vision, but keep the code focused.

Required docs:

README.md
docs/architecture.md
docs/control-plane-data-plane.md
docs/storage-capabilities.md
docs/workflows.md
docs/decision-log.md
docs/audit-logging.md
docs/security-notes.md
docs/roadmap.md

The roadmap should include Phase 1, Phase 1.5 validation gate, and possible Phase 2 paths based on user feedback.

## Security rules

Secrets must never be exposed to the frontend.
OpenAI API key must come from environment variables in Phase 1.
Audit logs must avoid sensitive content.
AI cannot approve.
Human approval must be enforced server side.
Tenant isolation must be included in all queries.
Use organization ID and project ID checks consistently.
Do not rely only on frontend checks.

## Testing requirements

Add tests for:

AI cannot approve final output
Human approver can approve
Viewer cannot approve
Workflow pauses for approval
Workflow resumes after approval
Audit event is created for workflow start
Audit event is created for approval
Decision is created only after approval
LocalDiskProvider writes approved output
ModelCall is recorded for AI step
Cost limit stops workflow if exceeded

## Cost limits

Implement basic cost and token controls.

WorkflowRun should have:

Max AI calls
Max estimated tokens
Max estimated cost

If a limit is exceeded, stop the workflow and mark it failed or waiting for human review.

Do not overbuild exact token accounting.
Use provider estimates where available and simple approximation where not available.

Cost and call limit tests may use artificial low limits.

For example:

Set max AI calls to 1 in a test workflow.
Verify the workflow stops before completing all three AI steps.

Do not remove cost limit tests just because the default workflow only has three AI calls.

## Implementation sequence

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

Do not build the UI first.
Do not create pages that are not backed by working services.
Do not create fake provider integrations.
Do not create placeholder workflows that cannot run.

End to end integrity is more important than breadth.

## Development instructions

Before writing code:

1. Inspect the current repository.
2. Identify the existing stack.
3. If the repository is empty, create the app structure.
4. Write a brief implementation note describing the chosen stack and folder structure.
5. Then implement the Phase 1 vertical slice.

Do not ask clarifying questions unless blocked.

Make reasonable assumptions and document them.

Do not implement future providers.
Do not implement Temporal.
Do not implement embeddings.
Do not implement full role builder.
Do not implement billing.
Do not implement SSO.
Do not implement landing page.
Do not implement fake enterprise integrations.

## Success definition

The app is successful for Phase 1 if a developer can run it locally and demonstrate this flow:

1. A user opens a project room.
2. The user starts Draft, Critique, Revise, Human Approve workflow.
3. The system calls OpenAI for the AI steps in local manual integration mode.
4. The automated tests use MockAIProvider and do not require OpenAI.
5. The workflow advances exactly one step per /api/workflows/runNext call.
6. The workflow persists state between steps.
7. The workflow pauses for human approval.
8. The human approves.
9. The approved output is written to local disk.
10. The Decision table stores a path or reference, not the full approved output text.
11. A decision is created.
12. Audit events are visible.
13. Model calls are visible.
14. AI approval is impossible.
15. The documentation clearly explains how this grows into the full enterprise architecture.

Build this as the first real foundation of AegisLoop.
