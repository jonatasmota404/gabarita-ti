import { describe, expect, it } from 'vitest';
import type { QuestaoGabarito, TopicoIngest } from '../ingest/ingest.repository.js';
import { calcularDesempenho } from './desempenho.js';

const gabarito = (
  questaoId: number,
  gabaritoStatus: string,
  respostaCorreta: string | null,
): QuestaoGabarito => ({
  questaoId,
  banca: 'fgv',
  orgao: 'X',
  ano: 2024,
  numero: questaoId,
  tipoItem: 'multipla_escolha',
  enunciado: 'e',
  gabaritoStatus,
  respostaCorreta,
  gabaritoVersao: 'definitivo',
});

const topico = (
  questaoId: number,
  areaId: number,
  topicoId: number,
  principal = true,
): TopicoIngest => ({
  questaoId,
  areaId,
  area: `Área ${areaId}`,
  topicoId,
  topico: `Tópico ${topicoId}`,
  principal,
  confianca: 0.9,
});

describe('calcularDesempenho', () => {
  const gabaritos = [
    gabarito(1, 'ok', 'A'),
    gabarito(2, 'ok', 'B'),
    gabarito(3, 'anulada', null),
    gabarito(4, 'ok', 'C'),
  ];
  const topicos = [
    topico(1, 10, 100),
    topico(1, 10, 101, false),
    topico(1, 20, 200, false),
    topico(2, 10, 100),
  ];

  it('conta acertos/erros só de questões pontuáveis e separa removidas', () => {
    const d = calcularDesempenho(
      [
        { questaoId: 1, resposta: 'A' }, // acerto
        { questaoId: 2, resposta: 'A' }, // erro
        { questaoId: 3, resposta: 'A' }, // anulada: não conta
        { questaoId: 999, resposta: 'A' }, // órfã: não conta
        { questaoId: 4, resposta: 'C' }, // acerto, sem classificação
      ],
      gabaritos,
      topicos,
    );
    expect(d.geral).toEqual({
      acertos: 2,
      erros: 1,
      taxaAcerto: 2 / 3,
      respondidas: 5,
      naoPontuadas: 1,
      deQuestoesRemovidas: 1,
    });
    expect(d.semClassificacao).toEqual({ acertos: 1, erros: 0, taxaAcerto: 1 });
  });

  it('agrega por área (uma vez por área) e por tópico', () => {
    const d = calcularDesempenho(
      [
        { questaoId: 1, resposta: 'A' },
        { questaoId: 2, resposta: 'A' },
      ],
      gabaritos,
      topicos,
    );
    const area10 = d.porArea.find((a) => a.areaId === 10)!;
    // questão 1 tem dois tópicos na área 10, mas conta uma vez na área
    expect(area10).toMatchObject({ acertos: 1, erros: 1, taxaAcerto: 0.5 });
    expect(area10.topicos.find((t) => t.topicoId === 100)).toMatchObject({ acertos: 1, erros: 1 });
    expect(area10.topicos.find((t) => t.topicoId === 101)).toMatchObject({ acertos: 1, erros: 0 });
    expect(d.porArea.find((a) => a.areaId === 20)).toMatchObject({ acertos: 1, erros: 0 });
  });

  it('sem respostas: taxa nula, sem quebrar', () => {
    const d = calcularDesempenho([], [], []);
    expect(d.geral.taxaAcerto).toBeNull();
    expect(d.porArea).toEqual([]);
  });

  it('reavalia com o gabarito vigente (ex.: questão anulada depois)', () => {
    const d = calcularDesempenho(
      [{ questaoId: 1, resposta: 'A' }],
      [gabarito(1, 'anulada', null)],
      [],
    );
    expect(d.geral).toMatchObject({ acertos: 0, erros: 0, naoPontuadas: 1 });
  });
});
