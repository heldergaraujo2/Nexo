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

## 0.5.0 — FASE 2 concluída
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
- Correções de injeção de dependências, SQL de atualização parcial e isolamento do helper de integração.
- Validação final de backend e mobile no CI.

### Gate
**APROVADO.** Backend: typecheck, testes, build, lint, formatação e migrations. Mobile: analyze, testes e APK debug.

## 0.6.0 — FASE 3 em execução
- Início da implementação da camada de confiança e reputação.

## 0.7.0 — FASE 3 concluída
### Added
- Avaliações e comentários bilaterais vinculados a serviços concluídos.
- Proteção de unicidade por autor/serviço e teste concorrente de aceite.
- Reputação pública com média e total de avaliações publicadas.
- Favoritos, bloqueios e denúncias com autorização.
- Indicadores públicos de identidade/veículo sem exposição de documentos.
- Moderação de avaliações com máquina de estados validada.
- Auditoria de ações críticas de confiança/reputação.
- Testes de integração, concorrência, typecheck, build, lint e formatação.

### Gate
**APROVADO.** CI final: backend e mobile verdes; APK debug construído com sucesso.

### Next
**FASE 4 — MARKETPLACE CORE**, incluindo solicitações, matching, ofertas/aceite e vínculo solicitação → serviço.

## 0.8.0 — FASE 4 em execução
- Marketplace Core implementado em branch de validação; primeiro CI encontrou falhas de typecheck, fixture/DI, envelope HTTP e consulta de matching/dinheiro e lint, corrigidas antes do próximo gate. Canonical Prettier output applied; temporary formatter command restored and CI-redacted test fixtures repaired.

## 0.9.0 — FASE 4 concluída / FASE 5 iniciada
### FASE 4
- ServiceRequest, matching, disponibilidade, ofertas e aceite implementados.
- Vínculo ServiceRequest → Service protegido por unicidade 1:1.
- Estados, cancelamento, conclusão, histórico, notificações e auditoria implementados.
- Idempotência e concorrência validadas por testes de integração.
- CI final aprovado: backend e mobile verdes; APK debug construído.

### Gate
**APROVADO.** FASE 4 concluída.

### Next
**FASE 5 — PASSENGER TRANSPORT.**


## 1.0.0 — FASE 5 concluída
### Added
- Solicitação de corrida de passageiro com origem/destino e cálculo server-side.
- Tarifas de carro R$2,00/km e motocicleta R$1,50/km.
- Distância em metros e valores monetários em centavos.
- Ride vinculada ao Service aceito com máquina de estados operacional.
- Snapshots versionados de rota/tarifa e alteração de rota com controle de versão.
- Auditoria e idempotência dos comandos críticos.
- Restrição de negociação de preço para transporte de passageiros.
- Suíte de integração de transporte de passageiros.

### Validation
- CI final aprovado no run 219: backend e mobile verdes.
- Backend: migrations, typecheck, 19 testes, build, lint e format check aprovados.
- Mobile: analyze, testes e APK debug aprovados.
- Correções finais de CI/testes incluíram teardown SQL e paths do diagnóstico de formatação.

### Gate
**APROVADO. FASE 5 concluída.**

### Next
**FASE 6 — PAGAMENTOS E REGISTRO FINANCEIRO.**


## 1.1.0 — FASE 6 concluída

> CI validation rerun requested after migration wiring.
### Added
- PaymentRecord para dinheiro, Pix e máquina própria do provider.
- Confirmação operacional com valor esperado versus confirmado.
- Disputa pré-confirmação.
- Auditoria, ownership, idempotência e locks transacionais.
- Proteção PostgreSQL contra alteração retroativa do preço após conclusão.
- Sincronização do preço do Service quando uma rota de Ride é alterada.
- Tela mobile inicial de registro/confirmação de pagamento.

### Validation
- Migrations 001–007 executadas em CI.
- Falhas encontradas no primeiro gate corrigidas: quoting PostgreSQL, autorização/tipagem TypeScript e teste Flutter de moeda.
- Gate final ainda depende de execução CI verde da revisão mais recente.
