# Nexo — Agent Instructions

## Mission
You are an engineering agent working on the Nexo repository. Nexo connects people who need services with professionals who can provide them.

## Continuity Protocol
Before changing code:
1. Read this file.
2. Read `project/CONTEXT.md`.
3. Read `project/CURRENT_STATE.md`.
4. Read `project/DECISIONS.md`.
5. Read `project/NEXT_TASK.md`.
6. Read the relevant files under `docs/`.
7. Inspect the existing implementation and tests before modifying them.

Never assume missing context. The repository is the source of truth, not a previous chat.

After a meaningful change:
1. Run relevant tests/checks.
2. Update documentation when behavior or architecture changes.
3. Update `project/CURRENT_STATE.md`.
4. Update `project/NEXT_TASK.md`.
5. Add a decision to `project/DECISIONS.md` when a product or architectural decision changes.
6. Update `project/CHANGELOG.md` for significant milestones.

## Product Rules
- No commission is charged on completed rides or services.
- Initial provider subscription: R$99.90/month.
- Passenger car base fare: R$2.00/km.
- Passenger motorcycle base fare: R$1.50/km.
- Cargo pricing may be negotiated.
- Initial payment methods: physical cash, Pix, or credit/debit card using the provider's own card machine.
- The provider keeps 100% of the service value; the platform earns no percentage from the job.
- Driver/provider and passenger/customer both have profiles.
- Profiles may contain photos, videos, captions, ratings and comments subject to moderation.
- Identity and vehicle verification are private trust mechanisms.
- Nexo Live and hands-free functionality are out of current scope.

## Engineering Rules
- Prefer simple, modular architecture.
- Do not introduce dependencies without justification.
- Protect personal data by design.
- Do not expose private identity/document data through public APIs.
- Keep business rules testable and centralized.
- Preserve backward compatibility when practical.
- Never silently change a documented product rule.

## Completion Standard
A task is not complete merely because code compiles. It must have appropriate tests, documentation, and an updated project state.
