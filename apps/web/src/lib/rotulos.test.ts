import { describe, expect, it } from 'vitest';
import { formatarTaxa, infoStatus, rotuloBanca, rotuloLetra } from './rotulos';

describe('rótulos', () => {
  it('status ok não tem aviso; os demais (e desconhecidos) têm', () => {
    expect(infoStatus('ok')).toBeNull();
    expect(infoStatus('anulada')?.rotulo).toBe('Anulada');
    expect(infoStatus('sem_gabarito')?.rotulo).toBe('Sem gabarito');
    expect(infoStatus('inconsistente')?.rotulo).toBe('Gabarito em revisão');
    expect(infoStatus('valor_novo')?.rotulo).toBe('Não pontuável');
  });

  it('interpreta C/E pelo tipo de item', () => {
    expect(rotuloLetra('certo_errado', 'C')).toBe('Certo');
    expect(rotuloLetra('certo_errado', 'E')).toBe('Errado');
    expect(rotuloLetra('multipla_escolha', 'E')).toBe('E');
  });

  it('banca desconhecida não quebra', () => {
    expect(rotuloBanca('fgv')).toBe('FGV');
    expect(rotuloBanca('idecan')).toBe('Idecan');
  });

  it('formata taxa', () => {
    expect(formatarTaxa(null)).toBe('—');
    expect(formatarTaxa(2 / 3)).toBe('67%');
  });
});
