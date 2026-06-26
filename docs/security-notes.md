# Security Notes

## Phase 1 security rules

1. Secrets must never be exposed to the frontend.
2. OpenAI API key must come from environment variables.
3. Automated tests must work without OpenAI credentials.
4. Audit logs must avoid sensitive content.
5. AI cannot approve.
6. Human approval must be enforced server side.
7. Tenant isolation must be included in queries.
8. Do not rely only on frontend permission checks.

## Future security areas

1. Encrypted provider credentials
2. SSO
3. SCIM
4. Advanced role builder
5. Retention policies
6. Audit export
7. Customer managed keys
8. Self hosted data plane
9. Compliance package
