# Nexo — Current State

**Version:** 1.4 — FASE 8 concluída / FASE 9 iniciada
**Last updated:** 2026-10-07

## Phase
**FASE 10 — GUINCHO/REBOQUE — PRÓXIMA**

## Fases concluídas
- [x] FASE 0 — Governança e Especificação
- [x] FASE 1 — Fundação Técnica
- [x] FASE 2 — Identidade, Acesso e Perfis
- [x] FASE 3 — Confiança e Reputação
- [x] FASE 4 — Marketplace Core
- [x] FASE 5 — Transporte de Passageiros
- [x] FASE 6 — Pagamentos e Registro Financeiro
- [x] FASE 7 — Segurança Operacional
- [x] FASE 8 — Entregas
- [x] FASE 9 — Carga e Frete Negociável

## Fase 8 — entrega
- [x] origem/destino
- [x] descrição do item
- [x] observações
- [x] metadados de fotos/mídia com validação de tamanho, MIME e checksum
- [x] solicitação de entrega
- [x] matching/eligibilidade do marketplace
- [x] ofertas com preço
- [x] aceite da oferta
- [x] criação de Delivery vinculada ao Service
- [x] máquina accepted → provider_en_route → at_pickup → picked_up → in_transit → delivered
- [x] cancelamento antes da entrega
- [x] eventos/auditoria/notificações
- [x] idempotência e locks transacionais
- [x] proteção contra contorno pelo lifecycle genérico
- [x] fluxo mobile inicial da solicitação
- [x] testes de autorização, estados, API, banco e regressão
- [x] CI backend/mobile aprovado; APK debug construído

## Fase 8 — gate
**APROVADO.** Uma entrega pode ser solicitada, receber oferta com preço, ser aceita, executada, concluída/cancelada com rastreabilidade e proteção de autorização/idempotência.

## Próxima fase
**FASE 9 — CARGA E FRETE NEGOCIÁVEL**

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro; Fase 8 registra metadados de mídia sem expor bucket público.
- Retenção/base legal deve continuar sujeita a revisão jurídica antes da produção.


## Fase 9 — gate
**APROVADO.** Negociação versionada, preço final persistido no Service, Offer real vinculado ao aceite, execução rastreável e proteção de autorização/idempotência.

## Próxima fase
**FASE 10 — GUINCHO/REBOQUE**
