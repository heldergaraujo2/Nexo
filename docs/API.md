# Nexo — API Specification

**Versão:** 1.0
**Status:** contrato inicial para implementação na Fase 1

## Princípios
- REST/JSON sobre HTTPS.
- Prefixo de versão: /v1.
- Access token curto + mecanismo seguro de renovação.
- Authorization server-side.
- Idempotency-Key em comandos críticos.
- IDs opacos/não sequenciais quando expostos.
- Paginação cursor-based.
- Erros em formato consistente.
- Nunca retornar documentos de identidade/veículo em endpoints públicos.
- Transições de estado validadas pelo servidor.

## Recursos
/v1/auth — cadastro, login, refresh, logout, recuperação.
/v1/me — conta autenticada e preferências.
/v1/profiles — perfil público.
/v1/providers — perfil profissional, disponibilidade e descoberta.
/v1/vehicles — veículos do provider.
/v1/requests — solicitações.
/v1/offers — ofertas.
/v1/services — serviço, estado e histórico.
/v1/rides — viagem.

### Passenger transport
- POST /v1/rides/requests — cria solicitação de passageiro e calcula distância/tarifa server-side.
- GET /v1/rides/:rideId — consulta uma viagem do próprio customer/provider.
- POST /v1/rides/:rideId/driver-en-route — inicia deslocamento do profissional.
- POST /v1/rides/:rideId/arrived — registra chegada.
- POST /v1/rides/:rideId/start — inicia a viagem.
- POST /v1/rides/:rideId/complete — conclui a viagem.
- POST /v1/rides/:rideId/cancel — cancela quando permitido.
- POST /v1/rides/:rideId/route — altera rota com versão esperada e novo snapshot.

### Passenger transport
- POST /v1/rides/requests — cria solicitação de passageiro e calcula distância/tarifa server-side.
- GET /v1/rides/:rideId — consulta uma viagem do próprio customer/provider.
- POST /v1/rides/:rideId/driver-en-route — inicia deslocamento do profissional.
- POST /v1/rides/:rideId/arrived — registra chegada.
- POST /v1/rides/:rideId/start — inicia a viagem.
- POST /v1/rides/:rideId/complete — conclui a viagem.
- POST /v1/rides/:rideId/cancel — cancela quando permitido.
- POST /v1/rides/:rideId/route — altera rota com versão esperada e novo snapshot.
/v1/deliveries — entrega.
/v1/cargo — carga e negociação.
/v1/towing — guincho.
/v1/ratings — avaliações.
/v1/media — upload/moderação.
/v1/subscriptions — assinatura.
/v1/payment-records — registro de pagamento.
/v1/security — segurança operacional.

### Operational safety
- POST /v1/security/vehicles — provider cadastra veículo sem expor documentação.
- GET /v1/security/vehicles — provider consulta seus próprios veículos.
- POST /v1/security/incidents — participante registra incidente relacionado a serviço.
- POST /v1/security/verifications — moderator/admin cria caso privado de verificação.
- PUT /v1/security/verifications/:id — moderator/admin revisa verificação.
- POST /v1/security/fraud-flags — moderator/admin cria flag antifraude.
- PUT /v1/security/fraud-flags/:id — moderator/admin revisa flag.
- GET /v1/security/incidents — moderator/admin consulta incidentes.
- PUT /v1/security/incidents/:id — moderator/admin avança incidente conforme máquina de estados.
- GET /v1/security/events — moderator/admin consulta eventos de segurança.

Dados privados de verificação não são retornados por endpoints públicos. Perfis públicos recebem somente indicadores de verificação confirmada.

### Payment recording

HTTP semantics: payment record creation returns **201 Created**; confirmation and dispute return **200 OK**.

- POST /v1/payment-records/services/:serviceId — customer registra método de pagamento para serviço concluído.
- GET /v1/payment-records/services/:serviceId — customer/provider consulta histórico financeiro do serviço.
- GET /v1/payment-records/:paymentId — consulta um registro com ownership.
- POST /v1/payment-records/:paymentId/confirm — provider confirma valor operacionalmente.
- POST /v1/payment-records/:paymentId/dispute — customer/provider registra disputa antes da confirmação.

Métodos iniciais: `cash`, `pix`, `provider_card_machine`. O Nexo não processa cartão nem armazena número, CVV ou dados equivalentes.
/v1/safety — denúncias e bloqueios.
/v1/admin — administração autorizada.

## Erro
{
  "error": {
    "code": "RESOURCE_STATE_INVALID",
    "message": "Operation is not allowed in the current state.",
    "requestId": "opaque-id"
  }
}

Mensagens não devem revelar dados privados ou facilitar enumeração.

## Idempotência
POSTs críticos aceitam Idempotency-Key. A mesma chave com payload diferente falha; repetição com o mesmo payload retorna o mesmo resultado lógico.

## Autorização
Toda operação verifica identidade, papel/capacidade, ownership/relação, estado atual e pré-condições.

## Paginação
Listas usam cursor, limite máximo e ordenação definida pelo servidor.

## Auditoria
Alteração de preço, aceite, cancelamento, pagamento, assinatura, verificação, moderação e segurança geram AuditEvent.

## Preço
O servidor retorna modalidade, distância usada, tarifa por km, arredondamento e total em centavos. O cliente nunca é autoridade do preço.

## Negociação
Cargo usa versão/estado atual para evitar concorrência. A proposta aceita vira o preço final.

## Mídia
Upload usa URL temporária. O backend confirma tamanho, MIME, checksum e moderação antes da publicação.
