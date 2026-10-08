# Nexo — Changelog

## 1.9.0 — FASE 13 em execução
- Gate da FASE 11 aprovado pelo CI run 37815556772.
- Backend: migrations, typecheck, testes, build, lint e format:check verdes.
- Mobile: analyze, testes e APK debug verdes.
- FASE 12 iniciada automaticamente conforme roadmap oficial.
- Implementada a base de crescimento e retenção: indicação, campanhas, fundadores, clientes recorrentes e métricas administrativas.
- Migration 013 adicionada com qualificação automática de indicação após serviço concluído.
- PR #24 validada pelo CI run 37819635305 com backend e mobile verdes.
- Fase 12 oficialmente aprovada; Fase 13 iniciada automaticamente.

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

## 1.10.0 — FASE 13 em execução
- Migrations 014–016: índices de escala, localização operacional opcional e catálogo extensível de categorias.
- Pool PostgreSQL com limites e timeouts configuráveis.
- Hardening do runtime e remoção do postinstall que modificava/pushava a branch automaticamente.
- Matching avançado com proximidade, elegibilidade, bloqueios, disponibilidade e reputação.
- Documentação de escala, HA/DR, custos e expansão geográfica sincronizada.
- Gate da Fase 13 aprovado pelo CI run 37831723696.

## 1.11.0 — ROADMAP COMPLETO
- Estado oficial sincronizado após a validação final do CI.
- FASE 13 aprovada pelo CI run 37831723696.
- Backend e mobile verdes no HEAD final validado.
- Todos os gates oficiais das Fases 0–13 estão aprovados.
