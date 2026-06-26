# Control Plane, Data Plane, and Operational Plane

## Control plane

Stores configuration and metadata needed to operate AegisLoop.

Examples:

1. Organizations
2. Users
3. Memberships
4. Licensing metadata
5. Integration configuration
6. Non sensitive audit metadata

## Customer data plane

Stores long term project content and approved artifacts in the customer selected system of record.

Examples in future phases:

1. GitHub
2. S3
3. SharePoint
4. Google Drive
5. OneDrive
6. Box
7. Private database

## Operational plane

Stores data needed to run workflows.

Examples:

1. Workflow state
2. Model call records
3. Temporary working context
4. Hot cache if enabled in future
5. Embeddings if enabled in future

## Phase 1

Phase 1 uses Postgres for workflow and metadata and LocalDiskProvider for approved output storage.
