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
