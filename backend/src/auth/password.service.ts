import { Injectable } from '@nestjs/common';
import { randomBytes, pbkdf2, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(pbkdf2);
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await derive(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)) as Buffer;
    return ['pbkdf2', ITERATIONS, salt.toString('base64url'), key.toString('base64url')].join('$');
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [scheme, iterationsText, saltText, keyText] = encoded.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
    if (!saltText || !keyText) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    const actual = (await derive(password, salt, iterations, expected.length, DIGEST)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
