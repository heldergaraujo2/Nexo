# Nexo — Product and Architecture Decisions

## DEC-001 — Monetization
**Status:** ACCEPTED
Nexo will not charge percentage commission on completed rides or services. Providers pay R$99.90/month and keep 100% of service value.

## DEC-002 — Passenger car tariff
**Status:** ACCEPTED
Initial product rule: R$2.00 per kilometer for passenger car rides.

## DEC-003 — Passenger motorcycle tariff
**Status:** ACCEPTED
Initial product rule: R$1.50/km for passenger motorcycle rides.

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
R$2.00/km and R$1.50/km are product-defined initial rules.

## DEC-011 — Initial technical stack
**Status:** ACCEPTED FOR FOUNDATION
Flutter/Dart mobile, TypeScript/NestJS backend, PostgreSQL, S3-compatible storage and modular monolith.

## DEC-012 — Passenger fare rounding
**Status:** ACCEPTED FOR INITIAL TECHNICAL CONTRACT
Distance is represented in meters; server calculates fare and rounds half-up.

## DEC-013 — External providers through adapters
**Status:** ACCEPTED
External providers are accessed through interfaces/adapters.

## DEC-014 — Mobile-first product
**Status:** ACCEPTED
Android/iOS is the product target.

## DEC-015 — Phase 0 gate
**Status:** ACCEPTED

## DEC-016 — Password hashing
**Status:** ACCEPTED FOR INITIAL IMPLEMENTATION

## DEC-017 — Access token and recovery token security
**Status:** ACCEPTED FOR INITIAL IMPLEMENTATION

## DEC-018 — Profile privacy boundary
**Status:** ACCEPTED

## DEC-019 — Profile media boundary
**Status:** ACCEPTED FOR PHASE 2

## DEC-020 — Marketplace core lifecycle
**Status:** ACCEPTED

## DEC-021 — Passenger pricing and route snapshots
**Status:** ACCEPTED

## DEC-022 — Initial payment recording boundary
**Status:** ACCEPTED FOR PHASE 6

## DEC-023 — Payment confirmation operational recording
**Status:** ACCEPTED FOR PHASE 6

## DEC-024 — Operational verification boundary
**Status:** ACCEPTED FOR PHASE 7

## DEC-025 — Initial fraud and incident model
**Status:** ACCEPTED FOR PHASE 7

## DEC-026 — Delivery pricing boundary
**Status:** ACCEPTED FOR PHASE 8

## DEC-027 — Delivery lifecycle ownership
**Status:** ACCEPTED FOR PHASE 8

## DEC-028 — Delivery media boundary
**Status:** ACCEPTED FOR PHASE 8

## DEC-029 — Cargo negotiation
**Status:** ACCEPTED FOR PHASE 9

## DEC-030 — Towing price and safety boundary
**Status:** ACCEPTED FOR PHASE 10

## DEC-031 — Subscription monetization boundary
**Status:** ACCEPTED FOR PHASE 11
Provider subscription is fixed at 9990 integer cents in BRL. Nexo does not take service commissions. Subscription billing is isolated behind a BillingAdapter; no card credentials or payment-provider secrets are stored by Nexo. Completed-service prices remain immutable and independent from subscription state.
