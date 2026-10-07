# Nexo — Business Rules

## BR-001 Provider subscription
Provider access is monetized through a R$99.90/month subscription. No percentage commission is deducted from completed services.

## BR-002 Provider proceeds
The provider keeps 100% of the agreed/calculated service value, subject to external costs that may apply to the provider's own payment instrument.

## BR-003 Passenger car
Initial passenger fare is R$2.00 per kilometer.

## BR-004 Passenger motorcycle
Initial passenger fare is R$1.50 per kilometer.

## BR-005 Passenger negotiation
Passenger transport does not use free price negotiation.

## BR-006 Cargo negotiation
Cargo service prices may be negotiated.

## BR-007 Payment methods
Initial supported methods are physical cash, Pix and credit/debit card using the provider's own card machine. Nexo does not initially process the card.

## BR-008 Bilateral reputation
Eligible completed services can generate ratings/comments from customer to provider and provider to customer.

## BR-009 Profile media
Photos/videos/captions are profile content, not live broadcasts, and remain subject to moderation.

## BR-010 Live exclusion
No live streaming or hands-free driving feature is part of the current product scope.

## BR-011 Passenger fare calculation
Distance is obtained by an approved routing/distance adapter and represented internally in meters. The server is authoritative. Fare is calculated from the stored distance snapshot and the applicable per-km tariff.

For the initial technical contract, the calculated amount is rounded to the nearest cent (half-up). No minimum fare or cancellation fee is assumed until a product decision explicitly adds one.

## BR-012 Route changes
A route change that affects price must create a new server-side calculation/snapshot and an explicit state/event transition. The client cannot overwrite the price.

## BR-013 Financial representation
Money is stored as integer cents with an explicit currency code. Floating point is not used for monetary persistence.

## BR-014 Negotiation finality
The accepted cargo/freight proposal becomes the service price snapshot. Later changes require an explicit authorized change flow and audit event.
