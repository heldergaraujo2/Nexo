import { describe, expect, it } from 'vitest';
import { PasswordService } from '../src/auth/password.service';
import { TokenService } from '../src/auth/token.service';

process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';

describe('identity security primitives', () => {
  it('hashes passwords without storing plaintext and verifies them', async () => {
    const service = new PasswordService();
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    expect(await service.verify('correct horse battery staple', hash)).toBe(true);
    expect(await service.verify('wrong password', hash)).toBe(false);
  });

  it('signs and verifies a short-lived role token', () => {
    const service = new TokenService();
    const token = service.sign({ accountId: 'account-1', role: 'provider' });
    expect(service.verify(token)).toEqual({ accountId: 'account-1', role: 'provider' });
  });

  it('rejects token tampering', () => {
    const service = new TokenService();
    const token = service.sign({ accountId: 'account-1', role: 'customer' });
    expect(() => service.verify(token.slice(0, -1) + 'x')).toThrow();
  });
});
