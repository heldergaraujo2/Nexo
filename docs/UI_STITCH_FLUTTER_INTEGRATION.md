# Stitch UI → Flutter integration

**Status (2026-10-09):** integração principal concluída no branch `arena/af7a1fc1-nexo` (PR #27), incluindo os
pontos que esta lista marcava como pendentes na primeira versão (PR #26): navegação inferior real, destino
real validado e abas de histórico/perfil. Ver `PROJECT_STATUS.md` para evidências e matriz de rastreabilidade.

## Reference inventory
The Stitch archive (`stitch_nexo_ui_redesign/`) contains **48 HTML screen prototypes**, **49 PNG references** and
the design-system guide `nexo_mobility_design_system/DESIGN.md`. The production app is Flutter, so HTML
prototypes are visual/product references, not drop-in native screens. The original `stitch_nexo_ui_redesign.zip`
was deleted from the repository (commit `2acb25a`); only the extracted folder remains.

## Visual system applied
Dark surfaces (`#0A0912`/`#151321`/`#201C31`), violet accent (`#9B72FF`/`#B59AFF`), green operational state
(`#56E3A2`), rounded panels, strong hierarchy — implemented in `mobile/lib/src/theme.dart` (BrandMark, Eyebrow,
Panel, StatusPill, ErrorPanel, PageColumn).

## Screens implemented in Flutter (with files)
| Module | Screen | File | Real behavior |
|---|---|---|---|
| Auth | Login | `mobile/lib/src/login_page.dart` | POST /auth/login + GET /me, client-side validation, role routing |
| Passenger | Home / request | `mobile/lib/src/passenger_shell.dart` | GPS (geolocator), validated destination coordinates, car/motorcycle, POST /rides/requests |
| Passenger | Waiting / tracking | `mobile/lib/src/passenger_shell.dart` | polling history→service→ride, server fare/distance/state |
| Passenger | Cancel modal + reasons | `mobile/lib/src/passenger_shell.dart` | POST /requests/:id/cancel and /rides/:id/cancel with reason |
| Passenger | History | `mobile/lib/src/account_tabs.dart` | GET /me/services/history |
| Passenger | Profile + logout | `mobile/lib/src/account_tabs.dart` | GET /me, session end |
| Driver | Radar / calls | `mobile/lib/src/driver_shell.dart` | availability toggle (PUT /me/marketplace), GET /me/marketplace/open-requests |
| Driver | Incoming call / accept | `mobile/lib/src/driver_shell.dart` | POST /requests/:id/accept |
| Driver | Ride states | `mobile/lib/src/driver_shell.dart` | driver-en-route / arrived / start / complete (+ completed/cancelled) |
| Driver | History / profile | `mobile/lib/src/account_tabs.dart` | same real endpoints |

Navigation is a real `IndexedStack` + `NavigationBar` (tabs open actual screens). All actions call the real API
with idempotency keys; the app never fabricates rides, fares or driver states.

## Explicitly not implemented (kept honest)
- **Address search / geocoding / map routing / fare preview before request:** the backend contract
  (`CreatePassengerRideDto`) accepts coordinates only; the UI asks for destination latitude/longitude with
  validation instead of inventing a destination (the old +0.01 offset is gone).
- **Ratings, payment records, subscriptions, notifications screens, incident/insurance vertical
  (sinistro/guincho/carro reserva), biometrics/camera/document upload:** represented in the Stitch prototypes but
  not ported yet; several have backend modules already (see `PROJECT_STATUS.md` matrix) and await UI work.
- **Profile editing** (PUT /me/profile) — profile tab is read-only today.
- HTML/PNG references stay in `stitch_nexo_ui_redesign/` as design reference; they are not Flutter runtime assets.

## Validation
- Widget tests (mocked HTTP, request-body assertions): `mobile/test/widget_test.dart`, `passenger_flow_test.dart`,
  `driver_flow_test.dart`, `account_tabs_test.dart` — executed by the CI `mobile` job (`flutter analyze` + `flutter test`).
- Physical Android/Windows validation is **not claimed** here — see `PROJECT_STATUS.md` §4 for the blocked list.
