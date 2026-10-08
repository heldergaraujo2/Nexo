# Nexo — Context Snapshot

> Fonte de continuidade para novas sessões/agentes.

## Produto
Nexo é um marketplace multi-serviço mobile-first que conecta clientes a profissionais independentes.

## Estado atual
FASE 11 — ASSINATURA DOS PROFISSIONAIS.

As Fases 0–10 estão concluídas. A Fase 10 adicionou guincho/reboque com solicitação, ofertas, aceite, máquina de estados, elegibilidade, veículo verificado, bloqueios, auditoria e idempotência.

## Stack registrada
- Flutter/Dart para mobile Android/iOS
- TypeScript/NestJS no backend
- PostgreSQL
- Object storage S3-compatible
- Redis somente se houver necessidade comprovada
- Monólito modular inicialmente

## Modelo comercial
R$99,90/mês por provider; 0% comissão; provider mantém 100% do valor do serviço.

## Tarifas iniciais
Carro R$2,00/km; moto R$1,50/km.

## Negociação
Passageiros usam tarifa definida; carga/frete permite negociação.

## Pagamentos
Dinheiro, Pix, máquina própria do provider.

## Confiança
Perfis, reputação bilateral, verificação de identidade/veículo, denúncias, bloqueios e auditoria.

## Fora do escopo
Nexo Live, streaming, hands-free, câmera ao vivo e speech-to-text/text-to-speech para condução.

## Próxima fase
FASE 11 — ASSINATURA DOS PROFISSIONAIS.


## Estado atualizado — 2026-10-08
A Fase 12 está aprovada. A Fase 13 está em execução na branch de continuidade. A base de escala inclui migrations 014–016, readiness PostgreSQL, correlation IDs, duração HTTP, pool configurável, hardening de instalação/runtime, localização operacional opcional, matching por proximidade e catálogo extensível de categorias. O gate da Fase 13 depende do CI do HEAD final.
