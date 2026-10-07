# Nexo — Current State

**Version:** 0.7 — FASE 4 em execução
**Last updated:** 2026-10-07

## Phase
**FASE 4 — MARKETPLACE CORE — EM EXECUÇÃO**

## Fase anterior
FASE 2 — IDENTIDADE, ACESSO E PERFIS — CONCLUÍDA.

## Fase 2 — conclusão
- [x] Cadastro de cliente
- [x] Cadastro de profissional/prestador
- [x] Hash de senha com PBKDF2
- [x] Login e access token assinado
- [x] Recuperação de senha com token de uso único e expiração
- [x] Autenticação server-side por Bearer token
- [x] Autorização por papel
- [x] Perfil público e privado
- [x] Foto, biografia e informações profissionais
- [x] Mídia de perfil com legenda e moderação
- [x] Migrações PostgreSQL
- [x] Testes unitários e integração HTTP
- [x] Typecheck, build, lint e formatação
- [x] CI backend e mobile aprovados
- [x] APK debug construído no CI

## Fase 2 — gate
**APROVADO.** O fluxo de identidade permite criar conta, autenticar, acessar o próprio perfil e respeitar as fronteiras de privacidade/autorização.

## Fase 3 — objetivo
Implementar a camada inicial de confiança do marketplace:
- avaliações e comentários bilaterais;
- favoritos;
- denúncias;
- bloqueios;
- indicadores de verificação;
- proteção contra abuso de avaliações;
- moderação inicial;
- autorização, privacidade e auditoria.

## Fase 3 — conclusão
- [x] Avaliações e comentários bilaterais
- [x] Unicidade por autor/serviço com proteção concorrente
- [x] Favoritos e bloqueios
- [x] Denúncias e moderação inicial
- [x] Indicadores públicos de verificação sem documentos
- [x] Auditoria das ações críticas
- [x] Máquina de estados de moderação validada
- [x] Testes de integração, concorrência, typecheck, build, lint e formatação
- [x] CI backend e mobile aprovados; APK debug construído

## Fase 4 — objetivo
Implementar o núcleo do marketplace: solicitações, descoberta/matching, ofertas/aceite, serviço, estados server-side e base operacional para transporte.

## Próximo gate
Clientes conseguem criar solicitações, profissionais elegíveis conseguem receber/aceitar oportunidades e o servidor mantém integridade das transições e do vínculo solicitação → serviço.

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Verificação de identidade/veículo é apenas indicador de confiança nesta fase; o fluxo operacional completo pertence à Fase 7.
