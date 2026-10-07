# Nexo — Requisitos Funcionais e Não Funcionais

**Versão:** 1.0  
**Status:** FASE 0 — especificação consolidada

## 1. Requisitos funcionais

### RF-001 Identidade e contas
O sistema deve permitir cadastro, autenticação, recuperação de acesso, encerramento de sessão e gerenciamento da própria conta.

### RF-002 Papéis
Os papéis iniciais são customer, provider e admin/moderator. Um usuário pode possuir capacidades compatíveis com mais de um contexto sem duplicar sua identidade.

### RF-003 Perfil público
Usuários podem manter nome de exibição, foto, biografia, informações profissionais, mídia, avaliações e indicadores de verificação permitidos para exposição pública.

### RF-004 Dados privados
Dados de contato, identidade, documentos e artefatos de verificação devem permanecer separados do perfil público e sujeitos a autorização específica.

### RF-005 Veículos
Profissionais que prestam serviços veiculares podem cadastrar veículos. Cada veículo pertence a um profissional e possui estado de verificação.

### RF-006 Solicitações
Clientes podem criar solicitações com categoria, origem/destino quando aplicável, descrição, requisitos, mídia e demais dados necessários.

### RF-007 Descoberta e matching
O sistema deve selecionar ou apresentar profissionais elegíveis conforme categoria, disponibilidade, localização e regras da operação.

### RF-008 Ofertas e aceite
Serviços podem receber oferta/aceite conforme o tipo. Transporte de passageiros usa tarifa definida; carga/frete permite negociação.

### RF-009 Estados do serviço
Cada serviço deve possuir transições de estado validadas no servidor, histórico e auditoria dos eventos importantes.

### RF-010 Cancelamento
O sistema deve registrar quem cancelou, quando, motivo, estado anterior e consequências aplicáveis. Penalidades só devem existir após regra de produto definida.

### RF-011 Transporte
Viagens devem registrar origem, destino, modalidade, distância utilizada para cálculo, tarifa aplicada, valor calculado, início e conclusão.

### RF-012 Preço de passageiros
Carro = R$2,00/km. Moto = R$1,50/km. O preço deve ser calculado no servidor a partir de uma distância determinística e armazenado como snapshot da transação.

### RF-013 Carga/frete
Carga deve suportar oferta, contraproposta, aceite, rejeição, expiração e histórico imutável da negociação. Após aceite, o preço final fica congelado, salvo fluxo explícito de alteração.

### RF-014 Pagamento
O sistema deve registrar dinheiro, Pix ou cartão na máquina do próprio profissional, com status de pagamento e vínculo ao serviço. Nexo não processa inicialmente o cartão.

### RF-015 Reputação
Após serviço elegível concluído, cliente e profissional podem avaliar a contraparte uma vez. Alterações, denúncias e moderação devem ser auditáveis.

### RF-016 Mídia
Upload deve validar tipo, tamanho, integridade e autorização. Mídia deve possuir estado de moderação e acesso controlado.

### RF-017 Segurança
Usuários devem poder denunciar e bloquear. Admin/moderador deve possuir fluxo para revisão e ações proporcionais.

### RF-018 Assinatura
O domínio de assinatura deve suportar R$99,90/mês, ativação, renovação, cancelamento, falha, inadimplência, suspensão e histórico. O provedor mantém 100% do valor dos serviços.

### RF-019 Notificações
Eventos relevantes devem gerar notificações apropriadas, sem assumir entrega garantida por um único canal.

### RF-020 Auditoria
Mudanças críticas de identidade, autorização, serviço, preço, negociação, pagamento, assinatura, moderação e segurança devem gerar eventos auditáveis.

## 2. Requisitos não funcionais

- RNF-001 Segurança por padrão e menor privilégio.
- RNF-002 Autorização no servidor para todo recurso protegido.
- RNF-003 APIs idempotentes em operações sujeitas a retry.
- RNF-004 Integridade transacional para mudanças financeiras e de estado.
- RNF-005 Observabilidade com logs estruturados, métricas e rastreamento de correlação.
- RNF-006 Testabilidade das regras de domínio sem depender de UI.
- RNF-007 Mobile-first para Android/iOS; PC é ambiente de desenvolvimento/administração.
- RNF-008 Acessibilidade, feedback de erro, touch targets e legibilidade adequados a mobile.
- RNF-009 Privacidade e minimização de dados conforme LGPD, sujeitas à revisão jurídica.
- RNF-010 Nenhum segredo em código ou repositório.
- RNF-011 Backups e recuperação testáveis antes de produção.
- RNF-012 Dependências devem ser justificadas e auditadas.
- RNF-013 APIs devem possuir versionamento compatível e contratos documentados.
- RNF-014 Operações críticas devem ser resilientes a duplicação, timeout e reenvio.
- RNF-015 O sistema deve evitar dependência de microserviços prematuros.

## 3. Fora do escopo
Nexo Live, streaming, hands-free, câmera ao vivo, speech-to-text/text-to-speech para condução e infraestrutura específica dessas funções permanecem excluídos.
