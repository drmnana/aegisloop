# AegisLoop Roadmap

This roadmap is reference material only. Phase 1 is the only phase to implement now.

If there is a conflict between this roadmap and the Phase 1 build spec, the Phase 1 build spec wins.

## Phase 1: Local vertical slice

Prove the core machine works end to end.

Build:

1. Local app
2. One organization
3. One workspace
4. One project
5. One thread
6. One AI provider: OpenAI
7. One storage provider: LocalDiskProvider
8. One workflow: Draft → Critique → Revise → Human Approve
9. Postgres workflow state machine
10. Human approval pause
11. Decision log
12. Audit log
13. Model call records
14. Basic hardcoded roles
15. MockAIProvider for tests

## Phase 1.5: Mandatory design partner validation gate

Do not decide Phase 2 based on internal assumptions.

Use Phase 1 to learn what real users actually value.

Show the working product to 3 to 5 real potential users or design partners.

Possible design partners:

1. Software team
2. Lawyer or legal operator
3. Consultant or business operator
4. Medical or healthcare administrative user
5. Government contracting or proposal user

Required learning:

1. Do users value the workflow itself?
2. Do users value the decision log?
3. Do users value the audit trail?
4. Do users value human approval?
5. Do users value bring your own AI?
6. Do users value bring your own memory?
7. Which storage provider do they actually need first?
8. Which real workflow would they use first?
9. Would they pay?
10. Who would approve buying it?

Phase 2 is deliberately not predetermined.

The market reaction after Phase 1 chooses Phase 2.

## Possible Phase 2A: Decision log and audit depth

Build this if users care most about traceability, approvals, and why decisions were made.

Possible features:

1. Decision supersession chains
2. Decision dependency graph
3. Decision to artifact linking
4. Decision to workflow linking
5. Decision to model call linking
6. Decision reversal history
7. Approved facts
8. Rejected ideas
9. Open questions
10. Why did we decide this view
11. Decision timeline
12. Audit export

## Possible Phase 2B: Customer owned memory and storage

Build this if users care most about data location, ownership, and storage control.

Possible first providers based on validation:

1. GitHub, if technical teams pull hardest
2. S3, if cloud infrastructure teams pull hardest
3. SharePoint, if legal, healthcare, or business teams pull hardest
4. Google Drive or OneDrive, if small businesses pull hardest
5. Box, if regulated document teams pull hardest

## Possible Phase 2C: Bring your own AI and multi model workflow

Build this if users care most about using multiple AI systems or their own AI keys.

Possible features:

1. Customer supplied AI key support
2. Encrypted provider credentials
3. Organization level provider settings
4. Project level provider settings
5. Anthropic Claude provider
6. Google Gemini provider
7. Azure OpenAI provider if demanded
8. Local OpenAI compatible provider if demanded
9. Agent model assignment
10. Workflows using multiple providers
11. Cost tracking by provider

## Possible Phase 2D: Workflow specialization

Build this if users care most about a specific job to be done.

Possible workflows:

1. Investor memo workflow
2. Legal review workflow
3. RFP response workflow
4. Government proposal workflow
5. Medical administrative policy workflow
6. Board memo workflow
7. Contract review workflow
8. Technical architecture review workflow

## Phase 3 and beyond

Future phases depend on validated demand.

Possible later areas:

1. Enterprise administration and security
2. SSO
3. Advanced role builder
4. Temporal workflow engine
5. Memory and semantic search
6. Evaluation and observability
7. Self hosted deployment
8. Private cloud deployment
9. Compliance package

## Continuous validation

After every phase, ask:

1. Who used it?
2. For what real project?
3. What did they value most?
4. What did they ignore?
5. What did they ask for next?
6. Would they pay?
7. What would block adoption?

Do not build features just because the architecture supports them.
