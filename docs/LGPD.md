# Nexo — LGPD e Privacidade

**Versão:** 1.0  
**Natureza:** baseline de engenharia; não substitui assessoria jurídica.

## Princípios
- finalidade;
- necessidade e minimização;
- transparência;
- segurança;
- retenção limitada;
- direitos do titular;
- controle de acesso;
- ciclo de vida;
- auditabilidade.

## Classes
**Público:** dados deliberadamente exibidos no perfil.

**Conta privada:** dados necessários para operação e contato.

**Verificação:** identidade, documentos e evidências de veículo; altamente restritos.

**Operacional:** solicitações, viagens, ofertas, avaliações, incidentes e auditoria.

**Mídia:** fotos, vídeos e legendas.

## Regras de engenharia
- Separar armazenamento e APIs públicas de dados de verificação.
- Aplicar menor privilégio por serviço e função.
- Minimizar dados enviados a integrações externas.
- Definir retenção por classe antes da produção.
- Registrar acesso administrativo a dados sensíveis.
- Permitir correção, acesso, exportação e exclusão quando juridicamente aplicável.
- Preservar dados necessários a obrigações legais/auditoria quando houver base jurídica, com retenção documentada.
- Localização deve ser coletada somente quando necessária ao fluxo e com transparência adequada.
- Consentimento não deve ser usado automaticamente como base jurídica para tudo; a base aplicável precisa ser definida com jurídico.

## Localização
Origem/destino e localização operacional são dados sensíveis do ponto de vista de privacidade e devem possuir acesso restrito, retenção e exposição mínima.

## Verificação
Documentos brutos não devem circular entre clientes/providers. O produto expõe somente indicadores de verificação necessários.

## Incidentes
Falhas de segurança devem gerar registro, contenção, análise de impacto e fluxo de resposta compatível com requisitos legais.

## Antes do lançamento comercial
Revisar bases legais, avisos de privacidade, retenção, DPIA quando aplicável, contratos com operadores e requisitos específicos de localização/identidade.
