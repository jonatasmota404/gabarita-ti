import { describe, expect, it } from 'vitest';
import { destinoSeguro } from './form-acesso';

describe('destinoSeguro', () => {
  it.each([
    ['/questoes/10', '/questoes/10'],
    [null, '/'],
    ['https://malicioso.com', '/'],
    ['//malicioso.com', '/'],
    ['/\\malicioso.com', '/'],
  ])('%s → %s', (entrada, saida) => {
    expect(destinoSeguro(entrada)).toBe(saida);
  });
});
