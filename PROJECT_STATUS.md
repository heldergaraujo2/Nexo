# Nexo — Project Status (validação com evidências)

**Data:** 2026-10-09
**Branch de trabalho:** `arena/af7a1fc1-nexo`
**PR desta entrega:** https://github.com/heldergaraujo2/Nexo/pull/27
**PR anterior (integração inicial da UI, preservada):** https://github.com/heldergaraujo2/Nexo/pull/26 (OPEN, CI verde)

> Regra deste documento: toda afirmação de progresso é classificada como
> **VERIFICADO** (com saída real colada), **IMPLEMENTADO MAS NÃO COMPROVADO**
> (código existe, sem execução real) ou **NÃO EXECUTADO / BLOQUEADO** (com o
> motivo exato). Nada é declarado "funcionando" sem evidência.

---

## 1. Estado do repositório (auditoria inicial — VERIFICADO)

- Checkout local: `/home/user/Nexo`, clone raso (`git rev-parse --is-shallow-repository` → `true`).
- Base: `869040cd7890bd3ced2ccac6ed66c390d85d66ae` ("Add files via upload", 2026-10-09T19:34:55Z = `origin/main`).
- PR #26 (`ui/stitch-nexo-flutter-integration`): OPEN, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`, 4 commits
  (`1bc01f7`, `263c729`, `906d005`, `dbf6450`), CI run 37982165847 → backend/mobile/windows-driver **pass**.
  - Arquivos: `docs/UI_STITCH_FLUTTER_INTEGRATION.md` (novo), `mobile/lib/main.dart` (+258/−52), `mobile/test/widget_test.dart`.
  - Lacunas que a própria PR declara: navegação inferior apenas visual; destino artificial (+0.01); sem telas de histórico/perfil.
- Os 4 commits da PR #26 foram **mesclados** no branch de trabalho (merge `533392e`) e as lacunas foram fechadas
  neste branch (commit `265ace6` e seguintes). A PR #26 permanece aberta para decisão humana (não foi fechada nem mesclada por este agente).
- Material Stitch: `stitch_nexo_ui_redesign/` — **48 protótipos HTML** (`code.html`), **49 PNGs** (`screen.png`) e
  `nexo_mobility_design_system/DESIGN.md`. O arquivo `stitch_nexo_ui_redesign.zip` **não existe mais** no repositório
  (commit `2acb25a` "Delete stitch_nexo_ui_redesign.zip"); apenas a versão extraída permanece.

## 2. O que foi implementado e comprovado (VERIFICADO)

### 2.1 Backend — execução local real (Node 22 + PostgreSQL embutido via npm)

Comandos e saídas reais (executados em `/home/user/Nexo/backend`):

```
$ npm run typecheck   → tsc --noEmit, exit 0 (sem saída)
$ npm run lint        → eslint src test --max-warnings=0, exit 0 (sem saída)
$ npm run build       → tsc -p tsconfig.build.json, exit 0 (sem saída)
$ npx prettier --write "src/**/*.ts" "test/**/*.ts" ... → 28 arquivos corrigidos
$ npm run format:check → "All matched files use Prettier code style!" exit 0
```

Antes da correção, `npm run format:check` falhava com `EXIT:1 … Code style issues found in 28 files` (estado
pré-existente do repositório). Depois: verde.

Testes de integração executados **localmente** contra PostgreSQL real (orquestrador local não versionado
`backend/.local-test-pg.cjs`, Postgres embutido via pacote npm `embedded-postgres`, migrações 001–011 aplicadas):

```
MIGRATED 001_initial.sql … MIGRATED 011_towing.sql
 ✓ test/marketplace.integration.spec.ts (4 tests)
 ✓ test/delivery.integration.spec.ts (4 tests)
 ✓ test/payment.integration.spec.ts (5 tests)
 ✓ test/ride.integration.spec.ts (4 tests)
 ✓ test/towing.integration.spec.ts (3 tests)
 ✓ test/cargo.integration.spec.ts (2 tests)
 ✓ test/security.integration.spec.ts (3 tests)
 ✓ test/trust.integration.spec.ts (6 tests)
 ✓ test/identity.integration.spec.ts (2 tests)
 ✓ test/auth.spec.ts (3 tests)
 ✓ test/health.spec.ts (1 test)
 Test Files  11 passed (11)
      Tests  37 passed (37)
VITEST EXIT: 0
```

(Os `ERROR: duplicate key…` / `ERROR: Completed service price is immutable` no log do PostgreSQL são
asserções **negativas** dos testes — comportamento esperado e verificado pelas próprias suítes.)

### 2.2 Flutter — integração completa da UI Stitch com navegação e APIs reais

Arquivos novos em `mobile/lib/src/`: `api.dart`, `theme.dart`, `location.dart`, `login_page.dart`,
`account_tabs.dart`, `passenger_shell.dart`, `driver_shell.dart` (entry: `mobile/lib/main.dart`).

| Item | Onde | Comportamento real |
|---|---|---|
| Navegação inferior real (sem abas falsas) | `passenger_shell.dart` / `driver_shell.dart` (`IndexedStack` + `NavigationBar`) | Início/Viagens/Perfil e Chamadas/Viagens/Perfil alternam telas reais |
| Destino real, sem offset artificial | `passenger_shell.dart` (`requestPanel`, `validateCoordinate` em `location.dart`) | lat/lng digitados e validados (−90..90 / −180..180); nada é preenchido automaticamente |
| Categoria de veículo | `passenger_shell.dart` (`vehicleCard`) | `car`/`motorcycle` conforme `CreatePassengerRideDto` |
| Solicitação de corrida | `POST /rides/requests` + `Idempotency-Key` | corpo testado por widget test (origem=GPS, destino=digitado) |
| Tarifa/distância | resposta do servidor | `fareCents`/`distanceMeters` sempre do backend |
| Rastreamento | polling `GET /me/services/history` → `GET /services/:id` → `GET /rides/:id` | casamento por `requestId` real |
| Cancelamento com motivo | `POST /requests/:id/cancel` e `POST /rides/:id/cancel` | modal com motivo opcional (até 500 chars) |
| Disponibilidade do motorista | `PUT /me/marketplace` | toggle `Switch` envia `available`/`offline` + `acceptingRequests` |
| Radar + aceite | `GET /me/marketplace/open-requests`, `POST /requests/:id/accept` | cartões com `id`/`category` reais |
| Máquina de estados da corrida | `POST /rides/:id/{driver-en-route,arrived,start,complete}` | botões conforme estado do servidor |
| Histórico | `GET /me/services/history` | lista real com categoria, estado, preço, data |
| Perfil + logout | `GET /me` | dados reais; logout volta ao login |

### 2.3 Testes de widgets (novos) — 13/13 PASS no CI (VERIFICADO, run 38000147761)

`mobile/test/widget_test.dart` (5), `mobile/test/passenger_flow_test.dart` (4),
`mobile/test/driver_flow_test.dart` (3), `mobile/test/account_tabs_test.dart` (1) + `helpers.dart`
(HTTP mockado com `package:http/testing.dart`, requisições registradas e asserções no corpo real enviado).

Cobrem: validação de login sem chamada de API; rota por papel (customer→passageiro, provider→motorista);
falha de API exibida; corpo da solicitação **sem offset**; validação de coordenadas; rastreamento de estados;
cancelamento com motivo; toggle de disponibilidade; máquina de estados completa do motorista; histórico/perfil/logout.

> **VERIFICADO via CI:** `flutter analyze` e `flutter test` (13/13) passaram no job `mobile`
> (run 38000147761, PR #27). **Não há Flutter SDK neste ambiente** (`flutter: command not found`),
> então a execução local de Flutter é impossível aqui — a evidência é o GitHub Actions.

## 3. Implementado mas não comprovado

- **Widget tests**: código existe e compila; resultado `PASS` de `flutter test` deve constar do CI da PR #27
  (ver seção 5). Não é válido declarar "testes verdes" antes do log real do CI.
- **APK Android e pacote Windows**: o CI publica `nexo-android-debug` e `nexo-windows-driver`; a instalação e
  a execução em dispositivos reais **não** foram feitas (sem dispositivo/ambiente aqui).

## 4. Não implementado / bloqueado

| Item | Motivo exato | Ação necessária |
|---|---|---|
| Teste em Android físico | Sem dispositivo ADB (`adb devices` indisponível; sem adb) | Usuário instala o APK do CI e valida |
| Teste em Windows | Sandbox Linux; sem execução de apps Windows | Usuário baixa `nexo-windows-driver` do CI e executa |
| Fluxo ponta a ponta passageiro×motorista em 2 dispositivos | Depende dos dois itens acima | Usuário executa com contas `npm run e2e:provision` |
| Busca de endereço/geocoding | Backend aceita apenas coordenadas (`CoordinateDto`); nenhum serviço de geocoding integrado (e sem credenciais para um) | Decidir provedor e implementar |
| UI de avaliações | Backend tem `ratings`/`trust`; app Flutter não tem telas | Implementar telas |
| UI de pagamentos/registro financeiro | Backend tem `payment-records`; app não tem telas | Implementar telas |
| UI de notificações | `GET /me/notifications` existe; app não tem tela | Implementar tela |
| Assinaturas (fase 11) | Branches `phase11-*` não estão em `main` | Merge/revisão humana das PRs #20/#24 |
| Biometria/câmera/upload de documentos | Exige dispositivo + `media` module no app | Fase futura |
| Vertical de sinistro/guincho/carro reserva | Telas Stitch desse módulo não têm backend equivalente completo no app | Definir escopo |

## 5. Resultado dos testes e CI

### Local (VERIFICADO — saídas na seção 2.1)
- backend: typecheck ✅, lint ✅, build ✅, format:check ✅ (após correção), vitest **37/37 ✅**.

### GitHub Actions — PR #27 (VERIFICADO)
| Run | backend | mobile (analyze + test + APK) | windows-driver |
|---|---|---|---|
| 37993761173 (1º) | ❌ infra Postgres do Actions | ❌ `flutter analyze` (lints) | ✅ |
| 37995949040 | ✅ | ❌ `flutter test` (3/13) | ✅ |
| 37997331372 | ✅ | ❌ `flutter test` (8/13) | ✅ |
| 38000147761 (final) | ✅ | ✅ **tudo verde** | ✅ |

Execução final (run 38000147761): steps `flutter analyze` ✅, `flutter test` ✅ (13/13 widget tests),
`flutter build apk --debug` ✅, artefatos `nexo-android-debug` e `nexo-windows-driver` publicados ✅.
Evidência: `gh api repos/heldergaraujo2/Nexo/actions/jobs/114055976021` → todos os steps `success`.
PR #26 (run 37982165847): backend ✅ mobile ✅ windows-driver ✅ (mantida como referência).

## 6. Matriz de rastreabilidade

| Funcionalidade | Tela | Endpoint/serviço | Persistência | Testes existentes | Testes faltantes | Estado atual | Evidência | Próxima ação |
|---|---|---|---|---|---|---|---|---|
| Login/logout | `login_page.dart` | `POST /auth/login`, `GET /me` | accounts, profiles | `widget_test.dart` (5) | token expirado no app | Implementada e testada (widget) | PR #27 | — |
| Rota por papel | `login_page.dart` → shells | `GET /me.isProvider` | — | `widget_test.dart` | — | Implementada e testada (widget) | PR #27 | — |
| Solicitação de corrida | `passenger_shell.dart` | `POST /rides/requests` | service_requests, rides | `passenger_flow_test.dart` | teste físico | Implementada e testada (widget) | PR #27 | validação física |
| Destino validado | `passenger_shell.dart` | `CoordinateDto` | — | `passenger_flow_test.dart` | geocoding | Implementada e testada | PR #27 | decidir geocoding |
| Rastreamento de estados | `passenger_shell.dart` | `GET /services/:id`, `GET /rides/:id` | rides | `passenger_flow_test.dart` | — | Implementada e testada (widget) | PR #27 | — |
| Cancelamento com motivo | modal em `passenger_shell.dart` | `POST /requests/:id/cancel`, `POST /rides/:id/cancel` | service_requests/rides | `passenger_flow_test.dart` | transições inválidas (backend cobre) | Implementada e testada (widget) | PR #27 | — |
| Disponibilidade do motorista | `driver_shell.dart` | `PUT /me/marketplace` | provider_marketplace | `driver_flow_test.dart` | teste físico | Implementada e testada (widget) | PR #27 | validação física |
| Radar de chamadas | `driver_shell.dart` | `GET /me/marketplace/open-requests` | service_requests | `driver_flow_test.dart` | — | Implementada e testada (widget) | PR #27 | — |
| Aceite + transições | `driver_shell.dart` | `POST /requests/:id/accept`, `POST /rides/:id/*` | services, rides | `driver_flow_test.dart` (estado completo) | corrida concorrente (backend cobre) | Implementada e testada (widget) | PR #27 | — |
| Histórico | `account_tabs.dart` | `GET /me/services/history` | services | `account_tabs_test.dart` | paginação/scroll longo | Implementada e testada (widget) | PR #27 | — |
| Perfil + edição de perfil | `account_tabs.dart` (`ProfileEditPanel`) | `GET /me`, `PUT /me/profile` | profiles | `account_tabs_test.dart`, `account_features_test.dart` (2) | — | Implementada e testada (leitura + edição real) | CI rodada 3 | — |
| Pagamentos/registro financeiro | `account_tabs.dart` (`ServicePaymentsPanel`) | `GET/POST /payment-records/services/:id`, `POST /payment-records/:id/confirm` | payment_records | `payment.integration.spec.ts` (5 ✅), `account_features_test.dart` (3) | UI de disputa (endpoint pronto) | Implementada e testada (listar/registrar/confirmar por serviço) | CI rodada 3 | disputa/cupom |
| Avaliações/reputação | `account_tabs.dart` (`RateServicePanel`, `ReputationPanel`) | `POST /ratings`, `GET /profiles/:id/ratings` | ratings | `trust.integration.spec.ts` (6 ✅), `account_features_test.dart` (3) | moderação/favoritos (admin) | Implementada e testada (avaliar pós-serviço + reputação no perfil) | CI rodada 3 | — |
| Notificações | `NotificationsTab` (aba nos 2 shells) | `GET /me/notifications` | notifications | `account_features_test.dart` (3) | marcar como lida (sem endpoint) | Implementada e testada | CI rodada 3 | endpoint de leitura |
| Entrega/carga/guincho | — | `deliveries`, `cargo`, `towing` | migrations 009–011 | integration ✅ (4+2+3) | UI | Backend pronto; UI não implementada | vitest local | telas |
| Assinaturas | — | fase 11 (branch) | — | — | tudo | Bloqueada (branch fora de main) | PRs #20/#24 | decisão humana |
| Sinistro (vertical Stitch) | telas Stitch | sem backend equivalente | — | — | tudo | Não implementada | inventário Stitch | definir escopo |
| Biometria/câmera | telas Stitch | `media` (parcial) | media | — | tudo | Não implementada | inventário Stitch | fase futura |

## 7. Instalação e execução (resumo)

- **Backend:** `cd backend && npm install && npm run build`. PostgreSQL via `docker-compose.yml` (ou serviço local),
  aplicar `backend/migrations/001…011` em ordem, `DATABASE_URL` e `AUTH_TOKEN_SECRET` no ambiente, `npm run start`.
  Contas de teste: `npm run e2e:provision` (sem credenciais no repositório).
- **App Flutter:** `cd mobile && flutter pub get && flutter test && flutter build apk --debug`.
  URL da API é configurada na tela de login (emulador Android: `http://10.0.2.2:3000/v1`; dispositivo físico: IP LAN do PC).
- **Artefatos:** APK `nexo-android-debug` e zip `nexo-windows-driver` publicados pelos jobs do workflow Nexo CI.

## 8. Limitações conhecidas

- Sem busca de endereço (só coordenadas) — deliberado: não inventar dados.
- Polling de 2s (sem WebSocket) — funcional, porém não escalável.
- Sem refresh token no cliente (token curto + relogin).
- `flutter` não existe neste sandbox — toda validação Flutter depende do GitHub Actions ou do PC do usuário.

## 9. Atualização — resultado final da rodada (2026-10-09)

- **CI da PR #27: VERDE nos 3 jobs** (run 38000147761) — backend, mobile (analyze+test+APK) e windows-driver.
- **13/13 testes de widgets Flutter PASS** no CI (login/validação/rota por papel; solicitação com destino real;
  validação de coordenadas; rastreamento; cancelamento com motivo; disponibilidade; radar; aceite; máquina de
  estados completa; histórico/perfil/logout) + **37/37 testes backend** locais com PostgreSQL real.
- Correções realizadas nesta rodada: lints do Flutter (chaves em if multi-linha, TextStyle const, textos de
  eyebrow em asserts), viewport alto nos testes (widgets lazy de ListView não eram construídos no viewport
  800×600), Prettier do backend, e instrumentação de CI (tee + artefato + anotações `::error::` para falhas de
  teste — logs/artefatos do Actions não são baixáveis de redes restritas).
- **Ainda depende de ação humana:** instalar o APK em Android físico, executar o pacote Windows, e rodar o
  fluxo ponta a ponta passageiro×motorista (seção 4). Não validado em dispositivo real por este agente.
- Estado de prontidão: **implementação pronta para validação física** — NÃO "pronto para produção".

## 10. Atualização — rodada 2 (2026-10-10)

**Registro completo das 8 tarefas obrigatórias da rodada 2** (regras da seção 0: toda afirmação tem saída real colada no relatório da rodada):

- **T1 — Conteúdo completo dos documentos de controle:** `PROJECT_STATUS.md` (este arquivo) e `docs/UI_STITCH_FLUTTER_INTEGRATION.md` entregues integralmente no relatório da rodada. O documento de integração Stitch foi reescrito com o **inventário das 48 telas** (19 passageiro em 18 linhas — a linha 18 cobre 2 variantes Shopping Eldorado —, 4 pagamento/itens, 18 motorista, 7 sinistro), cada uma com implementada/parcial/não implementada/fora de escopo e justificativa, confrontadas tela a tela contra os `code.html`/`screen.png` do diretório `stitch_nexo_ui_redesign/` (47 linhas de tabela, 48 `code.html`, zero ausente).
- **T2 — Integridade dos testes:** auditoria `git diff` de cada commit do caminho 3→8→13/13 (`7d6ab9d`, `b6a9b81`, `a9fbcdf`, `d869a52`, `033b190`). **Nenhum caso de enfraquecimento (c): zero `expect` removidos** (widget_test 18→18, passenger_flow 16→16; totais em driver_flow 13 e account_tabs 9). Os 3 asserts alterados em `7d6ab9d` foram substituídos pela forma correta (o widget `Eyebrow` renderiza em MAIÚSCULAS — bug do teste, classificação (b)); `b6a9b81` = `ensureVisible` para taps fora da viewport (b); `a9fbcdf` = viewport alto `useTallScreen` porque ListView lazy nunca construía os filhos (b, causa raiz real da suíte); `d869a52` = `// ignore: avoid_print` em prints de diagnóstico já existentes; `033b190` = pumps de Timers + artefato de saída. Os 13 `testWidgets` (arquivo+nome) e o resultado individual de cada um são emitidos por `report_test_results.py` (anotação `::notice::` por teste) e listados no relatório da rodada.
- **T3 — PR #26 vs #27:** o PR #26 (integração Stitch, base `262a048`) foi trazido para esta branch pelo merge real `533392e` sem conflitos; o PR #27 implementa e valida o mesmo fluxo (regra do projeto: **não dividir o fluxo principal**). Decisão documentada: **fechar #26 sem mesclar** (conteúdo 100% contido em #27 via `533392e`; sem risco de merge duplo). Comentário público da decisão: [pull/26#issuecomment-6091948654](https://github.com/heldergaraujo2/Nexo/pull/26#issuecomment-6091948654); body do #27 atualizado via API real declarando "substituindo o PR #26": [pull/27](https://github.com/heldergaraujo2/Nexo/pull/27).
- **T4 — E2E de API real (sem dispositivo):** `backend/scripts/e2e-api-flow.mjs` executado contra backend Nest real + Postgres real: **25/25 checks PASS** — registro de passageiro A, passageiro B e 2 motoristas; login; `PUT /me/marketplace` disponível; `POST /rides/requests` com tarifa servida (fareCents=13128 para 6.564 m a 200 cents/km); persistência confirmada por **GET de API e SELECT SQL direto**; `open-requests` listando o pedido; aceite criando serviço+corrida; **segundo aceite rejeitado (409)**; replay com mesmo `Idempotency-Key` idempotente; aceite duplicado com chave nova rejeitado (409); transições `driver_en_route→arrived→started→completed`; histórico completo para os 2 usuários (e vazio para B); **B bloqueado de ler a corrida/serviço de A (403)**; sem token e token inválido rejeitados (401). **A camada UI/GPS continua BLOQUEADA para validação física** (sem dispositivo físico). Evidência: saída integral colada no relatório da rodada.
- **T5 — Auditoria de segurança/qualidade:** segredos = apenas fixtures de teste (`backend/test/*.spec.ts`); **sem CORS configurado** (nenhum `enableCors`/helmet — default fechado para clientes não-browser; documentar quando houver frontend web); verificação de posse conferida em todos os endpoints de recurso do usuário (`ride.service.ts:131-133/158-159/172/232`, `marketplace.service.ts:114-115/297/543-544`, `payment.service.ts:42-43/115-116/181-184/217-220`, perfil/histórico/notificações com `WHERE account_id=$1` — **nenhum endpoint sem checagem**); `npm audit`: 3 vulnerabilidades (2 critical `tinypool` RCE gadget + 1 moderate `@vitest/mocker`), **todas dev-only via vitest** (correção exige vitest@5 breaking — PR dedicado); migrações com FKs `ON DELETE CASCADE` e índices conferidos (`idx_services_customer/provider(status,completed_at)`, `idx_service_requests_open/provider_match`, `idx_rides_state/created`); dados de teste/seed: `backend/scripts/provision-e2e.ts` cria contas `nexo.e2e.*@example.test` com senha default `'123456789'` (env `E2E_DRIVER_PASSWORD`/`E2E_PASSENGER_PASSWORD`) — explicitamente de teste, domínio `.test` reservado, documentado como risco se usado fora de ambiente efêmero. Achado adicional do E2E: UUID inválido em path params devolve **500** (deveria ser 400/404) — registrado como melhoria futura.
- **T6 — Grep de placeholders:** varredura `todo|fixme|mock|fake|dummy|lorem|placeholder|hardcoded` em `mobile/` e `backend/`: apenas `mockClient` do helper de testes (`mobile/test/helpers.dart`) e `placeholders` de binds SQL nos specs — **todos benignos**; zero hits em `mobile/lib` e `backend/src`.
- **T7 — Job `windows-driver`:** builda o app **Windows desktop** do motorista (matriz de plataformas Android+Windows): `checkout` → `flutter create --platforms=windows .` (gera o scaffold `windows/` ausente no repositório) → `flutter pub get` → `flutter build windows --release` → upload do artefato `nexo-windows-driver`. YAML real colado no relatório da rodada. A ferramenta Flutter Windows só está disponível em `runs-on: windows-latest`.
- **T8 — Atualização obrigatória do repositório:** tudo commitado nesta branch (documentos, `e2e-api-flow.mjs`, `report_test_results.py`, correção do DTO `acceptingRequests`); `git status` limpo (saída real colada no relatório); body do PR #27 atualizado via API real; push real na branch `arena/af7a1fc1-nexo`; CI acompanhado até verde (3 jobs, `gh pr checks` real colado); HEAD final com link direto; **`main` NÃO foi alterada diretamente** (confirmado por `git ls-remote origin main`). Scripts locais descartáveis **não commitados de propósito** (documentados aqui): `backend/.local-test-pg.cjs` e `backend/.local-e2e-run.cjs` (orquestradores com Postgres embutido para rodar a suíte/E2E neste sandbox sem Docker) e `backend/package-lock.json` gerado localmente.

**Bug real de aplicação encontrado e corrigido nesta rodada (classificação (a)):** `MarketplaceAvailabilityDto.acceptingRequests` estava declarado **sem decorator de validação**; com `whitelist+forbidNonWhitelisted` do ValidationPipe, `PUT /me/marketplace` devolvia **400** para o payload real do app (`driver_shell.dart:59` envia o campo). Corrigido na causa raiz com `@IsBoolean()` (`backend/src/marketplace/dto.ts`). Escapou dos testes porque os specs constroem DTOs direto no serviço (sem o pipe) e o app testa contra HTTP mockado — exatamente o tipo de brecha que o E2E de API real da T4 foi desenhado para capturar.

## 11. Atualização — rodada 3 (2026-10-10)

**PARTE A — inconsistências da rodada 2 resolvidas (evidências brutas no relatório da rodada):**
- A1: `git show 7d6ab9d -- mobile/test/` colado integralmente; o número real de asserts alterados é **3** (pares `Histórico de atividades`→`HISTÓRICO DE ATIVIDADES`, `Área do passageiro`→`ÁREA DO PASSAGEIRO`, `Central do motorista`→`CENTRAL DO MOTORISTA`). A discrepância do relatório anterior: os 2 pares ilustrativos colados na rodada 2 usavam strings **erradas** (da memória, não do diff) — a contagem (3) estava correta; a citação, não. Corrigido com o diff bruto.
- A2: `expect(` por arquivo (baseline→HEAD): `widget_test` 5 (`869040c`)→18 (expandido em `265ace6`), `passenger_flow` 16→16, `driver_flow` 13→13, `account_tabs` 9→9 — **zero removidos**.
- A3: script `verify_48_screens.py` + saída completa colados: 48/48 pastas `code.html` cobertas, numeração 1..47, zero faltantes/duplicadas.
- A4: `npm audit` bruto: 3 vulns (2 critical `tinypool` GHSA-5gmw-xhrv-c9v3/GHSA-85c8-ppgw-ccpr + 1 moderate `@vitest/mocker` GHSA-82fw-gwwq-j7x9), todas dev-only via vitest; fix exige vitest@5 (breaking) — PR dedicado.
- A5: diff bruto do commit `8662dcb` (linhas `+ @IsBoolean()` / `+ IsBoolean,`) colado.
- A6: contradição resolvida na EXECUÇÃO: `gh pr view 26` mostrava OPEN — a decisão da rodada 2 só havia sido RECOMENDADA. PR #26 **fechada sem mesclar** em `2026-10-10T10:06:23Z` (`gh pr close 26`, autorização do usuário), `mergedAt: null`, conteúdo preservado em #27 via `533392e`.
- A7: bug do 500 com UUID inválido **corrigido na causa raiz**: `ParseUUIDPipe` em todos os 64 path-params de ID (10 controllers) + filtro global `PgInvalidTextRepresentationFilter` (SQLSTATE `22P02`→400, registrado via `APP_FILTER`). Teste negativo real: `bad-request.integration.spec.ts` (6 testes: 400 para ids malformados, 404 para uuid válido inexistente, 401 para sem token) + 2 checks novos no E2E de API real (`e2e-api-flow.mjs`, 27/27 contra `node dist/main.js`).

**PARTE B — telas com backend pronto implementadas (contratos reais lidos dos controllers/DTOs):**
- **Edição de perfil** (`ProfileEditPanel` → `PUT /me/profile`): formulário com validação local (nome 2–120, bio ≤500, profissional ≤1000, foto ≤2048) na aba Perfil.
- **Pagamentos** (`ServicePaymentsPanel` → `GET/POST /payment-records/services/:id`, `POST /payment-records/:id/confirm`): listar/registrar (cliente) e confirmar (motorista) por serviço no histórico.
- **Avaliações** (`RateServicePanel` → `POST /ratings` nota 1–5 + comentário; `ReputationPanel` → `GET /profiles/:id/ratings` com média/total/comentários no perfil).
- **Notificações** (`NotificationsTab` → `GET /me/notifications`): nova aba nos 2 shells.
- 11 testes de widget novos em `mobile/test/account_features_test.dart` (feliz + erro para cada feature); matriz §6 e inventário Stitch (#9, #19, #31, #33, #34) atualizados.

**PARTE C — testes negativos:**
- C1: **token expirado** — `expired-token.integration.spec.ts`: `TokenService.sign(principal, -60)` (TTL negativo = `exp` no passado; verificação `exp <= now → 401` é a mesma do produção, TTL default 900s) → 401 `Invalid access token`; controle positivo com token fresco → 200.
- C2: **backend indisponível** — teste de widget `account_features_test.dart` com cliente que falha a conexão (`SocketException`): painel de erro amigável "Não foi possível falar com a API…" renderizado, `takeException() == null` (sem crash).
- C3: **CORS** — posição inalterada e confirmada após as mudanças: 0 ocorrências de `cors`/`helmet`/`enableCors` em `backend/src` (default fechado para clientes não-browser; configurar quando houver frontend web).

**PARTE D — fechamento:** `git status` limpo, push real, docs atualizadas (diff colado), PR #27 atualizado, CI 3 jobs verde colado, HEAD + link, `main` intacta — tudo no relatório da rodada.
