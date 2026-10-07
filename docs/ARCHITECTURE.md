# Nexo — Architecture

**Status:** Initial architecture specification

## Architectural direction
Use modular domain boundaries so the product can start simple while allowing future scale.

## Initial domains
- Identity/Auth
- Users and Profiles
- Providers and Vehicles
- Service Requests
- Offers/Negotiation
- Rides
- Deliveries
- Cargo
- Towing
- Reputation
- Media
- Subscriptions
- Payment Records
- Safety/Moderation
- Administration
- Notifications

## Rules
- Keep business rules independent from transport/UI concerns.
- Keep private identity/document data isolated from public profile data.
- Treat provider subscription and service transaction as separate domains.
- Treat payment method registration as separate from payment processing.
- Record important state changes for auditability.
- Avoid premature microservices; begin with the simplest architecture that preserves domain boundaries.

## To be decided
Technology stack, deployment, database engine, object storage, maps/routing provider, notification provider, identity verification and subscription billing provider.
