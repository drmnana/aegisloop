# Decision Log

The decision log is a core product object.

The decision log should answer:

1. What did we decide?
2. Who approved it?
3. When was it approved?
4. What workflow produced it?
5. What artifact stores the approved content?
6. Was it superseded later?

## Phase 1 rule

Decision rows store metadata and approved output references only.

Do not store the full approved output text in the Decision table.

Approved content is written through LocalDiskProvider.

Postgres stores the decision metadata.
Customer selected storage stores the approved content.
