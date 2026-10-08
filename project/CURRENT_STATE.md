# Nexo — Current State

**Version:** 1.7 — BLOCO MOBILIDADE E2E EM EXECUÇÃO
**Last updated:** 2026-10-08

## Phase
**BLOCO MOBILIDADE E2E — MOB-0 a MOB-10**

A base de domínio das FASES 0–10 continua válida. O foco foi temporariamente deslocado da FASE 11 para transformar o transporte de passageiros em uma experiência operacional real, com dois papéis no Flutter e API server-side.

## Fases de domínio concluídas
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
- [x] FASE 10 — Guincho/Reboque

## Mobilidade implementada nesta etapa
- [x] cliente HTTP Flutter autenticado
- [x] sessão persistida e logout
- [x] login/cadastro de customer e provider
- [x] URL da API configurável para ambiente LAN
- [x] GPS e permissão de localização
- [x] mapa interativo com origem/destino
- [x] solicitação de corrida carro/moto
- [x] motorista online/offline
- [x] descoberta de solicitações elegíveis
- [x] aceite da corrida
- [x] acompanhamento por polling
- [x] notificações persistidas de aceite e transições de Ride
- [x] execução accepted → driver_en_route → arrived → started → completed
- [x] idempotência e autorização permanecem server-side

## Backend alterado
- GET /v1/requests/available para providers online elegíveis.
- Aceite de corrida retorna rideId para o app.
- Notificação de aceite inclui rideId.
- Transições de Ride notificam o participante oposto.

## Gate atual
**NÃO APROVADO.** O código da vertical slice está implementado, mas ainda falta executar o E2E físico com passageiro e motorista em dispositivos distintos.

## Pendências do bloco MOB
- cancelamento mobile
- pagamento/recibo conectado à corrida
- rating conectado à corrida
- localização contínua do motorista
- ranking por distância real
- timeout/expiração operacional
- WebSocket/SSE, se polling deixar de ser suficiente
- E2E físico, estabilidade, permissões e regressão

## Próximo passo determinístico
Executar/validar MOB-9 e MOB-10. Somente após o gate físico aprovado a continuidade comercial volta para FASE 11 — Assinatura dos Profissionais.

## Regras comerciais preservadas
- R$99,90/mês por provider.
- 0% de comissão.
- Provider mantém 100% do valor do serviço.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Retenção/base legal continua sujeita a revisão jurídica antes da produção.
