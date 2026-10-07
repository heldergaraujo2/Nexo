# Nexo — Modelo de Dados Inicial

**Versão:** 1.0  
**Status:** FASE 0 — aprovado para implementação inicial

## Entidades principais

### Account
Identidade de autenticação: id, email/telefone conforme estratégia adotada, credenciais/identificadores externos, estado, timestamps.

### Profile
Dados públicos: account_id, nome de exibição, foto, biografia, informações profissionais, estado de publicação.

### Verification
Dados restritos de identidade/veículo, tipo, estado, provedor de verificação, referências externas, timestamps e resultado. Documentos brutos nunca fazem parte do perfil público.

### Provider
Extensão profissional da conta, categorias, disponibilidade e estado operacional.

### Vehicle
provider_id, tipo, marca/modelo, identificadores necessários, estado de verificação e atributos operacionais mínimos.

### ServiceRequest
customer_id, categoria, origem/destino quando aplicável, descrição, requisitos, mídia, estado, timestamps.

### Offer
request_id, provider_id, tipo, valor quando aplicável, estado, expiração e timestamps.

### Negotiation
request/service_id, participantes, versão da negociação e status. Cada proposta deve possuir registro imutável.

### Service
request_id, provider_id, customer_id, categoria, estado, preço acordado/calculado, moeda, snapshots operacionais e timestamps.

### Ride
service_id, vehicle_id, modalidade, origem/destino, distância usada no cálculo, tarifa por km, valor calculado, moeda, versão da rota e estados de execução.

### RideRouteSnapshot
ride_id, versão, origem/destino, distância em metros, tarifa por km, valor em centavos, moeda, motivo e timestamp. Cada versão é única por Ride.

### RideEvent
ride_id, actor_id, estado anterior, estado seguinte, motivo e timestamp; registra transições e alterações operacionais da viagem.

### Delivery
service_id, origem/destino, descrição, mídia e instruções.

### Cargo
service_id, peso/dimensões quando aplicável, descrição, mídia, negociação e preço final aceito.

### Towing
service_id, localização, destino quando aplicável, problema, mídia e dados operacionais.

### PaymentRecord
service_id, método (`cash`, `pix`, `provider_card_machine`), valor esperado em centavos, valor confirmado em centavos, moeda, estado, ator/data de confirmação e referência externa opcional. Não armazena dados de cartão. Registro ativo único por serviço.

### Subscription
provider_id, plano, preço contratado, estado, período atual, datas de renovação/cancelamento e referência do billing provider.

### Rating
service_id, author_id, subject_id, nota, comentário, estado de moderação e timestamps. Unicidade por serviço/autor.

### MediaAsset
owner_id, tipo, localização privada do objeto, MIME/type validado, tamanho, checksum, estado de moderação, visibilidade e timestamps.

### SafetyReport
reporter_id, target/service_id, categoria, descrição, estado, prioridade e timestamps.

### Block
blocker_id, blocked_id, estado e timestamps.

### Notification
recipient_id, tipo, payload mínimo, canal, estado de entrega e timestamps.

### AuditEvent
actor_id quando aplicável, tipo, recurso, recurso_id, ação, resultado, metadata minimizada, correlation_id e timestamp.

## Relacionamentos e integridade

- Account 1:1 Profile.
- Account 0:1 Provider.
- Provider 1:N Vehicle.
- Account 1:N Verification, com escopo restrito.
- Account 1:N ServiceRequest como cliente.
- ServiceRequest 1:N Offer.
- ServiceRequest 0:1 Service após aceite.
- Service 1:1 Ride/Delivery/Cargo/Towing conforme categoria.
- Service 1:N PaymentRecord somente quando o fluxo exigir histórico.
- Provider 1:N Subscription ao longo do tempo, com no máximo uma assinatura ativa.
- Service 1:N Rating, limitado por autor e contraparte.
- Account 1:N MediaAsset.
- Account 1:N SafetyReport.
- Account N:N Account via Block.
- Recursos críticos possuem AuditEvent.

## Regras de persistência

- IDs internos devem ser não previsíveis quando expostos externamente.
- Valores monetários devem usar unidade inteira mínima (centavos), nunca floating point.
- Distância deve usar unidade inteira definida pelo domínio (metros) e precisão explícita.
- Timestamps devem ser armazenados em UTC.
- Soft delete somente onde retenção/auditoria exigir; não usar soft delete para tudo.
- Restrições únicas e foreign keys devem proteger invariantes críticas.
- Mudanças de estado devem ocorrer em transação quando houver efeitos dependentes.
- Snapshots de preço/tarifa devem preservar a regra usada no momento do aceite.
