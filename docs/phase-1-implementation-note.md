# Phase 1 Implementation Note

## Chosen stack

Phase 1 uses the requested stack:

1. Next.js with the App Router
2. TypeScript
3. Prisma schema for PostgreSQL persistence
4. Tailwind CSS
5. OpenAI provider interface with a real OpenAIProvider and deterministic MockAIProvider
6. LocalDiskProvider implementing BlobStore primitives
7. Vitest for workflow and permission tests

## Folder structure

- `src/server`: Domain services, workflow engine, providers, permissions, repository ports, and repository adapters.
- `src/app`: Local Phase 1 UI and API routes.
- `prisma/schema.prisma`: Phase 1 database model shape.
- `prisma/migrations`: PostgreSQL migration SQL for the Phase 1 schema.
- `src/server/workflow.test.ts`: Required domain tests using MockAIProvider and InMemoryRepository.
- `src/server/prismaDurability.test.ts`: Optional integration test for a real PostgreSQL database when `TEST_DATABASE_URL` is set.
- `scripts/durability-proof.ts`: One-command manual durability proof against a real PostgreSQL database.

## Phase 1 scope boundary

The implementation focuses on the local vertical slice:

Draft -> Critique -> Revise -> Human Approve

Future integrations such as GitHub, S3, SharePoint, Claude, Gemini, SSO, Temporal, embeddings, and billing are intentionally not implemented.

## Persistence note

Phase 1A built the workflow logic and used `InMemoryRepository` for the first local proof.

Phase 1B added real Prisma/Postgres persistence:

1. Runtime services use `PrismaRepository` by default.
2. `DATABASE_URL` is required in normal runtime.
3. `InMemoryRepository` is only for unit tests or explicitly injected test harnesses.
4. Workflow runs, steps, approvals, decisions, audit events, model calls, agents, messages, organizations, workspaces, projects, users, and memberships are persisted through Prisma.
5. Workflow state survives process restart because each `/api/workflows/runNext` call reloads state from Postgres.

The durability proof command is:

```bash
pnpm run durability:proof
```

It requires `DATABASE_URL` to point at a real PostgreSQL database. The script applies migrations, starts the local Next.js server, advances the workflow twice, fully kills the server process, restarts it, resumes the same workflow, reaches human approval, approves it, and verifies persisted decisions, audit records, model calls, and local disk output references.
