import type { Recorte } from '@gabarita/shared';

export type Segmento =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'recorte'; recorte: Recorte }
  /** Marcador do texto sem imagem correspondente (mostrado como aviso discreto). */
  | { tipo: 'marcador'; rotulo: string };

export interface PlanoRecortes {
  apoio: Segmento[];
  enunciado: Segmento[];
  alternativas: Record<string, Segmento[]>;
}

const MARCADOR = /\[(FIGURA|TABELA)\s+(\d+)\]/gi;

/**
 * Posiciona os recortes no texto. Pelo contrato, os marcadores [FIGURA n]/[TABELA n] não
 * têm chave direta: casamos pela ordem entre os recortes do mesmo tipo (figura/tabela) e da
 * mesma origem (texto de apoio x questão). Recortes não referenciados por marcador vão
 * depois do texto a que pertencem (apoio, enunciado ou a própria alternativa).
 */
export function planejarRecortes(
  textoApoio: string | null,
  enunciado: string | null,
  alternativas: { letra: string; texto: string }[],
  recortes: Recorte[],
): PlanoRecortes {
  const usados = new Set<number>();
  const porOrigemTipo = (origem: 'apoio' | 'questao', tipo: string) =>
    recortes
      .filter(
        (r) =>
          (origem === 'apoio' ? r.origem === 'apoio' : r.origem !== 'apoio') && r.tipo === tipo,
      )
      .sort((a, b) => a.ordem - b.ordem);

  const segmentar = (texto: string | null, origem: 'apoio' | 'questao'): Segmento[] => {
    if (!texto) return [];
    const saida: Segmento[] = [];
    let ultimo = 0;
    for (const m of texto.matchAll(MARCADOR)) {
      const antes = texto.slice(ultimo, m.index);
      if (antes) saida.push({ tipo: 'texto', texto: antes });
      const tipo = m[1]!.toLowerCase();
      const recorte = porOrigemTipo(origem, tipo)[Number(m[2]) - 1];
      if (recorte && !usados.has(recorte.recorteId)) {
        usados.add(recorte.recorteId);
        saida.push({ tipo: 'recorte', recorte });
      } else {
        saida.push({
          tipo: 'marcador',
          rotulo: `${tipo === 'tabela' ? 'Tabela' : 'Figura'} ${m[2]}`,
        });
      }
      ultimo = m.index + m[0].length;
    }
    const resto = texto.slice(ultimo);
    if (resto) saida.push({ tipo: 'texto', texto: resto });
    return saida;
  };

  const apoio = segmentar(textoApoio, 'apoio');
  const enunciadoSeg = segmentar(enunciado, 'questao');
  const alternativasSeg: Record<string, Segmento[]> = {};
  for (const a of alternativas) alternativasSeg[a.letra] = segmentar(a.texto, 'questao');

  // Sobras, na ordem de leitura.
  for (const r of [...recortes].sort((a, b) => a.ordem - b.ordem)) {
    if (usados.has(r.recorteId)) continue;
    usados.add(r.recorteId);
    const seg: Segmento = { tipo: 'recorte', recorte: r };
    if (r.origem === 'apoio') apoio.push(seg);
    else if (r.letraAlternativa && alternativasSeg[r.letraAlternativa])
      alternativasSeg[r.letraAlternativa]!.push(seg);
    else enunciadoSeg.push(seg);
  }
  return { apoio, enunciado: enunciadoSeg, alternativas: alternativasSeg };
}
