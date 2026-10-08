# Nexo — Next Task

## Current objective
Concluir o **BLOCO MOBILIDADE E2E (MOB-0 → MOB-10)** antes de retomar a FASE 11.

## Já implementado
- cliente HTTP e sessão Flutter
- login/cadastro por papel
- passenger flow com GPS/mapa e pedido de corrida
- driver online/offline e descoberta de solicitações
- aceite de corrida
- polling de notificações/estado
- estados operacionais de Ride
- endpoints backend para solicitação disponível e rideId no aceite

## Próximas entregas
- [x] cancelamento mobile
- [x] pagamento conectado à corrida e confirmação pelo provider
- [x] rating pós-corrida
- [x] localização contínua do motorista
- [x] matching/ranking por distância real
- [x] timeout/expiração operacional
- [ ] E2E físico passageiro + motorista
- [ ] estabilização e regressão

## Gate
Um passageiro e um motorista conseguem completar uma corrida real em dispositivos distintos contra a API Nexo, com o backend como autoridade dos estados, sem intervenção manual no banco. O código está preparado para o gate, mas a validação física ainda não foi executada.

## Depois do gate
Retomar **FASE 11 — Assinatura dos Profissionais** e seguir automaticamente para FASE 12 e FASE 13 conforme os gates do roadmap.
