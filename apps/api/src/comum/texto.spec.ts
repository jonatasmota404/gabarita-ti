import { describe, expect, it } from 'vitest';
import { trecho } from './texto.js';

describe('trecho', () => {
  it('troca marcadores de figura/tabela e compacta espaços', () => {
    expect(trecho('Veja  a [FIGURA 1]\ne a [TABELA 2].')).toBe('Veja a (figura 1) e a (tabela 2).');
  });
  it('corta textos longos e tolera nulo', () => {
    expect(trecho('x'.repeat(500))).toHaveLength(220);
    expect(trecho(null)).toBe('');
  });
});
