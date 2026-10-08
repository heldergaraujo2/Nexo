# Nexo — Arquitetura

**Versão:** 1.0
**Status:** FASE 0 — consolidada para implementação

## Direção
O Nexo será inicialmente um monólito modular, com módulos de domínio separados e contratos internos claros. Isso reduz complexidade operacional sem perder capacidade de evolução.

## Cliente
Flutter/Dart, mobile-first, para Android e iOS. O PC é ambiente de desenvolvimento e administração, não o alvo principal de UX.

## Backend
TypeScript/NestJS, organizado por domínio. Controllers/adapters não devem conter regras centrais; regras vivem em serviços de domínio/aplicação testáveis.

## Persistência
PostgreSQL como banco relacional principal. Migrações versionadas. Valores monetários em centavos e distância em metros.

## Domínios
Identity/Auth, Users/Profiles, Providers/Vehicles, Service Requests, Offers/Negotiation, Rides, Deliveries, Cargo, Towing, Reputation, Media, Subscriptions, Payment Records, Safety/Moderation, Administration e Notifications.

## Limites
- Identidade privada é separada do perfil público.
- Verification não é retornada por endpoints públicos.
- Subscription é independente de Service/PaymentRecord.
- PaymentRecord registra o meio e estado operacional; processamento externo fica em adapter.
- Media usa object storage, nunca blobs públicos diretamente.
- Integrações externas usam interfaces/adapters.
- Auditoria atravessa os domínios sem permitir alteração retroativa do histórico.

## Fluxo
Mobile → HTTPS API → application/domain modules → PostgreSQL/object storage/external adapters.

Não haverá acesso direto do aplicativo ao banco.

## Concorrência e consistência
Mudanças críticas usam transações e constraints. Aceite de oferta, aceite de negociação, confirmação de pagamento e transições de estado devem ser protegidos contra duplicidade e race conditions.

Idempotency-Key será usada em comandos sujeitos a retry.

## Segurança
Autenticação forte, autorização server-side, menor privilégio, rate limiting, validação de entrada, secrets fora do código, logs sem PII desnecessária e auditoria de eventos críticos.

## Integrações
Mapas/rotas, push, identidade e billing serão adapters. A escolha definitiva de fornecedor pode ocorrer na Fase 1 após avaliação de custo, cobertura, privacidade e SLA.

## Escalabilidade
Começar com um backend modular e uma base relacional. Escalar vertical/horizontalmente antes de considerar extração de microserviços.

## Stack registrada
- Flutter/Dart
- TypeScript/NestJS
- PostgreSQL
- Object storage S3-compatible
- Redis opcional quando necessário
- CI/CD automatizado
- observabilidade estruturada


## Fase 13 — observabilidade e performance
- Health liveness não depende do banco; readiness depende de `SELECT 1` no PostgreSQL.
- Correlation ID é propagado no header `x-request-id`; quando ausente, o backend gera UUID.
- Medição de duração usa `process.hrtime.bigint()` para evitar dependência de relógio de parede.
- Performance inicial é tratada com índices PostgreSQL derivados das consultas reais antes de introduzir Redis ou microserviços.


## Fase 13 — Escala e Expansão
- PostgreSQL continua como autoridade transacional; migrations 014–016 adicionam índices, localização operacional opcional e catálogo extensível de categorias.
- O pool PostgreSQL possui limites configuráveis e timeouts de conexão/ociosidade.
- O backend pode ser replicado horizontalmente porque o estado crítico permanece no PostgreSQL e operações críticas são idempotentes/transacionais.
- Matching usa categoria, elegibilidade, disponibilidade, bloqueios, proximidade quando há localização válida e reputação como critérios ordenados.
- Redis, filas e microserviços não entram no caminho crítico sem evidência operacional.
- Expansão geográfica usa coordenadas server-side e não expõe localização operacional do provider no resultado público de matching.


## Fase 13 — Escala e Expansão
- PostgreSQL continua como autoridade transacional; migrations 014–016 adicionam índices, localização operacional opcional e catálogo extensível de categorias.
- O pool PostgreSQL possui limites configuráveis e timeouts de conexão/ociosidade.
- O backend pode ser replicado horizontalmente porque o estado crítico permanece no PostgreSQL e operações críticas são idempotentes/transacionais.
- Matching usa categoria, elegibilidade, disponibilidade, bloqueios, proximidade quando há localização válida e reputação como critérios ordenados.
- Redis, filas e microserviços não entram no caminho crítico sem evidência operacional.
- Expansão geográfica usa coordenadas server-side e não expõe localização operacional do provider no resultado público de matching.
