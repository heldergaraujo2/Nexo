# Nexo — Current State

**Version:** 0.5 — FASE 2 em execução
**Last updated:** 2026-10-07

## Phase
**FASE 2 — IDENTIDADE, ACESSO E PERFIS — EM EXECUÇÃO**

## Fase anterior
FASE 1 — FUNDAÇÃO TÉCNICA — CONCLUÍDA.

## Implementado nesta fase
- [x] Cadastro de cliente
- [x] Cadastro de profissional/prestador
- [x] Hash de senha com PBKDF2
- [x] Login e access token assinado
- [x] Recuperação de senha com token de uso único e expiração
- [x] Autenticação server-side por Bearer token
- [x] Autorização por papel
- [x] Perfil público
- [x] Perfil privado autenticado
- [x] Foto de perfil por referência de object storage
- [x] Biografia e informações profissionais
- [x] Mídia de perfil foto/vídeo com legenda e estado de moderação
- [x] Migrações PostgreSQL de identidade, perfil e mídia
- [x] Testes unitários dos primitives de segurança
- [x] Teste de integração da API de identidade

## Segurança/privacy
- Senhas nunca são persistidas em plaintext.
- Token de recuperação é armazenado somente como hash e expira.
- Endpoint privado /v1/me exige autenticação.
- Perfil público não retorna email nem hash de senha.
- Perfil/mídia privados são vinculados ao account_id autenticado.
- Documentos de identidade não fazem parte do perfil público.
- A publicação de mídia depende de estado de moderação.

## Validation status
A implementação aguarda o CI final da revisão corrente para aprovação formal do gate da Fase 2. O pipeline deve validar typecheck, testes, build, lint, formatação e todas as migrations, além dos checks mobile existentes.

## Known limitation
A camada de object storage/S3-compatible ainda não foi conectada nesta fase. A API de mídia registra metadados e referência de objeto, preservando a fronteira segura para posterior adapter de storage; upload binário direto e URLs temporárias permanecem responsabilidade da integração de storage.

## Blockers
Nenhum bloqueador de produto conhecido. O gate não será declarado aprovado até o CI final terminar com sucesso.

## Next
Após o gate, **FASE 3 — CONFIANÇA E REPUTAÇÃO**.
