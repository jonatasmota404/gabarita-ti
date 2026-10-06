import type { Recorte } from '@gabarita/shared';
import type { RecorteIngest } from '../ingest/ingest.repository.js';

/**
 * Recortes do texto de apoio (origem = 'apoio') vêm repetidos em cada questão do grupo e,
 * por segurança, também deduplicamos repetições dentro de uma mesma questão: o mesmo
 * recorte_id, ou o mesmo arquivo no mesmo lugar (origem + letra), aparece uma vez só.
 * Ordem de leitura: apoio primeiro, depois `ordem`.
 */
export function deduplicarRecortes(recortes: RecorteIngest[]): RecorteIngest[] {
  const vistosId = new Set<number>();
  const vistosArquivo = new Set<string>();
  const ordenados = [...recortes].sort(
    (a, b) =>
      Number(b.origem === 'apoio') - Number(a.origem === 'apoio') ||
      a.ordem - b.ordem ||
      a.recorteId - b.recorteId,
  );
  return ordenados.filter((r) => {
    const chaveArquivo = `${r.origem}|${r.letraAlternativa ?? ''}|${r.caminhoRelativo}`;
    if (vistosId.has(r.recorteId) || vistosArquivo.has(chaveArquivo)) return false;
    vistosId.add(r.recorteId);
    vistosArquivo.add(chaveArquivo);
    return true;
  });
}

export function paraRecorteDto(r: RecorteIngest): Recorte {
  return {
    recorteId: r.recorteId,
    origem: r.origem,
    letraAlternativa: r.letraAlternativa,
    tipo: r.tipo,
    pagina: r.pagina,
    ordem: r.ordem,
    url: `/questoes/${r.questaoId}/recortes/${r.recorteId}`,
  };
}
