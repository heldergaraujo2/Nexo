# Nexo — Product and Architecture Decisions

## DEC-001 — Monetization
**Status:** ACCEPTED
Nexo will not charge percentage commission on completed rides or services. Providers pay R$99.90/month and keep 100% of service value.

## DEC-002 — Passenger car tariff
**Status:** ACCEPTED
Initial product rule: R$2.00 per kilometer for passenger car rides.

## DEC-003 — Passenger motorcycle tariff
**Status:** ACCEPTED
Initial product rule: R$1.50 per kilometer for passenger motorcycle rides.

## DEC-004 — Cargo negotiation
**Status:** ACCEPTED
Cargo services may have negotiated prices.

## DEC-005 — Initial payment methods
**Status:** ACCEPTED
Physical cash, Pix, and credit/debit card using the provider's own card machine.

## DEC-006 — Bilateral profiles and reputation
**Status:** ACCEPTED
Customers and providers have profiles and can rate each other after completed services.

## DEC-007 — Profile media
**Status:** ACCEPTED
Profiles may contain photos, videos and captions, subject to moderation and privacy rules.

## DEC-008 — Nexo Live
**Status:** REJECTED FOR CURRENT SCOPE
Live streaming is removed from the product roadmap.

## DEC-009 — Hands-free
**Status:** REJECTED FOR CURRENT SCOPE
Hands-free driving interaction and related speech/camera infrastructure are removed from the roadmap.

## DEC-010 — Pricing validation
**Status:** PENDING VALIDATION
R$2.00/km and R$1.50/km are product-defined initial rules, but economic viability and local regulatory requirements must be validated before commercial launch.

## DEC-011 — Initial technical stack
**Status:** ACCEPTED FOR FOUNDATION
Mobile: Flutter/Dart. Backend: TypeScript/NestJS. Database: PostgreSQL. Object storage: S3-compatible. Redis is optional and must be justified by measured need. Initial architecture is a modular monolith.

## DEC-012 — Passenger fare rounding
**Status:** ACCEPTED FOR INITIAL TECHNICAL CONTRACT
Distance is represented in meters; the server calculates the fare and rounds the final amount to the nearest cent using half-up. No minimum fare or cancellation fee is assumed until explicitly decided.

## DEC-013 — External providers through adapters
**Status:** ACCEPTED
Maps/routing, push notifications, identity verification and subscription billing are accessed through interfaces/adapters. Provider selection is finalized during Fase 1 after technical, cost and privacy evaluation.

## DEC-014 — Mobile-first product
**Status:** ACCEPTED
The product target is Android/iOS. PC is the development/administrative environment and is not the primary UX target.

## DEC-015 — Phase 0 gate
**Status:** ACCEPTED
Fase 0 is complete only after requirements, architecture, data model, states, API, security/privacy, testing, infrastructure and acceptance criteria are documented and internally consistent.


## DEC-016 — Password hashing
**Status:** ACCEPTED FOR INITIAL IMPLEMENTATION
Passwords are stored as PBKDF2-SHA256 derived keys with per-account random salts. Plaintext passwords are never persisted. The format includes algorithm, iteration count, salt and derived key so the cost can be migrated safely later.

## DEC-017 — Access token and recovery token security
**Status:** ACCEPTED FOR INITIAL IMPLEMENTATION
Access tokens are short-lived signed tokens. Password recovery uses cryptographically random opaque tokens, stores only SHA-256 hashes, expires them after 30 minutes and invalidates them after successful use. Recovery responses remain generic; development/test may expose the generated token to enable automated validation.

## DEC-018 — Profile privacy boundary
**Status:** ACCEPTED
Public profiles expose only deliberately public profile fields. Email, password hashes and identity verification artifacts remain private. Authenticated account data is accessed through ownership-checked endpoints.

## DEC-019 — Profile media boundary
**Status:** ACCEPTED FOR PHASE 2
Profile media metadata is persisted with owner, type, object reference, checksum, visibility and moderation state. Binary object storage is accessed through an adapter; direct public bucket exposure is prohibited.

## DEC-020 — Marketplace core as category-agnostic service lifecycle
**Status:** ACCEPTED
The generic marketplace owns request, matching, offer/acceptance, service lifecycle, cancellation, history, notifications and audit/idempotency primitives. Passenger-specific pricing and route rules remain in Phase 5 and must not be embedded into the generic marketplace.


## DEC-021 — Passenger ride pricing and route snapshots
**Status:** ACCEPTED
Passenger rides use server-authoritative distance in meters and integer-cent pricing. Car is R$2.00/km and motorcycle is R$1.50/km. Route changes require an expected route version, a new server-side calculation and a new immutable route snapshot/event. Free price negotiation remains prohibited for passenger transport.


## DEC-022 — Initial payment recording boundary
**Status:** ACCEPTED FOR PHASE 6
Nexo records cash, Pix and card-machine confirmation without processing cards or storing card credentials. Payment confirmation must equal the immutable service price snapshot; mismatches are rejected and may be disputed before confirmation. Payment records are linked to the service and protected by ownership, idempotency and transactional locking.


## DEC-023 — Payment confirmation is operational recording
**Status:** ACCEPTED FOR PHASE 6
Nexo does not process cards in the initial payment model. Cash, Pix and provider-owned card-machine payments are recorded operationally. Confirmation must equal the immutable completed-service price snapshot. No card number, CVV or equivalent credential is persisted.


## DEC-024 — Operational verification boundary
**Status:** ACCEPTED FOR PHASE 7
Identity and vehicle verification records are private operational resources. Public APIs expose only verified indicators and labels. Raw identity documents are not persisted by this phase; external/manual verification is represented by a verification case and optional non-sensitive provider reference.

## DEC-025 — Initial fraud and incident model
**Status:** ACCEPTED FOR PHASE 7
Initial antifraud is a reviewable flagging system rather than automatic punitive blocking. Security incidents use an explicit state machine and role-restricted operations. This avoids inventing penalties while providing an auditable operational response path.


## DEC-026 — Delivery pricing boundary
**Status:** ACCEPTED FOR PHASE 8
Deliveries do not use passenger fixed tariffs. A delivery must be accepted through a provider priced offer so the Service receives an immutable operational price compatible with Phase 6 payment recording. Generic direct acceptance is rejected for delivery requests.

## DEC-027 — Delivery lifecycle ownership
**Status:** ACCEPTED FOR PHASE 8
Delivery execution is owned by the Delivery state machine. Generic Service start/complete/cancel endpoints cannot bypass delivery-specific transitions.

## DEC-028 — Delivery media boundary
**Status:** ACCEPTED FOR PHASE 8
Delivery requests store validated media metadata only until the object-storage adapter is available. MIME, size, SHA-256 format, count and object-key safety are validated; public bucket exposure is prohibited.


## DEC-029 — Cargo negotiation as versioned proposals
**Status:** ACCEPTED FOR PHASE 9
Cargo/freight uses a dedicated versioned proposal chain. Each response creates the next version; only the current offered proposal can be accepted. The accepted amount becomes the Service price snapshot. A real Marketplace Offer is created as the service acceptance link so existing Service invariants remain intact.


## DEC-024 — Towing price and safety boundary
**Status:** ACCEPTED FOR PHASE 10
Towing does not receive a new fixed tariff. Its price is represented by a priced Marketplace Offer and becomes the Service price at acceptance. Towing execution requires an eligible provider with a verified vehicle and no active block relationship with the customer. This preserves existing pricing flexibility without changing passenger/cargo rules.
