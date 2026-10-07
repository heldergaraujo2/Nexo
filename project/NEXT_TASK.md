# Nexo — Next Task

## Current objective
Executar a **FASE 7 — SEGURANÇA OPERACIONAL**.

## Entregas
- [x] registro de dinheiro físico
- [x] registro de Pix
- [x] registro de cartão na máquina do próprio profissional
- [x] confirmação operacional do pagamento
- [x] valor esperado versus valor confirmado
- [x] estado financeiro consistente e auditável
- [x] vínculo PaymentRecord → Service/Ride
- [x] proteção contra alteração retroativa do preço concluído
- [x] idempotência e concorrência
- [x] histórico/recibo operacional
- [x] testes de integração, API, segurança e regressão
- [x] validação mobile do fluxo

## Restrições
- O Nexo não processa cartões inicialmente.
- Não armazenar dados de cartão.
- Dinheiro continua em centavos inteiros + código de moeda.
- O preço do serviço/ride é o snapshot server-side; pagamento não pode reescrever o preço acordado.

## Fase 6 — gate
**APROVADO.**

## Implementação da Fase 6
- `payment_records` registra método, preço esperado, preço confirmado, moeda, estado e referência externa não sensível.
- Confirmação é exclusiva do provider vinculado e exige valor exatamente igual ao snapshot do serviço.
- Customer e provider podem abrir disputa antes da confirmação.
- Cartão é somente `provider_card_machine`; o Nexo não recebe nem armazena dados de cartão.
- Idempotência e locks transacionais protegem criação/confirmação/disputa.
- Trigger PostgreSQL impede alteração de preço/moeda após conclusão do serviço.
- Mudança de rota da Fase 5 agora sincroniza o novo preço com `services.price_cents` antes da conclusão.

## Gate da FASE 6
**APROVADO.** Serviço concluído possui registro financeiro consistente, auditável e vinculado ao serviço, sem processamento de cartão pelo Nexo e sem alteração retroativa do preço.

## Próxima fase
FASE 7 — SEGURANÇA OPERACIONAL.

## Fase 7 — entregas
- [ ] verificação de identidade
- [ ] verificação de veículo
- [ ] isolamento de dados privados
- [ ] antifraude inicial
- [ ] eventos de segurança
- [ ] suporte/incidentes
