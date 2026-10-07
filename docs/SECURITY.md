# Nexo — Security Baseline

**Versão:** 1.0

## Princípios
- Least privilege.
- Private-by-default para identidade e documentos.
- Autenticação forte.
- Autorização server-side em todo recurso protegido.
- Secrets fora do repositório.
- Auditoria de eventos críticos.
- Rate limiting e prevenção de abuso.
- Validação rigorosa de input.
- Upload seguro.
- TLS.
- Criptografia em repouso quando apropriado.
- Backups e recuperação testada.

## Autorização
Cada request protegido verifica identidade, papel/capacidade, relação com recurso, estado e ação permitida. Não confiar em IDs ou papéis enviados pelo cliente.

## PII e verificação
CPF, documentos, contatos privados, resultados e artefatos de verificação ficam em área restrita. Endpoints públicos retornam somente campos classificados como públicos.

## Mídia
Validar MIME real, extensão, tamanho e checksum; bucket privado; URLs temporárias; moderação; impedir path traversal e conteúdo executável.

## API
Rate limits por identidade/IP conforme risco, proteção contra enumeração, payload limits, timeouts e idempotência para comandos críticos.

## Concorrência
Aceite, negociação, pagamento e assinatura usam transação, constraints ou versionamento otimista conforme o caso.

## Auditoria
Registrar ator, ação, recurso, resultado, correlation ID e metadata mínima. Nunca registrar senha, token, CVV ou dados sensíveis desnecessários.

## Mobile
Tokens não devem ser armazenados em armazenamento inseguro. Permissões de localização/câmera/notificação devem ser solicitadas somente quando necessárias.

## Supply chain
Dependências devem ser auditadas no CI. Segredos e arquivos de ambiente local devem estar no .gitignore.

## LGPD
A implementação deve seguir LGPD.md e revisão jurídica antes do uso comercial de dados sensíveis/localização.
