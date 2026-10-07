# Nexo — Critérios de Aceitação da FASE 0

**Status:** Gate da FASE 0

## Gate técnico

A Fase 0 está aprovada quando:
- requisitos funcionais e não funcionais estão documentados;
- arquitetura modular está definida;
- stack inicial está registrada;
- modelo de dados e invariantes estão definidos;
- máquinas de estado estão definidas;
- API e contratos estão definidos em nível suficiente para implementação;
- autenticação/autorização estão definidas;
- segurança e privacidade estão definidas;
- LGPD baseline está definido;
- estratégia de testes está definida;
- infraestrutura inicial está definida;
- critérios de aceitação estão documentados;
- regras comerciais permanecem consistentes;
- conflitos conhecidos possuem decisão ou pendência explícita;
- continuidade está sincronizada.

## Gate de produto

- R$99,90/mês e 0% comissão permanecem intactos.
- Profissional mantém 100% do valor do serviço.
- Carro R$2/km e moto R$1,50/km permanecem como regras iniciais.
- Passageiro não negocia livremente preço.
- Carga/frete permite negociação.
- Pagamentos iniciais permanecem dinheiro, Pix e máquina do próprio profissional.
- Nexo Live e Hands-free continuam fora do escopo.

## Resultado

A aprovação deste gate autoriza o início da FASE 1 — Fundação Técnica, mas não inicia a FASE 1 automaticamente.


## Critérios de Aceitação da FASE 5

### Gate técnico
- [x] solicitação de corrida cria ServiceRequest de passageiro;
- [x] distância é calculada server-side em metros;
- [x] tarifas de carro e motocicleta são aplicadas sem floating point;
- [x] Ride é criada somente no aceite do serviço;
- [x] estados da viagem são validados server-side;
- [x] rota e preço possuem snapshots versionados;
- [x] alterações de rota rejeitam versão obsoleta;
- [x] negociação livre de preço é rejeitada para passageiros;
- [x] auditoria/idempotência e integração foram testadas;
- [x] CI backend/mobile está verde e APK debug foi construído.

### Resultado
**FASE 5 APROVADA.** Próximo gate: FASE 6 — Pagamentos e Registro Financeiro.


## Critérios de Aceitação da FASE 6

### Gate técnico
- [x] métodos dinheiro, Pix e máquina própria do provider registrados;
- [x] PaymentRecord vinculado ao Service;
- [x] valor esperado deriva do snapshot de preço do serviço;
- [x] valor confirmado divergente é rejeitado;
- [x] confirmação pertence somente ao provider do serviço;
- [x] customer/provider sem relação não acessa o registro;
- [x] idempotência e concorrência são protegidas por transação/lock;
- [x] auditoria registra criação, confirmação e disputa;
- [x] nenhum dado de cartão é armazenado;
- [x] trigger impede alteração de preço após conclusão;
- [x] fluxo mobile apresenta os métodos e bloqueia valor divergente;
- [x] CI final verde — backend e mobile aprovados no run 256.

### Resultado
**APROVADO. FASE 6 concluída.** Próximo gate: FASE 7 — Segurança Operacional.
