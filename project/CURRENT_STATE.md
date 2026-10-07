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
- [x] PaymentRecord para dinheiro, Pix e máquina própria do provider
- [x] preço esperado derivado do snapshot imutável do Service
- [x] confirmação exclusiva do provider vinculado
- [x] divergência de valor rejeitada
- [x] disputa pré-confirmação
- [x] ownership e autorização
- [x] idempotência e locks transacionais
- [x] auditoria de criação, confirmação e disputa
- [x] nenhum dado de cartão armazenado/processado pelo Nexo
- [x] trigger PostgreSQL impede alteração de preço/moeda após conclusão
- [x] mudança de rota sincroniza o preço do Service antes da conclusão
- [x] tela mobile inicial de registro/confirmação
- [x] CI backend/mobile verde; APK debug construído

## Fase 6 — gate
**APROVADO.** Serviços concluídos podem registrar e confirmar dinheiro, Pix ou cartão na máquina própria do provider sem processamento de cartão pelo Nexo e sem alteração retroativa do preço.

## Fase atual
**FASE 7 — SEGURANÇA OPERACIONAL**

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Verificação de identidade/veículo operacional pertence à Fase 7.
- Fluxo mobile visual completo de passageiro ainda será aprofundado nas fases de UX/integração, sem alterar as regras server-side já implementadas.
