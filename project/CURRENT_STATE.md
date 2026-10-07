# Nexo — Current State

**Version:** 1.6 — FASE 11 iniciada
**Last updated:** 2026-10-07

## Phase
**FASE 11 — ASSINATURA DOS PROFISSIONAIS**

## Fases concluídas
- [x] FASE 0 — Governança e Especificação
- [x] FASE 1 — Fundação Técnica
- [x] FASE 2 — Identidade, Acesso e Perfis
- [x] FASE 3 — Confiança e Reputação
- [x] FASE 4 — Marketplace Core
- [x] FASE 5 — Transporte de Passageiros
- [x] FASE 6 — Pagamentos e Registro Financeiro
- [x] FASE 7 — Segurança Operacional
- [x] FASE 8 — Entregas
- [x] FASE 9 — Carga e Frete Negociável
- [x] FASE 10 — Guincho/Reboque

## Fase 10 — gate
**APROVADO.** Solicitação, oferta, aceite, execução e conclusão de guincho validados com elegibilidade, veículo verificado, bloqueios, autorização, idempotência, auditoria e máquina de estados dedicada.

## Validação
- PR #17 mesclado na `main`.
- CI run 306: backend e mobile verdes.
- Backend: migrations, typecheck, testes, build, lint e format check.
- Mobile: analyze, testes e APK debug.
- Auditoria final concluída sem bloqueador crítico.

## Próxima fase
**FASE 11 — ASSINATURA DOS PROFISSIONAIS**

## Regras comerciais
- R$99,90/mês por provider.
- 0% de comissão.
- Provider mantém 100% do valor do serviço.

## Blockers
Nenhum bloqueador conhecido.

## Known limitations
- Object storage binário ainda depende de adapter futuro.
- Retenção/base legal continua sujeita a revisão jurídica antes da produção.
