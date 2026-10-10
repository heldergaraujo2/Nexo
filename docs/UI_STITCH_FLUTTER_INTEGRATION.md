# Stitch UI → Flutter integration

**Status (2026-10-09, rodada 2):** integração principal concluída no branch `arena/af7a1fc1-nexo` (PR #27),
incluindo os pontos que a PR #26 marcava como pendentes: navegação inferior real, destino real validado e
abas de histórico/perfil. Este documento traz o inventário individual das 48 telas de referência.
Evidências e matriz de rastreabilidade em `PROJECT_STATUS.md`.

## Reference inventory (VERIFICADO)
`stitch_nexo_ui_redesign/` contém **48 protótipos HTML** (`code.html`) + **49 PNGs** (`screen.png`) +
`nexo_mobility_design_system/DESIGN.md` + 1 PNG avulso (`file_00000000cb54820e87e01991526b16ea.png/`, sem HTML).
O zip original `stitch_nexo_ui_redesign.zip` foi excluído do repositório (commit `2acb25a`); só a extração permanece.

**Legenda de status:** `Implementada` = tela Flutter real ligada a endpoints reais (sem dados fictícios);
`Parcial` = núcleo real implementado, mas elementos da referência ausentes (detalhados); `Não implementada`
= sem tela Flutter (com o motivo); `Fora de escopo` = vertical que não pertence ao app de mobilidade atual.

## Inventário das 48 telas

### A. Fluxo do passageiro (19 telas em 18 linhas)
| # | Tela Stitch | Status | Onde / justificativa |
|---|---|---|---|
| 1 | `nexo_passageiro_in_cio_e_solicita_o` | **Implementada** | `mobile/lib/src/passenger_shell.dart` (homeTab) — GPS real (geolocator), categoria carro/moto, `POST /rides/requests` com Idempotency-Key. Sem mapa (ver #3). |
| 2 | `nexo_passageiro_sele_o_de_categorias_e_estimativas` | **Parcial** | `passenger_shell.dart` (vehicleCard) — `car`/`motorcycle` reais (contrato `CreatePassengerRideDto`). Estimativa exibida somente após a solicitação (tarifa sempre server-authoritative); não há pré-estimativa sem endereço/rota. |
| 3 | `nexo_passageiro_defini_o_de_destino_e_rota` | **Parcial** | `passenger_shell.dart` (requestPanel) + `location.dart` (`validateCoordinate`) — destino real por latitude/longitude validada. Ausentes: busca de endereço, mapa e desenho de rota (backend aceita só coordenadas; nenhum provedor de geocoding integrado — não inventado). |
| 4 | `nexo_passageiro_localizando_motorista_aguardando_aceite` | **Implementada** | `passenger_shell.dart` (`tripState` = `PROCURANDO MOTORISTA`) — casamento real por `requestId` via `GET /me/services/history`. |
| 5 | `nexo_passageiro_motorista_encontrado_corrida_com_paradas` | **Parcial** | Estado "motorista encontrado" real (`serviceId` + `GET /rides/:id`). **Paradas (multi-stop) não existem** no backend — não simuladas. |
| 6 | `nexo_passageiro_acompanhamento_da_chegada` | **Parcial** | Estados reais `driver_en_route`/`arrived` via polling `GET /rides/:id`. Sem mapa animado/ETA. |
| 7 | `nexo_passageiro_embarque_confirmado_e_in_cio_da_viagem` | **Implementada** | Transição `arrived→started` real exibida ao passageiro (`tripState`). |
| 8 | `nexo_passageiro_corrida_em_andamento` | **Implementada** | Estado `started` real + tarifa/distância do servidor. |
| 9 | `nexo_passageiro_viagem_conclu_da_recibo_e_avalia_o` | **Implementada** | Conclusão real (`completed`) + tarifa/histórico reais como recibo. **Avaliação pós-serviço implementada** (`RateServicePanel` → `POST /ratings`, nota 1–5 + comentário) — rodada 3. |
| 10 | `nexo_passageiro_cancelamento_de_corrida_modal_e_motivos` | **Implementada** | `passenger_shell.dart` (`askCancel`) — modal com motivo (≤500) → `POST /requests/:id/cancel` ou `POST /rides/:id/cancel`. |
| 11 | `nexo_passageiro_cancelamento_confirmado_e_reembolso` | **Parcial** | Confirmação de cancelamento real (estado volta a idle). **Reembolso não existe** no backend — não simulado. |
| 12 | `nexo_passageiro_confirma_o_e_rec_lculo_de_novo_destino` | **Não implementada (UI)** | Backend pronto: `POST /rides/:rideId/route` (`ride.controller.ts:84`) com `expectedRouteVersion`. UI pendente. |
| 13 | `nexo_passageiro_alterar_destino_busca_do_novo_local` | **Não implementada (UI)** | Idem #12 (+ busca de endereço inexistente). |
| 14 | `nexo_passageiro_adicionar_parada_no_trajeto` | **Não implementada** | Multi-stop não existe no backend. |
| 15 | `nexo_passageiro_buscando_motorista_corrida_com_paradas` | **Não implementada** | Idem #14. |
| 16 | `nexo_passageiro_confirma_o_de_corrida_com_paradas` | **Não implementada** | Idem #14. |
| 17 | `nexo_passageiro_em_viagem_rumo_1_parada` | **Não implementada** | Idem #14. |
| 18 | `nexo_passageiro_chegada_ao_shopping_eldorado` / `nexo_passageiro_desembarque_e_recibo_final_shopping_eldorado` (2 telas) | **Não implementadas** | Variantes de conclusão com POI nomeado; o fluxo real de conclusão (#9) cobre o comportamento sem inventar locais fixos. |

### B. Pagamento e itens perdidos — passageiro (4 telas)
| # | Tela Stitch | Status | Onde / justificativa |
|---|---|---|---|
| 19 | `nexo_passageiro_pagamento_e_cupom_de_desconto` | **Parcial** | **UI de pagamento implementada** (rodada 3): `ServicePaymentsPanel` → `GET/POST /payment-records/services/:id`, `POST /payment-records/:id/confirm` (listar/registrar/confirmar). **Cupom de desconto não existe** no backend. |
| 20 | `nexo_passageiro_item_encontrado_no_ve_culo` | **Não implementada** | Sem backend de itens perdidos. |
| 21 | `nexo_passageiro_confirma_o_de_recebimento_e_recibo_de_devolu_o` | **Não implementada** | Idem #20. |
| 22 | `nexo_chat_seguro_devolu_o_de_item_esquecido` | **Não implementada** | Sem backend de chat. |


### C. Fluxo do motorista (18 telas)
| # | Tela Stitch | Status | Onde / justificativa |
|---|---|---|---|
| 23 | `nexo_motorista_radar_de_chamadas_e_mapa_em_tempo_real` | **Parcial** | `mobile/lib/src/driver_shell.dart` (radarTab) — `GET /me/marketplace/open-requests` real + toggle de disponibilidade real (`PUT /me/marketplace`). **Sem mapa em tempo real** (não inventado). |
| 24 | `nexo_painel_do_motorista_e_chamadas` | **Implementada** | `driver_shell.dart` — cartões de solicitação reais (`id`, `category`) + aceite `POST /requests/:id/accept`. |
| 25 | `nexo_motorista_chamada_recebida_com_contagem_regressiva` | **Parcial** | Cartão de chamada real. **Contagem regressiva** não implementada (backend tem `expires_at` na request — disponível para uso futuro). |
| 26 | `nexo_motorista_navega_o_at_o_passageiro` | **Parcial** | Estado `driver_en_route` real + ação `driver-en-route`. Sem mapa/navegação GPS turn-by-turn. |
| 27 | `nexo_motorista_rota_at_o_embarque` | **Parcial** | Idem #26 (estado `arrived`). |
| 28 | `nexo_motorista_rota_recalculada_altera_o_de_destino` | **Não implementada (UI)** | Backend pronto: `POST /rides/:rideId/route`. UI pendente. |
| 29 | `nexo_motorista_embarque_confirmado_e_in_cio_da_viagem` | **Implementada** | Ações `arrived→start` reais (`driver_shell.dart` activeRidePanel). |
| 30 | `nexo_motorista_corrida_em_andamento_e_conclus_o` | **Implementada** | Ações `start→complete` reais + tarifa do servidor. |
| 31 | `nexo_motorista_conclus_o_da_viagem_e_avalia_o` | **Implementada** | Conclusão real (`COMPLETED` + "Voltar ao radar") + **avaliação pós-serviço** (`POST /ratings`, ver #9) — rodada 3. |
| 32 | `nexo_motorista_hist_rico_de_corridas` | **Implementada** | `account_tabs.dart` (TripsTab) — `GET /me/services/history` real. |
| 33 | `nexo_motorista_perfil_e_documentos` | **Parcial** | `account_tabs.dart` (ProfileTab) — `GET /me` real + **edição de perfil real** (`PUT /me/profile`, rodada 3) + logout. Documentos não implementados (backend `media` parcial). |
| 34 | `nexo_motorista_reputa_o_e_avalia_es` | **Parcial** | **Reputação implementada** (rodada 3): `ReputationPanel` → `GET /profiles/:id/ratings` (média, total, comentários) no perfil. Pendente: UI de moderação/favoritos (endpoints admin prontos). |
| 35 | `nexo_motorista_biometria_aprovada_in_cio_de_turno` | **Não implementada** | Exige biometria/dispositivo; sem backend de biometria. |
| 36 | `nexo_motorista_selfie_e_prova_de_vida_biometria_facial` | **Não implementada** | Idem #35. |
| 37 | `nexo_motorista_captura_guiada_por_c_mera` | **Não implementada** | Exige câmera/dispositivo. |
| 38 | `nexo_motorista_envio_e_upload_de_documento` | **Não implementada** | Backend `media` parcial (upload); UI/dispositivo pendentes. |
| 39 | `nexo_motorista_resumo_financeiro_e_assinatura` | **Bloqueada** | Assinaturas = fase 11 (PRs #20/#24), **fora de `main`**. |
| 40 | `nexo_motorista_reporte_de_item_esquecido_no_ve_culo` | **Não implementada** | Sem backend de itens perdidos (apenas `security/incidents` genérico). |

### D. Vertical de sinistro/seguros (7 telas) — fora de escopo do app de mobilidade
| # | Tela Stitch | Status | Justificativa |
|---|---|---|---|
| 41 | `nexo_acompanhamento_geral_do_sinistro` | **Fora de escopo** | Vertical de seguro/sinistro; sem domínio/modelo equivalente no backend atual (o módulo `towing` é guincho genérico, não gestão de sinistro). |
| 42 | `nexo_acompanhamento_pericial_guincho_e_carro_reserva` | **Fora de escopo** | Idem. |
| 43 | `nexo_central_de_ajuda_sinistros_24h` | **Fora de escopo** | Idem. |
| 44 | `nexo_devolu_o_do_carro_reserva_e_extrato_final` | **Fora de escopo** | Idem. |
| 45 | `nexo_encerramento_oficial_e_arquivamento_do_sinistro` | **Fora de escopo** | Idem. |
| 46 | `comprovante_oficial_e_recibo_digital_da_devolu_o` | **Fora de escopo** | Idem. |
| 47 | `nexo_voucher_e_retirada_do_carro_reserva_qr_code_check_in` | **Fora de escopo** | Idem. |

*(Nota: a linha 18 cobre 2 telas (`nexo_passageiro_chegada_ao_shopping_eldorado` + `nexo_passageiro_desembarque_e_recibo_final_shopping_eldorado`); total conferido: 19+4+18+7 = 48 telas com `code.html`.)*

## Sistema visual aplicado (VERIFICADO)
Superfícies escuras (`#0A0912`/`#151321`/`#201C31`), violeta (`#9B72FF`/`#B59AFF`), verde operacional
(`#56E3A2`), painéis arredondados — `mobile/lib/src/theme.dart` (BrandMark, Eyebrow, Panel, StatusPill,
ErrorPanel, PageColumn).

## Navegação e integrações (VERIFICADO)
- Navegação real: `IndexedStack` + `NavigationBar` (Início/Viagens/Perfil/Notificações; Chamadas/Viagens/Perfil/Notificações).
- Endpoints reais usados: `POST /auth/login`, `GET /me`, `POST /rides/requests`, `GET /me/services/history`,
  `GET /services/:id`, `GET /rides/:id`, `POST /requests/:id/cancel`, `POST /rides/:id/cancel`,
  `PUT /me/marketplace`, `GET /me/marketplace/open-requests`, `POST /requests/:id/accept`,
  `POST /rides/:id/{driver-en-route,arrived,start,complete}`, `PUT /me/profile` (edição de perfil),
  `GET/POST /payment-records/services/:id`, `POST /payment-records/:id/confirm` (pagamentos),
  `POST /ratings`, `GET /profiles/:id/ratings` (avaliações/reputação), `GET /me/notifications` (aba Notificações).
- Testes de widget: `mobile/test/widget_test.dart`, `passenger_flow_test.dart`, `driver_flow_test.dart`,
  `account_tabs_test.dart`, `account_features_test.dart` (perfil/pagamentos/avaliações/notificações + API indisponível).
- Validação física Android/Windows **não é alegada** — ver `PROJECT_STATUS.md`.

## Limitações explícitas
- Sem busca de endereço/geocoding (backend aceita apenas coordenadas).
- Sem paradas (multi-stop), mapa, ETA, avaliação, pagamento, assinatura, biometria, câmera, chat, itens perdidos.
- Polling de 2s (sem WebSocket).
