# HANDOFF — Nexo (2026-10-10, fim da sessão)

Este documento é o ponto de entrada para quem continuar o trabalho. Fonte de verdade completa do projeto: **`PROJECT_STATUS.md`** (matriz de telas, auditorias, decisões e pendências). Histórico técnico: commits do branch `arena/af7a1fc1-nexo`.

---

## PARA O USUÁRIO

### 1. Baixar o APK mais recente (Android)
O build mais recente **verde** do CI é o run `38084925962` (commit `eb8cc5f`):
- Página do run (baixar em **Artifacts**, no final da página): https://github.com/heldergaraujo2/Nexo/actions/runs/38084925962
- Artefato: **`nexo-android-debug`** (~77 MB, é um `.zip` — descompacte para achar o `.apk`).
- Com `gh` instalado: `gh run download 38084925962 -R heldergaraujo2/Nexo -n nexo-android-debug`
- Artefatos do GitHub expiram (~90 dias) — para guardar uma versão, copie o arquivo e registre o SHA-256.

### 2. Instalar no Android físico
1. Copie o `.apk` para o celular (cabo USB, Google Drive, etc.).
2. Toque no arquivo `.apk`. Se aparecer um aviso de "instalar apps desconhecidos", permita para o app de arquivos/instalador e continue.
3. Abra o app **Nexo**. Aceite a permissão de localização (o app precisa do GPS para solicitar corridas).

### 3. Pacote Windows (app do motorista)
- Mesmo run: artefato **`nexo-windows-driver`** (~12 MB) → descompacte em qualquer pasta → execute o `.exe`.
- (Pode aparecer aviso do Windows Defender SmartScreen — "Mais informações" → "Executar assim mesmo". É esperado em builds sem assinatura.)

### 4. Configurar o endereço da API na tela de login
O primeiro campo da tela de login é o endereço da API. Use conforme o cenário:
| Onde está o app | Onde está o backend | Endereço a digitar |
|---|---|---|
| Celular físico | PC na mesma rede Wi-Fi | `http://IP-DA-REDE-DO-PC:3000/v1` (descubra o IP com `ipconfig` no Windows — ex.: `http://192.168.0.10:3000/v1`) |
| Emulador Android | mesmo PC | `http://10.0.2.2:3000/v1` |
| App Windows | mesmo PC | `http://127.0.0.1:3000/v1` |

Obs.: o endereço **não** pode ser `localhost` no celular (o celular não encontra o PC por esse nome). O firewall do PC deve permitir conexões na porta 3000 (perfil de rede privado).

### 5. Subir o backend localmente (para testar login de verdade)
Pré-requisitos: Node.js 20+ e PostgreSQL 15+ rodando localmente.
```bash
# 1. Criar um banco (uma vez):  createdb nexo   (ou via psql: CREATE DATABASE nexo;)
# 2. Entrar na pasta do backend
cd backend
# 3. Instalar dependências
npm install
# 4. Aplicar as migrations EM ORDEM (arquivos 001 até 011):
#    para cada arquivo: psql postgresql://USUARIO:SENHA@localhost:5432/nexo -v ON_ERROR_STOP=1 -f migrations/00X_*.sql
#    (exemplo Linux/Mac:  for f in migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done)
# 5. Configurar o banco e segredo (substitua USUARIO/SENHA):
export DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/nexo"
export AUTH_TOKEN_SECRET="escolha-um-segredo-longo-e-aleatorio"
# 6. Compilar e subir:
npm run build
npm start          # API em http://localhost:3000/v1
# (documentação da API: http://localhost:3000/v1/docs)
# 7. Opcional — criar contas de teste (motorista+passageiro):
export NEXO_API_URL="http://127.0.0.1:3000/v1"
export NEXO_E2E_DRIVER_PASSWORD="uma-senha-local"
export NEXO_E2E_PASSENGER_PASSWORD="outra-senha-local"
npm run e2e:provision
```
Confirme que o backend está vivo: abra `http://localhost:3000/v1/health` — deve responder `{"status":"ok","database":"up"}`.

### 6. Duas decisões que precisam da SUA palavra
1. **Upload de documentos/fotos (módulo media):** hoje o app guarda apenas o registro dos arquivos, não o arquivo em si. Recomendação da equipe técnica: deixar para uma fase futura (é um pacote de trabalho grande e não atrapalha os fluxos de corrida/pagamento). **Responda se concorda em adiar ou quer começar agora.**
2. **Merge do PR #27 (a versão atual do app) na branch principal (`main`):** tecnicamente tudo está pronto e verde; o teste visual em celular/PC de verdade pode acontecer depois do merge. **Responda se autoriza o merge ou prefere testar fisicamente antes.**

### 7. O que ainda NÃO foi testado fisicamente (honesto)
- O app em **celular Android real** e o app **Windows** com dois usuários reais (passageiro + motorista) — os roteiros de teste estão prontos em `docs/OPERATIONS_E2E_PC_ANDROID.md`.
- GPS/desempenho/visual em tela real — os testes automatizados cobrem comportamento, não aparência física.

---

## PARA O PRÓXIMO AGENT

### Estado em uma olhada
- **PR #27:** https://github.com/heldergaraujo2/Nexo/pull/27 — branch `arena/af7a1fc1-nexo`.
- **HEAD atual:** `eb8cc5f8011580449068fe3900348ed1a9a9a5b0` — **CI 3/3 VERDE** neste HEAD: run https://github.com/heldergaraujo2/Nexo/actions/runs/38084925962 (backend pass / mobile pass / windows-driver pass).
- **`main` intacta:** `869040cd7890bd3ced2ccac6ed66c390d85d66ae` (não tocada).
- **Resumo (1 parágrafo):** o app Flutter prioritário (login, passageiro, motorista, histórico, perfil) está integrado de verdade aos endpoints reais, mais 4 features de conta (edição de perfil, pagamentos, avaliações, notificações); o backend tem 68 testes de integração + 30 checks E2E contra o servidor real, auditoria de segurança de pagamentos/avaliações sem lacunas, health que verifica o banco, OpenAPI baseline em `/v1/docs` e matriz de testes negativos 12/12 — tudo com CI verde nos 3 jobs. **`PROJECT_STATUS.md` é a fonte de verdade completa** (§1–§16).

### Ponto de partida sugerido (sem rigidez)
As 5 pendências estão detalhadas em `PROJECT_STATUS.md` §16: (1) auditoria retroativa do bug de validação do vitest; (2) fechar a contagem exata de testes Flutter (27 vs 23); (3) mensagem de GPS (já confirmada — só micro-caveat cosmético); (4) decisão do usuário sobre o media; (5) decisão do usuário sobre o merge do PR #27. **A prioridade real deve ser definida pelo que o usuário reportar após testar o APK/Windows fisicamente** — esse é o próximo passo natural do fluxo; os itens técnicos seguem depois.

### Avisos de ambiente (leia antes de agir)
- **Repositório PÚBLICO** desde 2026-10-10 (decisão do dono para contornar o bloqueio de billing do GitHub Actions em repo privado). Nunca commitar segredos reais; varredura completa do histórico feita em `PROJECT_STATUS.md` §14.1.
- **CI funciona de verdade** (3 jobs: backend com Postgres do runner, flutter test + build APK, build Windows). Exigir **3/3 verde** antes de fechar qualquer rodada.
- **3 arquivos locais descartáveis — NUNCA commitar:** `backend/.local-e2e-run.cjs`, `backend/.local-test-pg.cjs`, `backend/package-lock.json` (o CI usa `npm install`, não `npm ci`).
- **Testes backend locais:** `cd backend && npm install embedded-postgres --no-save && node .local-test-pg.cjs` (sobe um Postgres embutido, aplica migrations, roda a suíte). E2E real: `npm run build && node .local-e2e-run.cjs`.
- **Rigor (Seção 0 do comando mestre):** nenhuma alegação sem evidência bruta colada (saída de comando real, citação arquivo:linha ou diff). Classificar tudo como VERIFICADO / MITIGAÇÃO PARCIAL / BLOQUEADO (motivo técnico exato). Nada de "testado em dispositivo físico" sem output real.

### Regra de ouro
**NÃO repita trabalho já feito — consulte `PROJECT_STATUS.md` e o histórico de commits antes de agir.**
