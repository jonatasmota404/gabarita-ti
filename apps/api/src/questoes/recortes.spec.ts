import { describe, expect, it } from 'vitest';
import type { RecorteIngest } from '../ingest/ingest.repository.js';
import { deduplicarRecortes, paraRecorteDto } from './recortes.js';

const r = (p: Partial<RecorteIngest>): RecorteIngest => ({
  questaoId: 1,
  recorteId: 1,
  origem: 'questao',
  letraAlternativa: null,
  tipo: 'figura',
  pagina: 1,
  caminhoRelativo: 'a.png',
  ordem: 1,
  ...p,
});

describe('deduplicarRecortes', () => {
  it('mantém um único recorte de apoio repetido e coloca apoio antes da questão', () => {
    const saida = deduplicarRecortes([
      r({ recorteId: 5, ordem: 2, caminhoRelativo: 'q.png' }),
      r({ recorteId: 9, origem: 'apoio', ordem: 1, caminhoRelativo: 'apoio.png' }),
      r({ recorteId: 9, origem: 'apoio', ordem: 1, caminhoRelativo: 'apoio.png' }),
      r({ recorteId: 10, origem: 'apoio', ordem: 3, caminhoRelativo: 'apoio.png' }),
    ]);
    expect(saida.map((x) => x.recorteId)).toEqual([9, 5]);
  });

  it('não junta o mesmo arquivo em alternativas diferentes', () => {
    const saida = deduplicarRecortes([
      r({ recorteId: 1, letraAlternativa: 'A', caminhoRelativo: 'x.png' }),
      r({ recorteId: 2, letraAlternativa: 'B', caminhoRelativo: 'x.png', ordem: 2 }),
    ]);
    expect(saida).toHaveLength(2);
  });

  it('gera url da API sem expor o caminho no disco', () => {
    const dto = paraRecorteDto(r({ questaoId: 7, recorteId: 3, caminhoRelativo: 'segredo/x.png' }));
    expect(dto.url).toBe('/questoes/7/recortes/3');
    expect(JSON.stringify(dto)).not.toContain('segredo');
  });
});
