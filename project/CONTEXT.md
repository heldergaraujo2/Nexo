# Nexo — Context Snapshot

> Fonte de continuidade para novas sessões/agentes.

## Produto
Nexo é um marketplace multi-serviço mobile-first que conecta clientes a profissionais independentes.

## Estado atual
FASE 7 — SEGURANÇA OPERACIONAL.

As Fases 0–6 estão concluídas. A Fase 6 adicionou registro financeiro por serviço para dinheiro, Pix e máquina própria do provider, com confirmação, disputa, auditoria, idempotência e proteção de preço concluído.

As Fases 0–5 estão concluídas. A Fase 5 adicionou o fluxo de transporte de passageiros com solicitação, cálculo server-side de distância/tarifa, Ride, máquina de estados, snapshots de rota, alteração versionada, auditoria, idempotência e bloqueio de negociação livre.

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
FASE 7 — SEGURANÇA OPERACIONAL.
