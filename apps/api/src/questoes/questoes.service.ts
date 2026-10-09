import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  FiltrosDisponiveis,
  OcorrenciaConteudo,
  Pagina,
  QuestaoDetalhe,
  QuestaoResumo,
} from '@gabarita/shared';
import { trecho } from '../comum/texto.js';
import type { Env } from '../config/env.js';
import {
  IngestRepository,
  type CopiaIngest,
  type QuestaoEstudo,
} from '../ingest/ingest.repository.js';
import { ehPontuavel, opcoesResposta } from '../respostas/avaliacao.js';
import { resolverArquivoRecorte } from './arquivo-recorte.js';
import type { ListarQuestoesDto } from './dto/listar-questoes.dto.js';
import { deduplicarRecortes, paraRecorteDto } from './recortes.js';

@Injectable()
export class QuestoesService {
  constructor(
    @Inject(IngestRepository) private readonly ingest: IngestRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async listar(dto: ListarQuestoesDto): Promise<Pagina<QuestaoResumo>> {
    const { pagina, porPagina, ...filtro } = dto;
    const { questoes, total } = await this.ingest.listarQuestoes(filtro, {
      offset: (pagina - 1) * porPagina,
      limite: porPagina,
    });
    const ids = questoes.map((q) => q.questaoId);
    const [topicos, representantes] = await Promise.all([
      this.ingest.listarTopicos(ids),
      this.ingest.resolverRepresentantes(ids),
    ]);
    const principal = new Map<number, { area: string; topico: string }>();
    // listarTopicos vem com o principal primeiro; sem principal, usa o mais confiável.
    for (const t of topicos) {
      if (!principal.has(t.questaoId))
        principal.set(t.questaoId, { area: t.area, topico: t.topico });
    }
    return {
      itens: questoes.map((q) => ({
        // A cópia exibida pode ser a que atende ao filtro, mas o gabarito é do representante.
        ...this.camposComuns(q, representantes.get(q.questaoId)),
        trecho: trecho(q.enunciado),
        topicoPrincipal: principal.get(q.questaoId) ?? null,
      })),
      pagina,
      porPagina,
      total,
    };
  }

  async detalhar(questaoId: number): Promise<QuestaoDetalhe> {
    const q = await this.ingest.buscarQuestao(questaoId);
    if (!q) throw new NotFoundException('Questão não encontrada (pode ter sido removida)');
    const [alternativas, topicos, tecnologias, recortes, representantes, copias] =
      await Promise.all([
        q.tipoItem === 'certo_errado' ? [] : this.ingest.listarAlternativas(questaoId),
        this.ingest.listarTopicos([questaoId]),
        this.ingest.listarTecnologias(questaoId),
        this.ingest.listarRecortes(questaoId),
        this.ingest.resolverRepresentantes([questaoId]),
        this.ingest.listarCopias(questaoId),
      ]);
    // Pontuação sempre pelo representante, para as cópias não se contradizerem.
    const gabarito = representantes.get(questaoId) ?? q;
    return {
      ...this.camposComuns(q, gabarito),
      provaId: q.provaId,
      areaProva: q.areaProva,
      tipoCaderno: q.tipoCaderno,
      enunciado: q.enunciado,
      textoApoio: q.textoApoio,
      tipoCobranca: q.tipoCobranca,
      nivelCognitivo: q.nivelCognitivo,
      normaReferencia: q.normaReferencia,
      alternativas: alternativas.map(({ letra, texto }) => ({ letra, texto })),
      opcoesResposta: opcoesResposta(
        q.tipoItem,
        alternativas.map((a) => a.letra),
      ),
      pontuavel: ehPontuavel(gabarito),
      topicos: topicos.map(({ questaoId: _, ...t }) => t),
      tecnologias: tecnologias.map(({ questaoId: _, ...t }) => t),
      recortes: deduplicarRecortes(recortes).map(paraRecorteDto),
      tambemCaiuEm: ocorrenciasEmOutrasProvas(q, copias),
    };
  }

  async filtros(): Promise<FiltrosDisponiveis> {
    const { bancas, anos, topicos } = await this.ingest.listarFiltros();
    const areas = new Map<number, FiltrosDisponiveis['areas'][number]>();
    for (const t of topicos) {
      const area = areas.get(t.areaId) ?? { areaId: t.areaId, area: t.area, topicos: [] };
      area.topicos.push({ topicoId: t.topicoId, topico: t.topico });
      areas.set(t.areaId, area);
    }
    return { bancas, anos, areas: [...areas.values()] };
  }

  /** O recorte precisa pertencer à questão (via view); o caminho vem do banco, nunca da URL. */
  async arquivoRecorte(questaoId: number, recorteId: number) {
    const recorte = (await this.ingest.listarRecortes(questaoId)).find(
      (r) => r.recorteId === recorteId,
    );
    const arquivo =
      recorte &&
      (await resolverArquivoRecorte(
        this.config.get('RECORTES_DIR', { infer: true }),
        recorte.caminhoRelativo,
      ));
    if (!arquivo) throw new NotFoundException('Imagem indisponível');
    return arquivo;
  }

  private camposComuns(
    q: QuestaoEstudo,
    gabarito: Pick<QuestaoEstudo, 'gabaritoStatus' | 'gabaritoVersao'> = q,
  ) {
    return {
      questaoId: q.questaoId,
      banca: q.banca,
      orgao: q.orgao,
      ano: q.ano,
      cargo: q.cargo,
      numero: q.numero,
      tipoItem: q.tipoItem,
      gabaritoStatus: gabarito.gabaritoStatus,
      gabaritoVersao: gabarito.gabaritoVersao,
      classificada: q.classificada,
      temRecorte: q.temRecorte,
    };
  }
}

/**
 * Provas em que o conteúdo também caiu. Outros cadernos da mesma prova (mesma banca, órgão e
 * ano da cópia atual) e repetições de banca/órgão/ano não entram.
 */
export function ocorrenciasEmOutrasProvas(
  atual: Pick<QuestaoEstudo, 'banca' | 'orgao' | 'ano'>,
  copias: CopiaIngest[],
): OcorrenciaConteudo[] {
  const chave = (c: Pick<QuestaoEstudo, 'banca' | 'orgao' | 'ano'>) =>
    JSON.stringify([c.banca, c.orgao, c.ano]);
  const vistas = new Set([chave(atual)]);
  return copias.filter((c) => !vistas.has(chave(c)) && vistas.add(chave(c)));
}
