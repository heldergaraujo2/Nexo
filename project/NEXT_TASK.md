# Nexo — Next Task

## Current objective
Concluir a **VALIDAÇÃO OPERACIONAL REAL PC + ANDROID** do fluxo de passageiro e motorista.

## Ordem obrigatória
1. Obter execução CI válida para o commit atual.
2. Baixar e verificar o APK Android gerado pelo código atual.
3. Baixar e verificar o cliente Windows do motorista, se o artefato estiver disponível.
4. Provisionar as duas contas fictícias via `npm run e2e:provision`.
5. Preparar PostgreSQL + API no PC.
6. Iniciar motorista no PC e deixá-lo online.
7. Instalar APK no Android e conectar à API LAN.
8. Executar corrida completa: solicitar → receber → aceitar → a caminho → cheguei → iniciar → concluir.
9. Repetir após qualquer correção necessária.
10. Registrar evidências e atualizar o estado operacional.

## Regra de aprovação
Não marcar como aprovado sem evidência física do fluxo completo. Não usar alteração manual no PostgreSQL para avançar estados.

## Blocker atual
O código está preparado e mesclado na `main`, mas ainda não há um artefato CI novo verificável para fornecer como APK.