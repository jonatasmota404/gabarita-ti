import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListaHistorico, PainelDesempenho } from './painel-desempenho';

describe('PainelDesempenho', () => {
  it('mostra taxa geral, áreas e o que ficou fora da conta', () => {
    render(
      <PainelDesempenho
        desempenho={{
          geral: {
            acertos: 2,
            erros: 1,
            taxaAcerto: 2 / 3,
            respondidas: 6,
            naoPontuadas: 2,
            deQuestoesRemovidas: 1,
          },
          porArea: [
            { areaId: 1, area: 'Banco de Dados', acertos: 2, erros: 0, taxaAcerto: 1, topicos: [] },
          ],
          semClassificacao: { acertos: 0, erros: 1, taxaAcerto: 0 },
        }}
      />,
    );
    expect(screen.getByTestId('taxa-geral')).toHaveTextContent('67%');
    expect(screen.getByText(/2 em questões anuladas ou sem gabarito/)).toBeInTheDocument();
    expect(screen.getByText(/1 em questões removidas/)).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /Banco de Dados/ })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByText('Questões ainda sem classificação')).toBeInTheDocument();
  });
});

describe('ListaHistorico', () => {
  it('marca questão removida sem link e sem quebrar', () => {
    render(
      <ListaHistorico
        itens={[
          {
            respostaId: 'a',
            questaoId: 424242,
            resposta: 'A',
            respondidaEm: '2026-10-01T10:00:00Z',
            correta: null,
            pontuavel: false,
            gabaritoStatus: null,
            removida: true,
            questao: null,
          },
          {
            respostaId: 'b',
            questaoId: 207,
            resposta: 'C',
            respondidaEm: '2026-10-01T11:00:00Z',
            correta: null,
            pontuavel: false,
            gabaritoStatus: 'anulada',
            removida: false,
            questao: {
              banca: 'cebraspe',
              orgao: 'TCU',
              ano: 2022,
              numero: 43,
              tipoItem: 'certo_errado',
              trecho: 'LGPD...',
            },
          },
        ]}
      />,
    );
    expect(screen.getByText(/Questão removida do banco/)).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Anulada')).toBeInTheDocument();
    expect(screen.queryByText('Acerto')).not.toBeInTheDocument();
    expect(screen.queryByText('Erro')).not.toBeInTheDocument();
  });
});
