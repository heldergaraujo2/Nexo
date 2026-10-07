# Nexo — Next Task

## Current objective
Executar a **FASE 6 — PAGAMENTOS E REGISTRO FINANCEIRO**.

## Entregas
- [ ] registro de dinheiro físico
- [ ] registro de Pix
- [ ] registro de cartão na máquina do próprio profissional
- [ ] confirmação operacional do pagamento
- [ ] valor esperado versus valor confirmado
- [ ] estado financeiro consistente e auditável
- [ ] vínculo PaymentRecord → Service/Ride
- [ ] proteção contra alteração retroativa do preço concluído
- [ ] idempotência e concorrência
- [ ] histórico/recibo operacional
- [ ] testes unitários, integração, API, segurança e regressão
- [ ] validação mobile do fluxo

## Restrições
- O Nexo não processa cartões inicialmente.
- Não armazenar dados de cartão.
- Dinheiro continua em centavos inteiros + código de moeda.
- O preço do serviço/ride é o snapshot server-side; pagamento não pode reescrever o preço acordado.

## Gate da FASE 6
Um serviço concluído possui registro financeiro consistente, auditável e vinculado ao serviço, sem processamento indevido de cartão pelo Nexo e sem alteração retroativa do preço.

## Próxima fase
FASE 7 — SEGURANÇA OPERACIONAL.
