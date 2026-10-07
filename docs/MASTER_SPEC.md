# Nexo — Master Technical Specification

**Status:** Draft foundation  
**Version:** 0.1

## 1. Product objective
Build a trustworthy multi-service marketplace connecting customers and independent providers.

## 2. Actors
- Customer/passenger
- Provider/driver
- Administrator/moderator

A future provider may own multiple vehicles.

## 3. Core domains
- Identity and accounts
- Profiles
- Provider vehicles
- Service requests
- Offers and negotiation
- Passenger rides
- Deliveries
- Cargo
- Towing
- Reputation
- Media
- Safety and moderation
- Provider subscriptions
- Payment method records
- Administration

## 4. Passenger pricing
Initial rules:
- Car: R$2.00/km
- Motorcycle: R$1.50/km

The exact calculation contract must define distance source, rounding, minimum fare if any, cancellation, route changes and exceptional cases before implementation.

## 5. Cargo
Cargo requests may be negotiated. The domain must support offers, counteroffers, acceptance, rejection and an auditable negotiation history.

## 6. Payments
Initial payment methods:
- cash
- Pix
- credit/debit card using provider's own card machine

The first release may record payment method and completion status without becoming the card processor.

## 7. Monetization
Provider subscription: R$99.90/month. No percentage commission on completed services.

The subscription domain must support trial, activation, renewal, cancellation, failed payment and suspension rules when billing is implemented.

## 8. Profiles and media
Both customers and providers have profiles. Media may include photos/videos with captions. Public profile data must be separated from private identity/document data. Media must support moderation and reporting.

## 9. Reputation
Bilateral ratings/comments after eligible completed services. Anti-abuse rules must address spam, retaliation, manipulation and fraudulent ratings.

## 10. Trust and safety
Identity and vehicle verification, reporting, blocking, emergency-related flows, location sharing where appropriate, fraud prevention and audit events are architectural concerns.

## 11. Privacy
Personal/document data must be access-controlled and minimized. LGPD requirements must be reflected in data lifecycle, consent/notice where applicable, retention and deletion workflows. Legal validation is required before commercial launch.

## 12. Administration
Admin capabilities include users, providers, vehicles, verification, services, subscriptions, complaints, reports, ratings, moderation, disputes and metrics.

## 13. Non-functional requirements
- Security by design
- Auditability of important state changes
- Testability of business rules
- Observability
- Availability appropriate to the launch stage
- Data minimization
- Clear authorization boundaries
- Scalable service boundaries without premature complexity

## 14. Explicit exclusions
Nexo Live, live streaming, hands-free driving interaction, live camera ingestion, speech-to-text/text-to-speech for driving, and Live-specific consent/moderation infrastructure are excluded from the current scope.

## 15. Open questions before implementation
- Technology stack
- Distance calculation provider
- Exact fare rounding/minimum/cancellation rules
- Subscription billing provider
- Identity verification provider
- Vehicle verification process
- Media storage and moderation provider
- Emergency workflow
- Initial launch geography
- Regulatory requirements by municipality/state
