# Nexo — Next Task

## Current objective
Executar a **FASE 4 — MARKETPLACE CORE**.

## FASE 4 — entregas
- [ ] modelo de ServiceRequest
- [ ] criação de solicitações pelo cliente
- [ ] categorias e requisitos operacionais
- [ ] descoberta de profissionais elegíveis
- [ ] disponibilidade do profissional
- [ ] matching inicial
- [ ] ofertas e aceite quando aplicável
- [ ] criação do Service após aceite
- [ ] máquina de estados server-side
- [ ] cancelamento e expiração com ator/motivo
- [ ] histórico operacional
- [ ] idempotência dos comandos críticos
- [ ] auditoria de criação, matching, aceite e cancelamento
- [ ] testes unitários, integração, concorrência, API e segurança relevantes
- [ ] preparação específica para o fluxo de passageiro da Fase 5

## Gate da FASE 4
Clientes conseguem criar solicitações e profissionais elegíveis conseguem receber e aceitar oportunidades sem permitir dupla aceitação ou transições inválidas. O servidor mantém a relação íntegra entre solicitação e serviço e registra os eventos críticos.

## Critérios técnicos
- [ ] constraints e índices protegem invariantes
- [ ] matching respeita categoria, disponibilidade e bloqueios aplicáveis
- [ ] aceite concorrente é serializado/validado
- [ ] ServiceRequest → Service é no máximo 1:1 após aceite
- [ ] estados são validados no servidor
- [ ] comandos críticos suportam retry/idempotência
- [ ] cancelamento/expiração são auditáveis
- [ ] endpoints protegidos respeitam ownership/capacidade
- [ ] dados públicos não expõem informações privadas

## Próxima fase
FASE 5 — PASSENGER TRANSPORT.
