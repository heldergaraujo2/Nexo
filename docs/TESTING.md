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

### Fase 7 — segurança operacional
- Provider só acessa seus próprios veículos.
- Customer não cria/revisa verificação ou flag antifraude.
- VerificationCase de veículo exige veículo pertencente ao account verificado.
- Somente verificação confirmada produz indicador público.
- Incidente ligado a serviço só pode ser criado por participante ou moderator/admin.
- Transições inválidas de incidentes são rejeitadas.
- Fraud flags e security events são restritos a moderator/admin.
- Dados de verificação privada não aparecem no endpoint público.
- Nenhum dado de cartão/documento bruto é persistido pelas novas tabelas.

## Qualidade de entrega

Toda fase deve produzir:
- testes executados;
- falhas corrigidas ou registradas;
- cobertura relevante para regras críticas;
- lint/typecheck/build quando aplicável;
- documentação sincronizada.

Nenhum resultado de teste deve ser declarado sem execução real.


### Fase 8 — entregas
- Solicitação valida origem/destino e descrição do item.
- Mídia valida MIME, tamanho, checksum e limite de itens.
- Delivery exige oferta com preço para aceite.
- Aceite direto genérico de delivery é rejeitado.
- Fluxo completo de estados é validado.
- Transições inválidas retornam conflito.
- Usuário fora da relação customer/provider não acessa a entrega.
- Idempotência de criação/transição é protegida por hash e lock transacional.
- Lifecycle genérico de Service não pode contornar Delivery.
- Mobile valida campos essenciais e build APK.


### Fase 12 — crescimento e retenção
- Código de indicação não permite autoindicação.
- Claim de indicação é idempotente e não permite segunda indicação para a mesma conta.
- Conclusão de serviço qualifica indicação pendente.
- Campanha só pode ser resgatada quando ativa e dentro da janela configurada.
- Resgate duplicado é rejeitado pela constraint do banco.
- Adesão ao programa de fundadores é idempotente.
- Métricas exigem papel `admin` ou `moderator`.
- Taxas de oferta, aceite e conclusão são calculadas sem divisão por zero.
- Retenção é derivada de coortes do primeiro serviço concluído.
- Migration 013 deve executar com ON_ERROR_STOP no CI.
- Backend e mobile continuam sujeitos ao pipeline oficial de typecheck, testes, lint, format e build.

### Fase 13 — escala inicial
- Migration 014 deve executar em banco limpo com ON_ERROR_STOP.
- `/v1/health` deve permanecer liveness simples e `/v1/health/ready` deve validar PostgreSQL.
- Requests devem devolver `x-request-id` e registrar duração sem dados sensíveis.
- Typecheck, testes, build, lint e format permanecem obrigatórios; mobile continua no pipeline.


### Fase 13 — escala e expansão
- Migrations 014, 015 e 016 executam em banco limpo com ON_ERROR_STOP.
- Pool PostgreSQL aceita limites e timeouts configuráveis sem comprometer readiness.
- Correlation ID fornecido pelo cliente é preservado e um ID é gerado quando ausente.
- Resposta inclui duração de request sem registrar payload.
- Matching mantém categoria, elegibilidade, bloqueios e disponibilidade e pode priorizar distância quando há coordenadas válidas.
- Coordenadas inválidas são rejeitadas pelo DTO e nunca entram no ranking.
- Catálogo de categorias é extensível sem alterar o schema de solicitações.
- CI executa backend e mobile completos antes do gate.
