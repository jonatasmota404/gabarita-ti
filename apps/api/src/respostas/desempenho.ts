import type { Desempenho, Placar } from '@gabarita/shared';
import type { QuestaoGabarito, TopicoIngest } from '../ingest/ingest.repository.js';
import { avaliar } from './avaliacao.js';

export interface RespostaRegistrada {
  questaoId: number;
  resposta: string;
}

const taxa = (acertos: number, erros: number) =>
  acertos + erros === 0 ? null : acertos / (acertos + erros);

class Contador {
  acertos = 0;
  erros = 0;
  somar(correta: boolean) {
    if (correta) this.acertos++;
    else this.erros++;
  }
  placar(): Placar {
    return { acertos: this.acertos, erros: this.erros, taxaAcerto: taxa(this.acertos, this.erros) };
  }
}

/**
 * Calcula o desempenho reavaliando cada resposta com o gabarito VIGENTE no ingest (um
 * preliminar pode virar definitivo ou anulada). Respostas a questões que não existem mais
 * (questao_id órfão) e a questões não pontuáveis não entram em acerto/erro, só nas contagens.
 * Uma questão com tópicos em várias áreas conta em cada área (uma vez por área).
 *
 * As respostas já chegam com o `questaoId` do representante do conteúdo (e `gabaritos` e
 * `topicos` são dele): cópias do mesmo conteúdo pontuam igual e contam como um só conteúdo
 * em `conteudosRespondidos`. Cada tentativa continua entrando em acertos/erros.
 */
export function calcularDesempenho(
  respostas: RespostaRegistrada[],
  gabaritos: QuestaoGabarito[],
  topicos: TopicoIngest[],
): Desempenho {
  const porQuestao = new Map(gabaritos.map((g) => [g.questaoId, g]));
  const topicosPorQuestao = new Map<number, TopicoIngest[]>();
  for (const t of topicos) {
    const lista = topicosPorQuestao.get(t.questaoId) ?? [];
    lista.push(t);
    topicosPorQuestao.set(t.questaoId, lista);
  }

  const geral = new Contador();
  const semClassificacao = new Contador();
  const areas = new Map<
    number,
    { area: string; c: Contador; topicos: Map<number, { topico: string; c: Contador }> }
  >();
  let naoPontuadas = 0;
  let deQuestoesRemovidas = 0;
  const conteudos = new Set<number>();

  for (const r of respostas) {
    const gabarito = porQuestao.get(r.questaoId);
    if (!gabarito) {
      deQuestoesRemovidas++;
      continue;
    }
    conteudos.add(r.questaoId);
    const { pontuavel, correta } = avaliar(gabarito, r.resposta);
    if (!pontuavel) {
      naoPontuadas++;
      continue;
    }
    geral.somar(correta!);
    const ts = topicosPorQuestao.get(r.questaoId) ?? [];
    if (!ts.length) semClassificacao.somar(correta!);
    const areasContadas = new Set<number>();
    for (const t of ts) {
      let area = areas.get(t.areaId);
      if (!area) {
        area = { area: t.area, c: new Contador(), topicos: new Map() };
        areas.set(t.areaId, area);
      }
      if (!areasContadas.has(t.areaId)) {
        area.c.somar(correta!);
        areasContadas.add(t.areaId);
      }
      let topico = area.topicos.get(t.topicoId);
      if (!topico) {
        topico = { topico: t.topico, c: new Contador() };
        area.topicos.set(t.topicoId, topico);
      }
      topico.c.somar(correta!);
    }
  }

  const porVolume = <T extends Placar>(a: T, b: T) => b.acertos + b.erros - (a.acertos + a.erros);

  return {
    geral: {
      ...geral.placar(),
      respondidas: respostas.length,
      conteudosRespondidos: conteudos.size,
      naoPontuadas,
      deQuestoesRemovidas,
    },
    porArea: [...areas.entries()]
      .map(([areaId, a]) => ({
        areaId,
        area: a.area,
        ...a.c.placar(),
        topicos: [...a.topicos.entries()]
          .map(([topicoId, t]) => ({ topicoId, topico: t.topico, ...t.c.placar() }))
          .sort(porVolume),
      }))
      .sort(porVolume),
    semClassificacao: semClassificacao.placar(),
  };
}
