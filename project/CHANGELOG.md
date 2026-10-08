# Nexo — Changelog

## 1.8.0 — FASE 12 iniciada
- Gate da FASE 11 aprovado pelo CI run 37815556772.
- Backend: migrations, typecheck, testes, build, lint e format:check verdes.
- Mobile: analyze, testes e APK debug verdes.
- FASE 12 iniciada automaticamente conforme roadmap oficial.
- Próximo foco: crescimento, retenção, métricas e ferramentas administrativas.

## 1.7.0 — FASE 11 em execução
- Migration 012 para subscriptions e subscription_charges.
- Plano profissional fixo em R$99,90 usando integer cents e BRL.
- Lifecycle de assinatura: criação, renovação, cancelamento, inadimplência e status administrativo.
- Billing adapter isolado de provedor externo, com stub determinístico para testes.
- Histórico de cobranças.
- Idempotência transacional com hash de payload e lock advisory.
- Auditoria das operações críticas.
- Autorização por papel e ownership.
- Testes de integração cobrindo lifecycle, concorrência/idempotência, autorização e preservação do preço de serviços concluídos.
- CI preparado para validar migration 012.
