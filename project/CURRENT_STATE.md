# Nexo — Current State

**Version:** 1.2 — FASE 6 concluída / FASE 7 iniciada
**Last updated:** 2026-10-07

## Phase
**FASE 7 — SEGURANÇA OPERACIONAL — PRÓXIMA**

## Fases concluídas
- [x] FASE 0 — Governança e Especificação
- [x] FASE 1 — Fundação Técnica
- [x] FASE 2 — Identidade, Acesso e Perfis
- [x] FASE 3 — Confiança e Reputação
- [x] FASE 4 — Marketplace Core
- [x] FASE 5 — Transporte de Passageiros

## Fase 5 — entrega
- [x] solicitação de corrida com origem/destino
- [x] distância server-side em metros
- [x] tarifa carro R$2,00/km
- [x] tarifa motocicleta R$1,50/km
- [x] cálculo monetário em centavos com arredondamento half-up
- [x] criação de Ride vinculada 1:1 ao Service aceito
- [x] estados accepted → driver_en_route → arrived → started → completed
- [x] cancelamento antes do início
- [x] snapshots de rota e tarifa por versão
- [x] alteração de rota com expectedRouteVersion e novo snapshot
- [x] auditoria de eventos de viagem
- [x] idempotência dos comandos críticos
- [x] bloqueio de negociação livre para passageiros
- [x] testes de integração cobrindo tarifa, ciclo da viagem, rota e negociação
- [x] CI backend e mobile aprovado; APK debug construído

## Fase 5 — gate
**APROVADO.** A viagem de passageiro pode ser solicitada, aceita, executada, concluída ou cancelada conforme estado permitido, com distância e preço calculados pelo servidor, snapshots de rota e proteção contra alteração indevida.

## Fase 6 — entrega
- [x] dinheiro, Pix e máquina própria do provider
- [x] PaymentRecord vinculado ao Service
- [x] confirmação somente pelo provider vinculado
- [x] divergência de valor rejeitada
- [x] disputa pré-confirmação
- [x] auditoria e idempotência
- [x] proteção contra alteração retroativa do preço após conclusão
- [x] nenhum dado de cartão armazenado
- [x] UX mobile e APK debug validados

## Fase 6 — gate
**APROVADO.** O fluxo financeiro registra o método sem processar cartão no Nexo, mantém o valor esperado vinculado ao snapshot do serviço e registra confirmação/disputa de forma auditável.

## Fase atual
**FASE 7 — SEGURANÇA OPERACIONAL**

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Verificação de identidade/veículo operacional pertence à Fase 7.
- Fluxo mobile visual completo de passageiro ainda será aprofundado nas fases de UX/integração, sem alterar as regras server-side já implementadas.
