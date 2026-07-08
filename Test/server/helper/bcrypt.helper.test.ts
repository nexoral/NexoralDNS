import { describe, it, expect } from 'vitest';
import Bcrypt from '@server/source/helper/bcrypt.helper';

// Low salt rounds keep the real bcrypt round-trip fast while still exercising the
// genuine hash/compare behaviour (no mocking — this verifies real correctness).
const bcrypt = new Bcrypt(4);

describe('Bcrypt', () => {
  it('Encrypt produces a hash that differs from the plaintext', async () => {
    const hash = await bcrypt.Encrypt('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('Compare returns true for the matching plaintext', async () => {
    const hash = await bcrypt.Encrypt('secret123');
    expect(await bcrypt.Compare('secret123', hash)).toBe(true);
  });

  it('Compare returns false for a wrong plaintext', async () => {
    const hash = await bcrypt.Encrypt('secret123');
    expect(await bcrypt.Compare('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same input (random salt)', async () => {
    const [a, b] = await Promise.all([bcrypt.Encrypt('same'), bcrypt.Encrypt('same')]);
    expect(a).not.toBe(b);
    expect(await bcrypt.Compare('same', a)).toBe(true);
    expect(await bcrypt.Compare('same', b)).toBe(true);
  });

  it('defaults to 10 salt rounds when none is supplied', async () => {
    const hash = await new Bcrypt().Encrypt('x');
    // bcrypt hash format: $2<a/b>$<cost>$...
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });
});
