# Nexo — Next Task

## Current objective


Concluir a **FASE 3 — CONFIANÇA E REPUTAÇÃO** com avaliações, favoritos, denúncias, bloqueios, indicadores de verificação, regras antiabuso e moderação inicial.

## FASE 3 — entregas
- [ ] avaliações
- [ ] comentários
- [ ] reputação bilateral
- [ ] favoritos
- [ ] denúncia
- [ ] bloqueio
- [ ] indicadores de verificação
- [ ] regras contra abuso de avaliações
- [ ] moderação inicial
- [ ] autorização e privacidade
- [ ] auditoria de ações críticas
- [ ] testes unitários, integração, API, segurança e concorrência relevantes

## Gate da FASE 3
Usuários conseguem avaliar e denunciar com regras de autorização, integridade e auditoria. Uma avaliação só é aceita quando o serviço relacionado é elegível e concluído, e cada autor avalia uma contraparte no máximo uma vez por serviço.

## Critérios técnicos
- [ ] integridade por constraints/índices no PostgreSQL
- [ ] transições de moderação validadas no servidor
- [ ] usuário não avalia a si próprio
- [ ] usuário sem relação elegível com o serviço não avalia
- [ ] avaliação duplicada é rejeitada inclusive sob concorrência
- [ ] denúncia e bloqueio respeitam ownership/autorização
- [ ] dados privados não aparecem nos endpoints públicos
- [ ] indicadores de verificação não expõem documentos
- [ ] eventos críticos são auditáveis

## Próxima fase
FASE 4 — MARKETPLACE CORE.
