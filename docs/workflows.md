# Workflows

## Phase 1 workflow

Draft → Critique → Revise → Human Approve

## Workflow runner rule

The workflow runner advances exactly one step per call.

Endpoint:

```text
/api/workflows/runNext
```

The endpoint must not loop through all AI steps in one request.

## Step statuses

Suggested statuses:

1. pending
2. running
3. completed
4. waiting_for_human
5. failed
6. cancelled
7. skipped

## Workflow run statuses

Suggested statuses:

1. pending
2. running
3. waiting_for_human
4. completed
5. failed
6. cancelled

## Human approval pause

Human approval pause is a persisted database state.

No in memory state should be required to resume the workflow.
