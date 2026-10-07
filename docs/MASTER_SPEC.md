# Nexo — Master Technical Specification

**Versão:** 1.0
**Status:** FASE 0 — CONSOLIDADA PARA IMPLEMENTAÇÃO

## 1. Objetivo
Nexo é um marketplace mobile-first que conecta clientes a profissionais independentes para transporte de passageiros, entregas, carga, guincho e futuras categorias.

## 2. Atores
Customer/passenger, Provider/driver e Admin/moderator. Uma conta pode possuir capacidades compatíveis com mais de um contexto. Provider pode possuir múltiplos veículos.

## 3. Produto e UX
Fluxo: Need → Match → Trust → Contract → Pay → Rate → Repeat.
O produto final prioriza Android/iOS. PC é ambiente de desenvolvimento e suporte administrativo. UX deve privilegiar touch, acessibilidade, conectividade intermitente, segurança e estados claros.

## 4. Regras comerciais
- Provider: R$99,90/mês.
- 0% de comissão.
- Provider mantém 100% do valor do serviço.
- Carro: R$2,00/km.
- Moto: R$1,50/km.
- Passageiro não negocia livremente.
- Carga/frete pode negociar.
- Pagamentos iniciais: dinheiro, Pix e máquina própria do provider.

Os valores de tarifa são regras iniciais e dependem de validação econômica/regulatória antes do lançamento comercial.

## 5. Arquitetura
Monólito modular em Flutter + NestJS/TypeScript + PostgreSQL, com object storage e adapters para serviços externos. Ver ARCHITECTURE.md.

## 6. Requisitos
Ver REQUIREMENTS.md.

## 7. Modelo de dados
Ver DATA_MODEL.md.

## 8. Estados
Ver STATE_MACHINES.md.

## 9. Preço de passageiros
O servidor determina distância e tarifa. O valor é armazenado em centavos como snapshot.
Fórmula inicial: valor = distância em km × tarifa por km.
Internamente, distância deve ser representada em metros e a política de arredondamento deve ser fechada na Fase 1 antes da implementação comercial.

## 10. Carga
Oferta/contraproposta com versão, autor, valor, validade e estado. Aceite congela o preço e gera auditoria.

## 11. Pagamentos
Nexo registra método e confirmação operacional. Não armazena PAN/CVV nem processa diretamente cartões. Referências externas são armazenadas apenas quando necessárias.

## 12. Assinatura
Subscription é independente de Service. Suporta ativação, trial se aprovado, renovação, falha, inadimplência, suspensão e cancelamento.

## 13. Reputação
Somente serviços elegíveis e concluídos. Uma avaliação por autor/contraparte/serviço. Moderação é auditável.

## 14. Mídia
Upload controlado, validação, object storage privado, URLs temporárias, moderação e denúncia.

## 15. Segurança e LGPD
Menor privilégio, autorização por recurso, minimização, segregação de dados privados, criptografia apropriada, auditoria, retenção definida antes da produção e revisão jurídica.

## 16. API
API /v1 REST/JSON, contratos de erro, paginação, idempotência e autorização server-side. Ver API.md.

## 17. Observabilidade
Logs estruturados sem PII desnecessária, correlation/request IDs, métricas, health checks, alertas e rastreabilidade de operações críticas.

## 18. Testes
Unit, integração, API, segurança, E2E, mobile, regressão, concorrência e idempotência. Ver TESTING.md.

## 19. Infraestrutura
Ver INFRASTRUCTURE.md.

## 20. Administração
Acesso mínimo para suporte, verificação, moderação, denúncias, bloqueios, disputas e métricas. Ações sensíveis auditadas.

## 21. Fora do escopo
Nexo Live, streaming, hands-free, câmera ao vivo e speech-to-text/text-to-speech para condução.

## 22. Gate
Ver ACCEPTANCE.md. A aprovação autoriza o início da Fase 1, mas não a inicia automaticamente.
