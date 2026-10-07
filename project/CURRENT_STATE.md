# Nexo — Current State

**Version:** 0.4 — FASE 1 concluída
**Last updated:** 2026-10-07

## Phase
**FASE 1 — FUNDAÇÃO TÉCNICA — CONCLUÍDA**

## Completed
- [x] Repositório privado confirmado
- [x] Sistema de continuidade
- [x] Roadmap por fases
- [x] Fase 0 de governança e especificação
- [x] Scaffold Flutter/Dart mobile
- [x] Scaffold NestJS/TypeScript backend
- [x] PostgreSQL e migration inicial
- [x] Ambientes e exemplos de configuração
- [x] Tratamento global de validação HTTP
- [x] Health check HTTP
- [x] Teste unitário do health check
- [x] Teste widget inicial do mobile
- [x] Typecheck, build, lint e formatação do backend
- [x] CI GitHub Actions para backend e mobile
- [x] Validação automatizada da migration PostgreSQL
- [x] Análise, testes e build APK debug no mobile
- [x] Base inicial de observabilidade/diagnóstico por health check e logs de processo
- [x] Auditoria do gate da Fase 1

## Technical baseline
- Mobile: Flutter/Dart, Material 3, Android/iOS
- Backend: NestJS/TypeScript, prefixo global `/v1`
- Database: PostgreSQL 17 no CI
- Migration ledger inicial: `schema_migrations`
- ValidationPipe global com whitelist, rejeição de campos não permitidos e transformação
- CI executa checks backend, migration e mobile

## Validation
O gate da Fase 1 foi atendido pela validação automatizada no GitHub Actions: backend com typecheck, testes, build, lint, formatação e migration; mobile com análise estática, testes e build APK debug.

A geração dos hosts nativos Android/iOS ocorre no CI a partir do scaffold Flutter versionado, mantendo o repositório enxuto enquanto preserva builds reproduzíveis no pipeline.

## Known quality note
O backend ainda usa `npm install` sem `package-lock.json` versionado. Isso não bloqueia a fundação técnica validada nesta fase, mas deve ser tratado como melhoria de reprodutibilidade antes de uma operação de produção.

## Blockers
Nenhum bloqueador técnico conhecido para iniciar a FASE 2.

## Next
**FASE 2 — IDENTIDADE, ACESSO E PERFIS**

Primeiras entregas: cadastro/login, recuperação de acesso, identidade do cliente/profissional, perfis, mídia, privacidade e autorização por papel.
