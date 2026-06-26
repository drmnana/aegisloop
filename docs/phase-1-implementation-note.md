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

- `src/server`: Domain services, workflow engine, providers, permissions, and repository ports.
- `src/app`: Local Phase 1 UI and API routes.
- `prisma/schema.prisma`: Phase 1 database model shape.
- `src/server/workflow.test.ts`: Required domain tests using MockAIProvider.

## Phase 1 scope boundary

The implementation focuses on the local vertical slice:

Draft -> Critique -> Revise -> Human Approve

Future integrations such as GitHub, S3, SharePoint, Claude, Gemini, SSO, Temporal, embeddings, and billing are intentionally not implemented.

## Persistence note

The domain layer is written against a repository port. Tests use `InMemoryRepository` to prove workflow behavior without external services. The Prisma schema defines the PostgreSQL model required for the production persistence adapter.
