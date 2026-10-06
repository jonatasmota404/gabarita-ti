import { describe, expect, it } from 'vitest';
import { recorte } from '@/test/fabricas';
import { planejarRecortes } from './marcadores';

describe('planejarRecortes', () => {
  it('casa [FIGURA n] pela ordem entre recortes do mesmo tipo e origem', () => {
    const plano = planejarRecortes(
      null,
      'Veja [FIGURA 1] e [TABELA 1] e [FIGURA 2].',
      [],
      [
        recorte({ recorteId: 3, tipo: 'figura', ordem: 3 }),
        recorte({ recorteId: 1, tipo: 'figura', ordem: 1 }),
        recorte({ recorteId: 2, tipo: 'tabela', ordem: 2 }),
      ],
    );
    expect(
      plano.enunciado.map((s) => (s.tipo === 'recorte' ? s.recorte.recorteId : s.tipo)),
    ).toEqual(['texto', 1, 'texto', 2, 'texto', 3, 'texto']);
  });

  it('marcador sem recorte vira aviso; recorte sem marcador vai ao fim do seu texto', () => {
    const plano = planejarRecortes(
      null,
      'Saída do código [FIGURA 1]',
      [],
      [recorte({ recorteId: 9, tipo: 'codigo' })],
    );
    expect(plano.enunciado).toEqual([
      { tipo: 'texto', texto: 'Saída do código ' },
      { tipo: 'marcador', rotulo: 'Figura 1' },
      { tipo: 'recorte', recorte: expect.objectContaining({ recorteId: 9 }) },
    ]);
  });

  it('separa apoio de questão e põe imagem de alternativa na alternativa', () => {
    const plano = planejarRecortes(
      'Texto base [FIGURA 1]',
      'Qual árvore é AVL?',
      [
        { letra: 'A', texto: '[FIGURA 1]' },
        { letra: 'B', texto: 'Nenhuma' },
      ],
      [
        recorte({ recorteId: 50, origem: 'apoio', ordem: 1 }),
        recorte({ recorteId: 60, letraAlternativa: 'A', ordem: 2 }),
        recorte({ recorteId: 61, letraAlternativa: 'B', ordem: 3 }),
      ],
    );
    expect(plano.apoio.find((s) => s.tipo === 'recorte')).toMatchObject({
      recorte: { recorteId: 50 },
    });
    expect(plano.alternativas.A).toEqual([
      { tipo: 'recorte', recorte: expect.objectContaining({ recorteId: 60 }) },
    ]);
    expect(plano.alternativas.B!.at(-1)).toMatchObject({ recorte: { recorteId: 61 } });
    expect(plano.enunciado).toEqual([{ tipo: 'texto', texto: 'Qual árvore é AVL?' }]);
  });

  it('recorte de apoio sem texto de apoio ainda aparece (no bloco de apoio)', () => {
    const plano = planejarRecortes(null, 'x', [], [recorte({ recorteId: 7, origem: 'apoio' })]);
    expect(plano.apoio).toHaveLength(1);
  });
});
