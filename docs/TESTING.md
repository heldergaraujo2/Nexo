# Nexo — Estratégia de Testes

**Versão:** 1.0

## Pirâmide

### Unitários
Cobrir regras puras: tarifas, arredondamento, elegibilidade, permissões, estados, negociação, reputação e assinatura.

### Integração
Cobrir banco, transações, autenticação, autorização, idempotência, notificações e armazenamento de mídia.

### API
Validar contratos, códigos de erro, schemas, paginação, autenticação, autorização e limites.

### Segurança
Testar acesso horizontal/vertical indevido, enumeração, replay, brute force/rate limiting, upload malicioso, exposição de PII, secrets, CORS/CSRF quando aplicável e abuso de endpoints.

### E2E
Cobrir jornadas críticas: cadastro → perfil → solicitação → aceite → execução → pagamento → avaliação; e negociação de carga.

### Mobile
Testar telas pequenas, touch, offline/intermitência, permissões, localização, notificações, retomada após background, desempenho e acessibilidade.

### Regressão
Toda mudança em regra de negócio deve executar a suíte correspondente e testes de regressão dos fluxos afetados.

## Casos obrigatórios de domínio

### Fase 6 — pagamentos e registro financeiro
- Criação retorna HTTP 201 e confirmação/disputa retornam HTTP 200.
- Migrations 001–007 são aplicadas em ambiente limpo.
- Serviço incompleto não aceita registro de pagamento.
- Métodos permitidos são dinheiro, Pix e máquina própria do provider.
- Confirmar valor diferente do snapshot é rejeitado.
- Somente provider vinculado confirma pagamento.
- Customer/provider sem relação não acessa pagamento.
- Repetição com mesma Idempotency-Key retorna o mesmo registro.
- Mesma chave com payload diferente é rejeitada.
- Nenhum campo de cartão é persistido.
- Preço de serviço concluído não pode ser alterado no banco.
- Disputa não permite confirmação de valor divergente.

### Fase 5 — transporte de passageiros
- Solicitação de carro calcula tarifa a R$2,00/km.
- Solicitação de motocicleta calcula tarifa a R$1,50/km.
- Distância permanece em metros e dinheiro em centavos.
- Fluxo accepted → driver_en_route → arrived → started → completed é validado.
- Cancelamento em estado iniciado é rejeitado.
- Alteração de rota cria nova versão/snapshot.
- expectedRouteVersion obsoleto é rejeitado.
- Oferta com negociação de preço em categoria de passageiro é rejeitada.

### Fase 5 — transporte de passageiros
- Solicitação de carro calcula tarifa a R$2,00/km.
- Solicitação de motocicleta calcula tarifa a R$1,50/km.
- Distância permanece em metros e dinheiro em centavos.
- Fluxo accepted → driver_en_route → arrived → started → completed é validado.
- Cancelamento em estado iniciado é rejeitado.
- Alteração de rota cria nova versão/snapshot.
- expectedRouteVersion obsoleto é rejeitado.
- Oferta com negociação de preço em categoria de passageiro é rejeitada.

- Carro: distância zero, valores inteiros, decimais, arredondamento e limites.
- Moto: mesmos cenários.
- Tentativa de negociar preço de passageiro deve ser rejeitada.
- Oferta concorrente não pode ser aceita duas vezes.
- Reenvio de request idempotente não pode criar duas operações.
- Usuário A não pode acessar dados privados de B.
- Rating duplicado deve ser rejeitado.
- Usuário bloqueado deve obedecer às regras de interação.
- Serviço não concluído não pode gerar rating elegível.
- Valor financeiro nunca pode sofrer erro de ponto flutuante.
- Alteração de preço após aceite deve exigir fluxo explícito.
- Uma única assinatura ativa por provider.
- Falha de billing não deve alterar retroativamente o valor de serviços concluídos.

## Qualidade de entrega

Toda fase deve produzir:
- testes executados;
- falhas corrigidas ou registradas;
- cobertura relevante para regras críticas;
- lint/typecheck/build quando aplicável;
- documentação sincronizada.

Nenhum resultado de teste deve ser declarado sem execução real.
