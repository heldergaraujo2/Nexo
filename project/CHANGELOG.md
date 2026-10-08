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
- Backend e mobile validados no CI final; APK debug construído.
- Trigger de imutabilidade e sincronização do preço de rota cobertos por integração.
- Run 255 da `main` aprovado.

### Gate
**APROVADO. FASE 6 concluída.**

### Validation note
Run 258: backend verde; Android APK falhou por erro transitório do runner ao baixar/descompactar Android NDK 28.2 (`unknown archive`). O código mobile já havia passado o mesmo build no run 256.

### Next
**FASE 7 — SEGURANÇA OPERACIONAL.**


## 1.2.0 — FASE 7 concluída
### Added
- Cadastro privado de veículos de providers com estado de verificação.
- Casos privados de verificação de identidade e veículo.
- Sincronização entre revisão de verificação, estado do veículo e indicador público.
- Eventos de segurança com severidade e resultado.
- Flags antifraude iniciais com revisão e encerramento.
- Incidentes operacionais com atribuição e máquina de estados.
- Controles de autorização e isolamento de dados sensíveis.

### Validation
- CI run 265: backend e mobile aprovados.
- Backend: migrations 001–008, typecheck, 26 testes, build, lint e format check.
- Mobile: analyze, testes e APK debug.
- Correções de integração e severidade de eventos foram validadas antes do gate.

### Gate
**APROVADO. FASE 7 concluída.**

### Next
**FASE 8 — ENTREGAS.**


## 1.3.0 — FASE 8 concluída
### Added
- Delivery request com origem/destino, item, observações e metadados de mídia.
- Ofertas com preço e aceite para entrega.
- Delivery vinculada ao Service com máquina de estados operacional.
- Eventos, notificações, auditoria, idempotência e autorização.
- Proteções contra contorno do lifecycle genérico.
- Tela mobile inicial de solicitação de entrega.

### Validation
- Run 289: backend e mobile aprovados.
- Backend: migrations 001–009, typecheck, 30 testes, build, lint e format check.
- Mobile: analyze, testes e APK debug.
- Falhas encontradas no gate foram corrigidas: DI do DeliveryController, idempotency hash, status HTTP das transições, validação de mídia e testes mobile.

### Gate
**APROVADO. FASE 8 concluída.**

### Next
**FASE 9 — CARGA E FRETE NEGOCIÁVEL.**


## 1.4.0 — FASE 9 concluída
- Cargo/freight request with origin/destination, description, optional dimensions/weight and media metadata.
- Versioned provider/customer price proposals and counterproposals.
- Final acceptance creates the Service price snapshot and a linked accepted Marketplace Offer.
- Cargo execution lifecycle, cancellation, notifications and audit.
- Authorization, block checks, idempotency and transaction locks.

### Validation
- CI initially found participant inversion and an invalid cargo-proposal-to-Offer FK link; both were corrected.
- Backend integration and mobile CI are required for the final gate.

### Gate
**FASE 9 APROVADA.** Next: FASE 10 — GUINCHO/REBOQUE.


## 1.5.0 — FASE 10 em execução
### Added
- Solicitação e execução de guincho/reboque.
- Localização, destino opcional, descrição do problema e metadados de mídia.
- Oferta com preço integrada ao Service.
- Máquina de estados dedicada.
- Pré-condição de veículo verificado e bloqueio entre participantes.
- Auditoria, notificações e idempotência.
- Testes de integração de segurança, autorização e ciclo operacional.

### Next
**Gate FASE 10 — CI backend/mobile e auditoria final.**


## 1.6.0 — FASE 10 concluída / FASE 11 iniciada
### Gate FASE 10
- PR #17 mesclado na main.
- CI run 306 aprovado: backend e mobile verdes.
- Backend: migrations, typecheck, testes, build, lint e format check.
- Mobile: analyze, testes e APK debug.
- Auditoria final: localização/destino, mídia, oferta/aceite, elegibilidade por veículo verificado, bloqueio, lifecycle dedicado, autorização, idempotência, auditoria e notificações.

### Next
**FASE 11 — ASSINATURA DOS PROFISSIONAIS.**


## 1.7.0 — BLOCO MOBILIDADE E2E iniciado
### Added
- Cliente HTTP Flutter com autenticação Bearer, sessão persistida e URL de API configurável.
- Login/cadastro para customer e provider.
- Fluxo de passageiro com GPS, mapa, origem/destino, carro/moto e solicitação de corrida.
- Fluxo de motorista com online/offline, polling de solicitações e aceite.
- Tela de acompanhamento de corrida e comandos operacionais do motorista.
- GET /v1/requests/available para descoberta server-side de solicitações elegíveis.
- Aceite de corrida retorna rideId e notificação de aceite inclui rideId.
- Transições de Ride geram notificações persistidas para o outro participante.
- Roadmap MOB-0 → MOB-10 inserido antes da FASE 11.

### Gate
**EM EXECUÇÃO.** Falta validar a corrida completa em dois dispositivos físicos e concluir estabilização.

### Next
Concluir MOB-9/MOB-10 e somente então retomar FASE 11 — Assinatura dos Profissionais.


## 1.8.0 — MOBILIDADE E2E operacionalizada
### Added
- cancelamento mobile de solicitações/corridas
- registro de pagamento e confirmação pelo provider no fluxo da corrida
- avaliação pós-corrida conectada ao Trust
- localização contínua do provider durante a corrida
- localização operacional do provider enquanto online
- ranking de solicitações de passageiros por proximidade
- expiração operacional de solicitações de passageiros
- testes de integração para localização e ranking
- migration 012 para localização durante corrida
- migration 013 para localização de provider
- CI atualizado para aplicar as novas migrations e removida aplicação duplicada da migration de cargo

### Gate
**PENDENTE:** validação E2E física com passageiro e motorista em dispositivos distintos, permissões, LAN/GPS, estabilidade e regressão final.
