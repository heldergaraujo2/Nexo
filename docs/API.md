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
/v1/deliveries — entrega.
/v1/cargo — carga e negociação.
/v1/towing — guincho.
/v1/ratings — avaliações.
/v1/media — upload/moderação.
/v1/subscriptions — assinatura.
/v1/payment-records — registro de pagamento.
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
