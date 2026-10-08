# Nexo — Roadmap de Desenvolvimento por Fases

**Versão:** 1.0  
**Status:** FASE 13 EM EXECUÇÃO  
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
**Status:** CONCLUÍDA
**Objetivo:** registrar como o serviço foi pago sem transformar o Nexo inicialmente em processador de pagamentos.

**Entregas — CONCLUÍDAS**
- [x] dinheiro físico
- [x] Pix
- [x] cartão na máquina do próprio profissional
- [x] registro do método
- [x] confirmação de pagamento
- [x] histórico financeiro da operação
- [x] regras de divergência
- [x] proteção contra alteração retroativa do preço
- [x] recibo/estado financeiro operacional

**Regra:** o Nexo não cobra comissão sobre o serviço.

**Gate:** **APROVADO** — serviço concluído possui estado financeiro consistente e auditável, sem processamento de cartão pelo Nexo e sem alteração retroativa do preço.

---

## FASE 7 — Segurança Operacional
**Status:** CONCLUÍDA
**Objetivo:** aumentar a segurança antes de ampliar categorias e escala.

**Entregas**
- [x] verificação de identidade
- [x] verificação de veículo
- [x] controles de acesso a dados privados
- [x] antifraude inicial
- [x] denúncias e bloqueios operacionais
- [x] eventos de segurança
- [x] ferramentas de suporte
- [x] fluxos de incidente/emergência definidos conforme requisitos legais e operacionais

**Gate:** APROVADO — dados sensíveis estão isolados e os principais cenários de abuso possuem tratamento definido.

---

## FASE 8 — Entregas
**Status:** CONCLUÍDA
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

**Gate:** APROVADO — entrega completa de ponta a ponta com rastreabilidade operacional, preço por oferta, máquina de estados, auditoria, idempotência e validação mobile.

---

## FASE 9 — Carga e Frete Negociável
**Status:** CONCLUÍDA
**Objetivo:** implementar a categoria em que preço pode ser negociado.

**Entregas**
- [x] origem/destino
- [x] peso/dimensões quando aplicável
- [x] descrição da carga
- [x] fotos/metadados
- [x] oferta
- [x] contraproposta
- [x] negociação versionada
- [x] aceite do preço final
- [x] execução
- [x] conclusão
- [x] avaliação

**Regra:** negociação de preço fica restrita ao fluxo de carga/frete, conforme regra atual do produto.

**Gate:** APROVADO — preço final negociado fica registrado no Service e imutável após aceite; execução é rastreável ponta a ponta.

---

## FASE 10 — Guincho/Reboque
**Status:** CONCLUÍDA
**Objetivo:** adicionar atendimento de emergência/assistência veicular como categoria do marketplace.

**Entregas**
- [x] localização
- [x] destino quando necessário
- [x] descrição do problema
- [x] fotos/metadados com validação
- [x] ofertas com preço
- [x] negociação/aceite via fluxo de ofertas
- [x] aceite
- [x] execução rastreável
- [x] conclusão
- [x] avaliação permanece no Trust após serviço concluído

**Gate:** APROVADO — CI run 306 backend/mobile verde, APK debug construído e auditoria final concluída.

---

## FASE 11 — Assinatura dos Profissionais
**Status:** CONCLUÍDA
**Objetivo:** ativar o modelo comercial do Nexo.

**Regras**
- **R$99,90/mês**
- **0% de comissão**
- profissional mantém **100% do valor do serviço**

**Entregas — CONCLUÍDAS**
- [x] assinatura
- [x] período de teste — não adotado no escopo atual
- [x] cobrança
- [x] renovação
- [x] cancelamento
- [x] inadimplência
- [x] status da assinatura
- [x] restrições de acesso quando aplicável
- [x] histórico de cobrança
- [x] idempotência, auditoria e autorização
- [x] preservação do preço de serviços concluídos

**Gate: APROVADO** — CI run 37815556772 verde em backend e mobile; ciclo de assinatura consistente, auditável e idempotente, sem alterar o valor devido ao profissional por serviços realizados.

---

## FASE 12 — Crescimento e Retenção
**Status:** CONCLUÍDA
**Objetivo:** melhorar liquidez do marketplace e retenção.

**Entregas — IMPLEMENTADAS; GATE PENDENTE**
- [x] indicação
- [x] campanhas
- [x] programa inicial/fundadores
- [x] favoritos — já existentes no Trust
- [x] clientes recorrentes
- [x] métricas de aquisição
- [x] métricas de oferta e demanda
- [x] métricas de conversão
- [x] métricas de retenção
- [x] ferramentas administrativas

**Gate:** APROVADO — CI run 37819635305 verde em backend e mobile; migration 013, typecheck, 45 testes, build, lint, Flutter analyze, Flutter tests e APK debug aprovados.

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
