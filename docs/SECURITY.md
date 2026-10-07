# Nexo — Security Baseline

## Principles
- Least privilege
- Private-by-default identity data
- Strong authentication
- Authorization at every protected resource
- Secure secrets handling
- Audit important security/business events
- Rate limiting and abuse prevention
- Secure media upload handling
- Input validation
- Encryption in transit and at rest where appropriate
- Backups and recovery planning

## Sensitive information
CPF, identity documents, private contact information, verification artifacts and other sensitive/private data must never be exposed through public profile APIs.

## Media
User-uploaded photos/videos must be validated, stored securely, moderated as required and served through controlled access.

## Safety
The product should support reporting, blocking, fraud controls and emergency-related workflows appropriate to the launch jurisdiction.

## Development
Secrets must never be committed. Security-sensitive changes require tests and explicit documentation.
