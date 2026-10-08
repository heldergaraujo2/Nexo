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
- [ ] cancelamento mobile
- [ ] pagamento conectado à corrida
- [ ] rating pós-corrida
- [ ] localização contínua do motorista
- [ ] matching/ranking por distância real
- [ ] timeout/expiração operacional
- [ ] E2E físico passageiro + motorista
- [ ] estabilização e regressão

## Gate
Um passageiro e um motorista conseguem completar uma corrida real em dispositivos distintos contra a API Nexo, com o backend como autoridade dos estados, sem intervenção manual no banco.

## Depois do gate
Retomar **FASE 11 — Assinatura dos Profissionais** e seguir automaticamente para FASE 12 e FASE 13 conforme os gates do roadmap.
