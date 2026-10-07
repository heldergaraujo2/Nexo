# Nexo — Changelog

## 0.1.0 — Foundation
- Repository continuity architecture
- Agent instructions
- Context/state/decision/next-task tracking
- Product README and initial roadmap
- Master specification outline

## 0.2.0 — Roadmap por fases
- Roadmap reorganizado em 14 fases.
- Gates de conclusão definidos.
- MVP seguro = FASES 0–7.
- Expansão/monetização = FASES 8–11.
- Crescimento/escala = FASES 12–13.

## 0.3.0 — FASE 0 concluída
- Requisitos, modelo de domínio, estados, testes, segurança, LGPD e infraestrutura documentados.
- Stack Flutter/Dart + NestJS/TypeScript + PostgreSQL consolidada.
- Regras de negócio e decisões técnicas registradas.
- Gate da Fase 0 aprovado.

## 0.4.0 — FASE 1 concluída
### Added
- Scaffold Flutter/Dart mobile com Material 3.
- Scaffold NestJS/TypeScript com prefixo `/v1`.
- Health check HTTP e teste unitário.
- PostgreSQL 17 no CI e migration ledger `schema_migrations`.
- Validação HTTP global com whitelist, rejeição de campos não permitidos e transformação.
- Teste widget determinístico do app mobile.
- CI GitHub Actions para backend e mobile.
- Validações de typecheck, testes, build, lint, formatação, migration, análise Flutter e APK debug.

### Corrected
- CI passou a usar escopo explícito no Prettier.
- CI mobile restaura os testes versionados após a geração dos hosts nativos pelo `flutter create`.

### Gate
FASE 1 aprovada. Próxima fase: **FASE 2 — IDENTIDADE, ACESSO E PERFIS**.

### Quality note
O backend ainda usa `npm install` sem `package-lock.json` versionado. A melhoria fica registrada para reforço de reprodutibilidade antes de produção.
