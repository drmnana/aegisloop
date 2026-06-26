# Storage Capabilities

Storage providers expose primitives only.

Domain logic must not live inside storage providers.

## Phase 1

Implement LocalDiskProvider with BlobStore.

## BlobStore

Required methods:

```text
readBlob()
writeBlob()
deleteBlob()
listBlobs()
getBlobMetadata()
```

## Future capabilities

VersionedStore may be added later for GitHub style branch, commit, and pull request flows.

SearchIndexStore may be added later for search and embeddings.

Do not implement MemoryStore.
Do not implement AuditSink.
