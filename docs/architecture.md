# AegisLoop Architecture

## Product thesis

AegisLoop is a secure collaboration engine where human teams and AI agents work together inside controlled project workflows, with human approvals, decision logs, audit trails, and customer controlled project memory.

## Core principle

AegisLoop is not a data warehouse. It is the orchestration layer between:

1. The customer's people
2. The customer's AI systems
3. The customer's storage systems
4. The customer's approval process
5. The customer's project memory

## Honest data model

Do not claim pure zero content storage.

The honest architecture is:

1. Customer selected storage is the long term system of record.
2. AegisLoop may keep operational data needed to run workflows.
3. AegisLoop may keep temporary content cache if configured.
4. AegisLoop may keep indexes or embeddings if configured in future phases.
5. AegisLoop stores audit metadata.
6. AegisLoop avoids storing sensitive customer content in audit logs by default.

## Data sensitivity classification

1. Customer source content: high sensitivity
2. Temporary operational cache: high sensitivity
3. Embeddings and derived indexes: medium to high sensitivity
4. Audit metadata: medium sensitivity
5. Billing and account metadata: medium sensitivity
6. Provider secrets: high sensitivity

Embeddings are not harmless metadata. They may leak or partially reconstruct information. Future embedding and cache features must be separately disableable.

## Control plane, data plane, operational plane

### Control plane

Stores account, organization, billing, licensing, integration, provider, and non sensitive audit metadata.

### Customer data plane

The customer's chosen system of record for approved artifacts and long term content.

### Operational plane

Stores workflow state, temporary working context, model call records, hot cache when enabled, and execution metadata.

## Storage architecture

Storage providers must expose storage primitives only.

Do not put decision log or project memory domain logic inside storage providers.

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

## Phase 1 storage

Implement LocalDiskProvider only.

LocalDiskProvider should support BlobStore:

```text
readBlob()
writeBlob()
deleteBlob()
listBlobs()
getBlobMetadata()
```

Do not implement MemoryStore.
Do not implement AuditSink.
Audit is Postgres in Phase 1.

## Workflow architecture

Phase 1 uses a Postgres backed workflow state machine behind a WorkflowEngine interface.

Do not use Temporal in Phase 1.

Temporal is a future upgrade when workflows become long running, multi day, high retry, high fan out, or need durable replay.

## Workflow runner

Implement `/api/workflows/runNext`.

This endpoint advances exactly one workflow step per call.

It must not loop through all remaining AI steps in one request.

The workflow must persist state in Postgres and be resumable from persisted database state.

## Approval rule

AI agents may draft, critique, revise, score, or recommend approval.

AI agents cannot approve final outputs.

Only a human with approval permission can approve final outputs or decisions.
