# Audit Logging

Audit logging is a core product feature.

Audit events are stored in Postgres in Phase 1.

Audit logs should be append only from the application perspective.

## Content safety

Do not store sensitive prompt text or full document content in audit logs by default.

Prefer references and IDs over sensitive text.

## Example good audit events

```text
User A started WorkflowRun 123.
Agent 3 created WorkflowStep output reference 991.
User B approved Approval 456.
Decision 789 was approved.
```

## Example bad audit event

```text
Dr. Smith uploaded patient_contract_with_prices.pdf and asked the AI to summarize risks for John Doe.
```
