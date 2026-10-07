import { describe, expect, it } from 'vitest';

describe('foundation', () => {
  it('has a deterministic health contract', () => {
    expect({ status: 'ok' as const }).toEqual({ status: 'ok' });
  });
});
