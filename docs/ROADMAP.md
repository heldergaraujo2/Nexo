# Nexo — Roadmap de Desenvolvimento por Fases

**Versão:** 1.0  
**Status:** FASE 6 EM EXECUÇÃO  
**Princípio:** nenhuma fase deve ser considerada concluída sem seus critérios de aceite, testes e documentação atualizados.

## Objetivo

Desenvolver o Nexo de forma incremental e segura, reduzindo risco técnico e de negócio. Cada fase entrega uma parte funcional do produto e cria a base necessária para a seguinte.

## Regras de progressão

Uma fase só pode avançar quando:
1. seus requisitos estiverem implementados;
2. os fluxos críticos estiverem testados;
3. segurança e autorização tiverem sido verificadas;
4. documentação e estado do projeto estiverem atualizados;
5. não houver bloqueador crítico aberto;
6. o critério de aceite da fase estiver aprovado.

---

## FASE 0 — Governança e Especificação
**Objetivo:** transformar a visão do Nexo em especificação técnica executável.

**Entregas — CONCLUÍDAS**
- [x] Master Technical Specification
- [x] requisitos funcionais e não funcionais
- [x] modelo de domínio
- [x] modelo inicial de banco
- [x] arquitetura
- [x] contratos de API
- [x] autenticação/autorização
- [x] máquinas de estado
- [x] estratégia de testes
- [x] segurança e LGPD
- [x] critérios de aceite

**Gate:** APROVADO — arquitetura e especificação internamente consistentes e prontas para implementação.

---

## FASE 1 — Fundação Técnica
**Objetivo:** criar uma aplicação executável, segura e observável.

**Entregas — CONCLUÍDAS**
- [x] estrutura do projeto
- [x] ambientes de desenvolvimento/teste/produção
- [x] banco de dados e migrations
- [x] configuração de secrets/env
- [x] logging e diagnóstico básico
- [x] tratamento de erros/validação HTTP
- [x] testes automatizados
- [x] CI/CD
- [x] health checks
- [x] base de monitoramento/observabilidade

**Gate:** APROVADO — backend e mobile validados automaticamente; migration executada no CI; APK debug construído.

---

## FASE 2 — Identidade, Acesso e Perfis
**Objetivo:** permitir que clientes e profissionais tenham contas e identidade digital.

**Entregas**
- [x] cadastro/login
- [x] recuperação de acesso
- [x] cliente
- [x] profissional/prestador
- [x] perfil público
- [x] foto
- [x] biografia/informações profissionais
- [x] fotos e vídeos com legendas
- [x] privacidade
- [x] autorização por papel

**Gate:** APROVADO — usuário consegue criar conta, autenticar, acessar o próprio perfil e respeitar as fronteiras de privacidade/autorização. CI backend/mobile aprovado.

---

## FASE 3 — Confiança e Reputação
**Objetivo:** criar a camada de confiança do marketplace.

**Entregas — CONCLUÍDAS**
- [x] avaliações
- [x] comentários
- [x] reputação bilateral
- [x] favoritos
- [x] denúncia
- [x] bloqueio
- [x] indicadores de verificação
- [x] regras contra abuso de avaliações
- [x] moderação inicial
- [x] auditoria e proteção concorrente
- [x] CI backend/mobile aprovado

**Gate:** APROVADO — avaliações, denúncias, bloqueios e indicadores respeitam autorização, integridade, privacidade, auditoria e máquina de estados de moderação.

---

## FASE 4 — Marketplace Core
**Status:** CONCLUÍDA
**Objetivo:** fazer o ciclo principal do Nexo funcionar sem depender de uma categoria específica.

**Fluxo principal**
Necessidade → Solicitação → Encontrar profissional → Oferta/aceite → Execução → Conclusão → Avaliação.

**Entregas**
- [x] criação de solicitações
- [x] descoberta/matching
- [x] ofertas
- [x] comunicação necessária ao serviço
- [x] aceite/recusa
- [x] estados do serviço
- [x] cancelamento
- [x] conclusão
- [x] histórico
- [x] notificações essenciais

**Gate:** APROVADO — um serviço genérico percorre o ciclo de ponta a ponta com integridade, autorização, idempotência, auditoria e proteção contra dupla aceitação.

---

## FASE 5 — Transporte de Passageiros
**Status:** CONCLUÍDA
**Objetivo:** lançar o primeiro fluxo de mobilidade com regras de preço definidas.

**Entregas — CONCLUÍDAS**
- [x] origem/destino
- [x] cálculo de distância server-side em metros
- [x] categoria carro
- [x] categoria motocicleta
- [x] tarifa carro: R$2,00/km
- [x] tarifa motocicleta: R$1,50/km
- [x] arredondamento half-up em centavos
- [x] regras de cancelamento e máquina de estados
- [x] alterações de rota com snapshot/versionamento
- [x] início da viagem
- [x] conclusão
- [x] histórico operacional e auditoria
- [x] bloqueio de negociação livre para passageiro
- [x] CI backend/mobile aprovado

**Gate:** APROVADO — viagem solicitada, aceita, executada e concluída com preço determinístico server-side, além de alterações de rota versionadas.

---

## FASE 6 — Pagamentos e Registro Financeiro
**Status:** EM EXECUÇÃO
**Objetivo:** registrar como o serviço foi pago sem transformar o Nexo inicialmente em processador de pagamentos.

**Entregas**
- [ ] dinheiro físico
- [ ] Pix
- [ ] cartão na máquina do próprio profissional
- [ ] registro do método
- [ ] confirmação de pagamento
- [x] histórico financeiro da operação
- [ ] regras de divergência
- [ ] recibos/comprovantes quando aplicável

**Regra:** o Nexo não cobra comissão sobre o serviço.

**Gate:** serviço concluído possui estado financeiro consistente e auditável.

---

## FASE 7 — Segurança Operacional
**Objetivo:** aumentar a segurança antes de ampliar categorias e escala.

**Entregas**
- [ ] verificação de identidade
- [ ] verificação de veículo
- [ ] controles de acesso a dados privados
- [ ] antifraude inicial
- [ ] denúncias e bloqueios operacionais
- [ ] eventos de segurança
- [ ] ferramentas de suporte
- [ ] fluxos de incidente/emergência definidos conforme requisitos legais e operacionais

**Gate:** dados sensíveis estão isolados e os principais cenários de abuso possuem tratamento definido.

---

## FASE 8 — Entregas
**Objetivo:** expandir o marketplace para entrega de objetos/produtos.

**Entregas**
- [ ] origem/destino
- [ ] descrição do item
- [ ] fotos/mídia
- [ ] observações
- [ ] solicitação
- [ ] ofertas
- [ ] aceite
- [ ] execução
- [ ] conclusão
- [ ] avaliação

**Gate:** entrega completa de ponta a ponta com rastreabilidade operacional.

---

## FASE 9 — Carga e Frete Negociável
**Objetivo:** implementar a categoria em que preço pode ser negociado.

**Entregas**
- [ ] origem/destino
- [ ] peso/dimensões quando aplicável
- [ ] descrição da carga
- [ ] fotos
- [ ] oferta
- [ ] contraproposta
- [ ] negociação
- [ ] aceite do preço final
- [ ] execução
- [ ] conclusão
- [ ] avaliação

**Regra:** negociação de preço fica restrita ao fluxo de carga/frete, conforme regra atual do produto.

**Gate:** preço final negociado fica registrado e imutável após aceite, salvo fluxo explícito de alteração.

---

## FASE 10 — Guincho/Reboque
**Objetivo:** adicionar atendimento de emergência/assistência veicular como categoria do marketplace.

**Entregas**
- [ ] localização
- [ ] destino quando necessário
- [ ] descrição do problema
- [ ] fotos
- [ ] ofertas
- [ ] negociação quando aplicável
- [ ] aceite
- [ ] execução
- [ ] conclusão
- [ ] avaliação

**Gate:** solicitação de guincho pode ser concluída com histórico completo e regras de segurança aplicadas.

---

## FASE 11 — Assinatura dos Profissionais
**Objetivo:** ativar o modelo comercial do Nexo.

**Regras**
- **R$99,90/mês**
- **0% de comissão**
- profissional mantém **100% do valor do serviço**

**Entregas**
- [ ] assinatura
- [ ] período de teste, se aprovado
- [ ] cobrança
- [ ] renovação
- [ ] cancelamento
- [ ] inadimplência
- [ ] status da assinatura
- [ ] restrições de acesso quando aplicável
- [ ] histórico de cobrança

**Gate:** ciclo de assinatura é consistente e não altera o valor devido ao profissional por serviços realizados.

---

## FASE 12 — Crescimento e Retenção
**Objetivo:** melhorar liquidez do marketplace e retenção.

**Entregas**
- [ ] indicação
- [ ] campanhas
- [ ] programa inicial/fundadores
- [ ] favoritos
- [ ] clientes recorrentes
- [ ] métricas de aquisição
- [ ] métricas de oferta e demanda
- [ ] métricas de conversão
- [ ] métricas de retenção
- [ ] ferramentas administrativas

**Gate:** métricas principais estão disponíveis para tomada de decisão.

---

## FASE 13 — Escala e Expansão
**Objetivo:** preparar o Nexo para crescimento geográfico e técnico.

**Entregas**
- [ ] otimização de performance
- [ ] observabilidade avançada
- [ ] alta disponibilidade conforme necessidade
- [ ] recuperação de desastres
- [ ] hardening de segurança
- [ ] otimização de custos
- [ ] expansão geográfica
- [ ] novas categorias
- [ ] mecanismos avançados de matching

**Gate:** capacidade técnica e operacional compatível com a próxima escala do negócio.

---

# Ordem recomendada de construção

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13**

A primeira versão comercial não precisa esperar todas as fases. O primeiro marco de produto deve ser:

**FASES 0–7 = MVP seguro de marketplace + transporte**

Depois:

**FASES 8–11 = expansão de categorias + monetização**

E então:

**FASES 12–13 = crescimento + escala**

# Fora do escopo atual

- Nexo Live
- live streaming
- hands-free
- integração de câmera ao vivo
- speech-to-text/text-to-speech para condução
- infraestrutura específica de Live
- workflows de privacidade/consentimento do Live
- moderação específica de Live

# Regra de continuidade

Ao terminar cada fase, atualizar obrigatoriamente:
- `project/CURRENT_STATE.md`
- `project/NEXT_TASK.md`
- `project/CHANGELOG.md`
- `project/DECISIONS.md`, quando houver nova decisão

O repositório continua sendo a fonte de verdade para qualquer novo agente ou nova conversa.
