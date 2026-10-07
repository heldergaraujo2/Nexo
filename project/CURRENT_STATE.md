# Nexo — Current State

**Version:** 0.9 — FASE 4 concluída / FASE 5 iniciada
**Last updated:** 2026-10-07

## Phase
**FASE 5 — PASSENGER TRANSPORT — EM EXECUÇÃO**

## Fase 4 — conclusão
- [x] ServiceRequest e criação de solicitações
- [x] categorias, requisitos e disponibilidade profissional
- [x] descoberta/matching respeitando categoria, disponibilidade e bloqueios
- [x] ofertas e aceite direto
- [x] aceite de ofertas com preço
- [x] serialização contra dupla aceitação
- [x] criação 1:1 de Service após aceite
- [x] máquina de estados server-side
- [x] cancelamento de solicitação/serviço
- [x] conclusão e histórico operacional
- [x] notificações essenciais
- [x] idempotência dos comandos críticos
- [x] auditoria de criação, matching, aceite e cancelamento
- [x] testes de API, integração, concorrência, autorização e integridade
- [x] CI backend e mobile aprovado; APK debug construído

## Fase 4 — gate
**APROVADO.** O ciclo genérico do marketplace pode criar uma solicitação, encontrar profissionais elegíveis, aceitar uma oportunidade, criar um único serviço vinculado, executar estados válidos e concluir/cancelar com auditoria e idempotência.

## Fase 5 — objetivo
Implementar transporte de passageiros sobre o núcleo do marketplace:
- origem/destino;
- distância em metros;
- tarifa determinística por categoria;
- carro R$2,00/km;
- motocicleta R$1,50/km;
- arredondamento half-up;
- início/conclusão da viagem;
- alterações de rota;
- cancelamento conforme regras documentadas;
- histórico da viagem.

## Próximo gate
Uma viagem de passageiro pode ser solicitada, aceita, iniciada, concluída e registrada com distância/preço calculados pelo servidor de forma determinística.

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Verificação de identidade/veículo operacional pertence à Fase 7.
