# Validação operacional Nexo — PC + Android

Este documento cobre a validação operacional do fluxo de transporte de passageiros **e das 4 features de conta** (perfil, pagamentos, avaliações, notificações), ponta a ponta com usuários reais em dispositivo físico.

## Arquitetura do teste

- PC: PostgreSQL + API NestJS + cliente Flutter em modo motorista.
- Android: cliente Flutter em modo passageiro.
- API: `http://IP-LAN-DO-PC:3000/v1`.
- O aplicativo Android **não deve usar `localhost`** (o celular não alcança o PC por esse nome).

## Obter os binários (repositório público — sem login necessário)

1. Abra a página de Actions do repositório: `https://github.com/heldergaraujo2/Nexo/actions/workflows/ci.yml` (ou o workflow "Nexo CI").
2. Clique no **run verde mais recente** da branch `arena/af7a1fc1-nexo` (ou do PR #27).
3. Na página do run, em **Artifacts** (inferior):
   - `nexo-android-debug` → APK para o Android (baixe e descompacte o `.zip`; dentro está o `.apk`).
   - `nexo-windows-driver` → pacote do motorista para Windows (descompacte em qualquer pasta).
4. Alternativa via CLI (com `gh` instalado):
   ```bash
   gh run download <run-id> -R heldergaraujo2/Nexo -n nexo-android-debug
   gh run download <run-id> -R heldergaraujo2/Nexo -n nexo-windows-driver
   ```
5. Artefatos do GitHub expiram (~90 dias). Para guardar uma versão de aprovação, copie o APK/pacote para o armazenamento da operação no dia do teste e registre o **hash SHA-256**.

## Provisionamento de contas de teste

Use contas fictícias. **Não coloque senhas neste arquivo nem no Git.**

PowerShell (no PC, dentro de `backend/`):

```powershell
$env:NEXO_API_URL="http://127.0.0.1:3000/v1"
$env:NEXO_E2E_DRIVER_PASSWORD="defina-uma-senha-local"
$env:NEXO_E2E_PASSENGER_PASSWORD="defina-outra-senha-local"
npm run e2e:provision
```

O script usa somente endpoints oficiais para cadastro/login, perfil, veículo e disponibilidade. O veículo fica com o estado retornado pela API; para corrida de passageiro carro, a elegibilidade não depende de verificação de veículo.

## Android

1. Instale o APK (permita instalação de origens desconhecidas).
2. Na tela inicial, informe: `http://IP-LAN-DO-PC:3000/v1`
3. Faça login com a conta de **passageiro**.
4. O Android solicita permissão de localização e usa GPS para a origem. O destino do teste é gerado a pequena distância da posição atual para manter o teste reproduzível sem serviço externo de mapas.

## Motorista no PC (Windows)

Descompacte `nexo-windows-driver` e abra o executável:

1. informe `http://127.0.0.1:3000/v1`;
2. faça login com a conta de motorista;
3. o cliente publica disponibilidade `available` para `passenger_car`;
4. deixe a tela aberta aguardando solicitações;
5. aceite a solicitação quando ela aparecer;
6. avance A caminho → Cheguei → Iniciar → Concluir.

## Roteiro E2E passageiro ↔ motorista (corrida completa)

1. Passageiro (Android): definir destino → **Solicitar** (registra `POST /ride-requests` com idempotência).
2. Motorista (PC): ver a solicitação no radar → **Aceitar** (aceite atômico: serviço + corrida).
3. Motorista: avance os estados na ordem: **A caminho → Cheguei → Iniciar → Concluir** (cada transição = `POST /rides/:id/…`; valide que o passageiro vê os mesmos estados em tempo real na tela de acompanhar).
4. Passageiro: **Cancelar** só em estados iniciais, com motivo (teste separado).
5. Confirme no banco (sem UPDATE/DELETE manual): `services.status='completed'`, `rides.state='completed'`, `ride_events` com a cadeia completa.

## Roteiro das 4 features de conta (novas — rodadas 3–5)

Execute **após** concluir a corrida acima (algumas telas dependem de serviços concluídos), com o passageiro no Android e o motorista no PC:

1. **Perfil (edição):** aba **Perfil** → botão **Abrir** em "Editar perfil" → altere nome/bio/profissional → **Salvar** (`PUT /me/profile`). Feche e reabra o app para confirmar persistência. O painel "Sua reputação" mostra média/total e avaliações recentes (`GET /profiles/:id/ratings`).
2. **Pagamentos (após corrida concluída):** aba **Histórico** → no serviço concluído, botão **Pagamentos** → passageiro clica **Registrar pagamento** (escolha `pix`/`cash`/`provider_card_machine`). Motorista, no mesmo serviço, vê **Confirmar pagamento** → confirmar com o valor esperado (o servidor recusa valor diferente: 409). Tente confirmar do lado do passageiro (deve não existir essa opção).
3. **Avaliações:** aba **Histórico** → serviço concluído → **Avaliar este serviço** (notas 1–5 + comentário) → **Enviar avaliação** (`POST /ratings`). Avalie nos dois papéis (passageiro avalia motorista e vice-versa). Repita o envio da mesma avaliação: deve falhar (409 "Rating already exists"). Confirme a atualização do painel "Sua reputação".
4. **Notificações:** aba **Notificações** (4ª aba, nos dois apps) → lista puxada de `GET /me/notifications`; toque para atualizar.

## Critério de evidência

Aprovação operacional exige a corrida completa no banco real através das APIs/interfaces, **sem UPDATE/DELETE manual** de registros durante o E2E. Registre: commit (`git rev-parse HEAD`), versão/hash do APK e do pacote Windows, horários, logs e estados observados (prints ajudam). Para as 4 features de conta, registre também o resultado de cada roteiro (sucesso/erro esperado).

## Limitação atual

- A rede LAN precisa permitir TCP/3000 do celular para o PC e o firewall do Windows deve aceitar conexões de entrada para essa porta no perfil de rede usado no teste.
- O destino é gerado por GPS a pequena distância; não há mapas externos.
