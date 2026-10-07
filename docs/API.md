# Nexo — API Specification

**Status:** Not implemented — contract planning only.

## Planned resource groups
- /auth
- /users
- /profiles
- /providers
- /vehicles
- /requests
- /offers
- /rides
- /deliveries
- /cargo
- /towing
- /ratings
- /media
- /subscriptions
- /payment-methods
- /safety
- /admin

## Contract principles
- Authentication required for private resources.
- Authorization based on actor and resource ownership/role.
- Never return private verification documents in public profile endpoints.
- Validate state transitions server-side.
- Idempotency for operations that may be retried.
- Consistent error format.
- Pagination for collections.
- Audit important business transitions.

Detailed schemas will be defined after the domain/data model is approved.
