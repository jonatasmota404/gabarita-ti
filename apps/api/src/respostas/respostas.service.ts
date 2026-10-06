import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Desempenho, HistoricoItem, Pagina, ResultadoResposta } from '@gabarita/shared';
import { trecho } from '../comum/texto.js';
import { IngestRepository } from '../ingest/ingest.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { avaliar, normalizarLetra, opcoesResposta } from './avaliacao.js';
import { calcularDesempenho } from './desempenho.js';

@Injectable()
export class RespostasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IngestRepository) private readonly ingest: IngestRepository,
  ) {}

  async responder(usuarioId: string, questaoId: number, letra: string): Promise<ResultadoResposta> {
    const q = await this.ingest.buscarQuestao(questaoId);
    if (!q) throw new NotFoundException('Questão não encontrada (pode ter sido removida)');

    const letras =
      q.tipoItem === 'multipla_escolha'
        ? (await this.ingest.listarAlternativas(questaoId)).map((a) => a.letra)
        : [];
    const resposta = normalizarLetra(letra);
    const opcoes = opcoesResposta(q.tipoItem, letras);
    if (!opcoes.includes(resposta)) {
      throw new UnprocessableEntityException(
        opcoes.length
          ? `Resposta inválida para esta questão. Opções: ${opcoes.join(', ')}`
          : 'Esta questão não pode ser respondida no app',
      );
    }

    const avaliacao = avaliar(q, resposta);
    const registro = await this.prisma.resposta.create({
      data: {
        usuarioId,
        questaoId,
        resposta,
        tipoItem: q.tipoItem,
        gabaritoStatus: q.gabaritoStatus,
        respostaCorreta: avaliacao.respostaCorreta,
        gabaritoVersao: q.gabaritoVersao,
        pontuavel: avaliacao.pontuavel,
        correta: avaliacao.correta,
      },
    });
    return {
      respostaId: registro.id,
      questaoId,
      resposta,
      pontuavel: avaliacao.pontuavel,
      correta: avaliacao.correta,
      gabaritoStatus: q.gabaritoStatus,
      respostaCorreta: avaliacao.respostaCorreta,
      gabaritoVersao: q.gabaritoVersao,
      respondidaEm: registro.respondidaEm.toISOString(),
    };
  }

  async desempenho(usuarioId: string): Promise<Desempenho> {
    // MVP: carrega todas as respostas do usuário (só 2 colunas). Se crescer muito,
    // agregar por questão no SQL antes de consultar o ingest.
    const respostas = await this.prisma.resposta.findMany({
      where: { usuarioId },
      select: { questaoId: true, resposta: true },
    });
    const ids = [...new Set(respostas.map((r) => r.questaoId))];
    const [gabaritos, topicos] = await Promise.all([
      this.ingest.buscarGabaritos(ids),
      this.ingest.listarTopicos(ids),
    ]);
    return calcularDesempenho(respostas, gabaritos, topicos);
  }

  async historico(
    usuarioId: string,
    pagina: number,
    porPagina: number,
  ): Promise<Pagina<HistoricoItem>> {
    const [total, respostas] = await Promise.all([
      this.prisma.resposta.count({ where: { usuarioId } }),
      this.prisma.resposta.findMany({
        where: { usuarioId },
        orderBy: { respondidaEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);
    const gabaritos = new Map(
      (await this.ingest.buscarGabaritos([...new Set(respostas.map((r) => r.questaoId))])).map(
        (g) => [g.questaoId, g],
      ),
    );
    return {
      itens: respostas.map((r) => {
        const g = gabaritos.get(r.questaoId);
        // Questão órfã (ex.: prova reextraída com novos ids): mantém o registro, marcada.
        if (!g) {
          return {
            respostaId: r.id,
            questaoId: r.questaoId,
            resposta: r.resposta,
            respondidaEm: r.respondidaEm.toISOString(),
            correta: null,
            pontuavel: false,
            gabaritoStatus: null,
            removida: true,
            questao: null,
          };
        }
        const { pontuavel, correta } = avaliar(g, r.resposta);
        return {
          respostaId: r.id,
          questaoId: r.questaoId,
          resposta: r.resposta,
          respondidaEm: r.respondidaEm.toISOString(),
          correta,
          pontuavel,
          gabaritoStatus: g.gabaritoStatus,
          removida: false,
          questao: {
            banca: g.banca,
            orgao: g.orgao,
            ano: g.ano,
            numero: g.numero,
            tipoItem: g.tipoItem,
            trecho: trecho(g.enunciado),
          },
        };
      }),
      pagina,
      porPagina,
      total,
    };
  }
}
