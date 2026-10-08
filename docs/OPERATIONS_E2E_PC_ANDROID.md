# Validação operacional Nexo — PC + Android

Este documento cobre somente a validação operacional do fluxo de transporte de passageiros.

## Arquitetura do teste

- PC: PostgreSQL + API NestJS + cliente Flutter em modo motorista.
- Android: cliente Flutter em modo passageiro.
- API: `http://IP-LAN-DO-PC:3000/v1`.
- O aplicativo Android não deve usar `localhost`.

## Provisionamento

Use contas fictícias. Não coloque senhas neste arquivo nem no Git.

PowerShell:

```powershell
$env:NEXO_API_URL="http://127.0.0.1:3000/v1"
$env:NEXO_E2E_DRIVER_PASSWORD="defina-uma-senha-local"
$env:NEXO_E2E_PASSENGER_PASSWORD="defina-outra-senha-local"
npm run e2e:provision
```

O script usa somente endpoints oficiais para cadastro/login, perfil, veículo e disponibilidade. O veículo fica com o estado retornado pela API; para corrida de passageiro carro, a elegibilidade não depende de verificação de veículo.

## Android

O APK de CI é gerado a partir de `mobile/`. Na tela inicial, informe:

`http://IP-LAN-DO-PC:3000/v1`

Depois faça login com a conta de passageiro.

O Android solicita permissão de localização e usa GPS para a origem. O destino do teste é gerado a pequena distância da posição atual para manter o teste reproduzível sem serviço externo de mapas.

## Motorista no PC

O mesmo cliente Flutter possui a tela de motorista. Em Windows, use o artefato `nexo-windows-driver` quando disponível.

Ao abrir o cliente:
1. informe `http://127.0.0.1:3000/v1`;
2. faça login com a conta de motorista;
3. o cliente publica disponibilidade `available` para `passenger_car`;
4. deixe a tela aberta aguardando solicitações;
5. aceite a solicitação quando ela aparecer;
6. avance A caminho → Cheguei → Iniciar → Concluir.

## Critério de evidência

Aprovação operacional exige a corrida completa no banco real através das APIs/interfaces, sem UPDATE/DELETE manual de registros durante o E2E. Registre commit, versão do APK, horários, logs e estados observados.

## Limitação atual

A rede LAN precisa permitir TCP/3000 do celular para o PC e o firewall do Windows deve aceitar conexões de entrada para essa porta no perfil de rede usado no teste.
