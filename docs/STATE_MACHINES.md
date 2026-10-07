# Nexo — Máquinas de Estado

**Versão:** 1.0

## ServiceRequest
DRAFT → OPEN → MATCHED → ACCEPTED → IN_PROGRESS → COMPLETED

Saídas alternativas controladas:
OPEN/MATCHED/ACCEPTED → CANCELLED  
OPEN → EXPIRED  
Qualquer estado operacional permitido → DISPUTED quando houver fluxo formal definido.

Nenhuma transição deve ser aceita apenas pelo cliente; o servidor valida ator, estado atual e pré-condições.

## Offer
CREATED → SENT → ACCEPTED | REJECTED | EXPIRED | WITHDRAWN

Aceite de uma oferta invalida ou encerra ofertas concorrentes conforme regra transacional.

## Cargo negotiation
OFFERED → COUNTERED → OFFERED... → ACCEPTED  
Alternativas: REJECTED, EXPIRED, CANCELLED.

Cada proposta possui número de versão e timestamp. O preço final aceito é snapshot imutável do acordo.

## Ride
ACCEPTED → DRIVER_EN_ROUTE → ARRIVED → STARTED → COMPLETED

Saída alternativa: ACCEPTED/DRIVER_EN_ROUTE/ARRIVED → CANCELLED. Uma viagem STARTED não pode ser cancelada pelo fluxo inicial.

Alteração de rota exige expectedRouteVersion compatível e cria novo snapshot/evento. O preço permanece server-authoritative.

Cancelamento permitido somente nos estados definidos pelo produto, com ator e motivo registrados.

## Payment
PENDING → CONFIRMED | FAILED | DISPUTED

Confirmation requires the provider linked to the service and an amount exactly equal to the immutable service price snapshot. Dispute is available to customer/provider before confirmation.

O método físico/Pix/máquina não deve ser tratado como processado pelo Nexo. O sistema registra a confirmação operacional.

## Subscription
PENDING → TRIALING/ACTIVE → PAST_DUE → SUSPENDED  
ACTIVE/TRIALING → CANCELED  
ACTIVE → EXPIRED quando o período termina sem renovação.

A nomenclatura final deve ser adaptada ao billing provider, preservando o domínio interno.

## Verification
NOT_STARTED → PENDING → VERIFIED | REJECTED | EXPIRED | MANUAL_REVIEW

Casos de verificação são privados e somente moderator/admin podem criar/revisar. Indicador público só aparece como verificado quando o caso está VERIFIED.

## Fraud flag
OPEN → REVIEWING → RESOLVED | DISMISSED

## Incident
OPEN → INVESTIGATING → CONTAINED → RESOLVED → CLOSED

Transições de incidente são server-side e restritas a moderator/admin após a abertura por participante autorizado.

## Media moderation
UPLOADED → PROCESSING → APPROVED | REJECTED | QUARANTINED

## Rating moderation
PUBLISHED → FLAGGED → HIDDEN | RESTORED

## Invariantes
- Não pode existir conclusão sem aceite.
- Não pode existir pagamento confirmado sem serviço relacionado.
- Não pode existir rating elegível sem serviço concluído.
- Não pode existir veículo operacional sem verificação exigida para a categoria.
- Não pode haver duas assinaturas ativas para o mesmo provider.
- Preço de passageiro não pode ser alterado por negociação livre.
- Preço de carga aceito deve corresponder à última proposta aceita.


## Delivery
ACCEPTED → PROVIDER_EN_ROUTE → AT_PICKUP → PICKED_UP → IN_TRANSIT → DELIVERED

Saída alternativa: ACCEPTED/PROVIDER_EN_ROUTE/AT_PICKUP → CANCELLED.

Somente o provider vinculado avança estados operacionais; customer/provider relacionados podem cancelar quando permitido. A máquina Delivery é a autoridade para execução e impede bypass pelos endpoints genéricos de Service.


## Towing
ACCEPTED → PROVIDER_EN_ROUTE → ARRIVED → LOADING → IN_TOW → COMPLETED

Saída alternativa: ACCEPTED/PROVIDER_EN_ROUTE/ARRIVED/LOADING → CANCELLED.

Somente o provider vinculado avança estados operacionais. O fluxo exige provider elegível, veículo verificado e ausência de bloqueio entre participantes.
