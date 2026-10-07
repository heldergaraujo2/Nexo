# Nexo — Baseline de Infraestrutura

**Versão:** 1.0  
**Diretriz:** começar simples e escalar somente por necessidade.

## Stack inicial registrada

### Mobile
**Flutter + Dart**, visando Android e iOS a partir de uma base compartilhada. O produto deve ser mobile-first.

### Backend
**TypeScript + NestJS**, com módulos alinhados aos domínios do Nexo.

### Banco
**PostgreSQL** como banco relacional principal.

### Cache/concorrência
**Redis** será opcional na Fase 1 e introduzido somente quando houver necessidade comprovada de cache, rate limiting distribuído, locks ou filas.

### Arquivos
Object storage compatível com S3 para mídia, com URLs temporárias/controladas.

### Observabilidade
Logs estruturados, métricas, health checks e correlation IDs desde a fundação.

### CI/CD
Pipeline automatizado para lint, typecheck, testes, build e verificações de segurança. Deploy separado para ambientes de desenvolvimento, teste e produção.

## Arquitetura de implantação inicial

Mobile → API HTTPS → módulos de domínio → PostgreSQL  
                                     ↘ object storage  
                                     ↘ serviços externos

Serviços externos de mapas, notificações, identidade e billing devem ficar atrás de interfaces/adapters para evitar acoplamento.

## Princípios
- Um backend modular inicialmente, não microserviços.
- Segredos somente em secret manager/env seguro.
- Banco privado, sem exposição direta ao mobile.
- TLS obrigatório.
- Backups automáticos e restauração testada antes de produção.
- Migrações versionadas.
- Ambiente de teste separado.
- Privilégios mínimos.

## Decisões ainda dependentes de fornecedor
Mapas/rotas, push provider, identidade, billing e infraestrutura cloud podem ser selecionados na Fase 1 após comparação de custo, cobertura, privacidade e confiabilidade.
