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
- Scaffold Flutter/Dart mobile e NestJS/TypeScript backend.
- PostgreSQL, migration ledger, health check, validação HTTP, testes e CI.
- Backend e mobile validados pelo pipeline.
- Gate da Fase 1 aprovado.

## 0.5.0 — FASE 2 em execução
### Added
- Cadastro/login de customer e provider.
- Hash de senha PBKDF2 com salt e custo configurável no formato persistido.
- Access token assinado com expiração.
- Recuperação de senha com token aleatório, hash em banco, expiração e uso único.
- Autorização server-side e guard de papéis.
- Perfil autenticado e perfil público sem exposição de email/credenciais.
- Biografia, informações profissionais e foto de perfil.
- Persistência de mídia de foto/vídeo com legenda, visibilidade e estado de moderação.
- Migrações de identidade/perfil/mídia.
- Testes de segurança das primitivas e integração HTTP contra PostgreSQL.

### Gate
Implementação da Fase 2 concluída; aprovação formal depende do CI final da revisão corrente.
