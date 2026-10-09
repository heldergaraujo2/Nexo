# Stitch UI → Flutter integration

## Implementation scope
The Stitch archive contains 48 HTML screen prototypes, 49 screen references and a design-system guide. The production app is Flutter, so HTML prototypes are visual/product references rather than drop-in native screens.

## Applied in this branch
- Replaced the generic Material indigo theme with Nexo's dark surfaces, violet accent, green operational state, rounded panels and stronger hierarchy.
- Redesigned login while retaining API URL configuration, POST /auth/login, bearer token handling and GET /me role selection.
- Redesigned passenger home with GPS status, car category, request action, current-ride status and server-reported fare.
- Redesigned driver home with online state, polling radar, request acceptance and existing ride transition actions.
- Added shared visual primitives for brand mark, eyebrow labels, panels, status pills and error presentation.
- Kept the real API calls and idempotency keys; did not replace them with simulated successful responses.

## Explicitly not implemented / limitations
- Destination selection, autocomplete, real map routing and fare preview: current prototype uses a temporary destination offset (+0.01 latitude/longitude); this must be replaced with a real destination picker before production.
- The current backend integration only proves the existing basic ride flow. It does not expose all flows represented by the Stitch designs (ratings, payment records, incident handling, document capture/upload, subscriptions, lost item flows, etc.) in the current screen implementation.
- Bottom navigation is currently visual scaffolding, not connected navigation. Do not treat inactive tabs as implemented features.
- UI reference HTML and PNGs are intentionally retained in the source ZIP outside this native screen rewrite; they were not copied into Flutter assets because they are not runtime assets.
- No claims are made about a physical Android device or live backend test from this GitHub-only session.

## Next integration steps
1. Run flutter analyze and flutter test from mobile/ on a machine with Flutter installed.
2. Build Android debug APK and validate login for both passenger and provider accounts.
3. Replace temporary destination coordinates with a destination search/picker and server-backed route estimate.
4. Implement remaining Stitch screens incrementally against verified API contracts, prioritizing active-trip, cancellation, history, payment records and provider profile.
5. Add integration/widget tests for request, accept and state transitions; keep the backend authoritative for price and state.
