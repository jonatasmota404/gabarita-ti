import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { questaoCE, questaoME, recorte, resultado } from '@/test/fabricas';
import { ResolverQuestao } from './resolver-questao';

describe('ResolverQuestao', () => {
  it('múltipla escolha: responde, mostra erro e o gabarito', async () => {
    const responder = vi
      .fn()
      .mockResolvedValue(resultado({ resposta: 'A', correta: false, respostaCorreta: 'B' }));
    render(<ResolverQuestao questao={questaoME()} responder={responder} />);

    const botao = screen.getByRole('button', { name: 'Responder' });
    expect(botao).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /Alternativa A/ }));
    await userEvent.click(botao);

    expect(responder).toHaveBeenCalledWith(101, 'A');
    expect(await screen.findByText('Você errou.')).toBeInTheDocument();
    expect(screen.getByTestId('resultado')).toHaveTextContent('Gabarito: B');
    expect(screen.getByText('(gabarito)', { exact: false })).toBeInTheDocument();
    // Depois de responder, as opções ficam travadas.
    expect(screen.getByRole('radio', { name: /Alternativa C/ })).toBeDisabled();
  });

  it('mostra de forma discreta onde mais o conteúdo já caiu', () => {
    const { rerender } = render(<ResolverQuestao questao={questaoME()} />);
    expect(screen.queryByTestId('tambem-caiu-em')).not.toBeInTheDocument();

    rerender(
      <ResolverQuestao
        questao={questaoME({
          tambemCaiuEm: [
            { questaoId: 601, banca: 'fgv', orgao: 'TCE-RJ', ano: 2021 },
            { questaoId: 700, banca: 'cebraspe', orgao: 'TCU', ano: null },
          ],
        })}
      />,
    );
    const bloco = screen.getByTestId('tambem-caiu-em');
    expect(bloco).toHaveTextContent('Também caiu em: FGV 2021 (TCE-RJ), Cebraspe (TCU)');
    expect(screen.getByRole('link', { name: /FGV 2021/ })).toHaveAttribute('href', '/questoes/601');
  });

  it('certo/errado: mostra Certo e Errado (sem alternativas) e traduz o gabarito', async () => {
    const responder = vi.fn().mockResolvedValue(
      resultado({
        questaoId: 206,
        resposta: 'E',
        correta: true,
        respostaCorreta: 'E',
        gabaritoVersao: 'preliminar',
      }),
    );
    render(
      <ResolverQuestao
        questao={questaoCE({ gabaritoVersao: 'preliminar' })}
        responder={responder}
      />,
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    await userEvent.click(screen.getByRole('radio', { name: /Errado/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));

    expect(responder).toHaveBeenCalledWith(206, 'E');
    expect(await screen.findByText('Você acertou!')).toBeInTheDocument();
    expect(screen.getByTestId('resultado')).toHaveTextContent('Gabarito: Errado');
    expect(screen.getByTestId('resultado')).toHaveTextContent(/preliminar/i);
  });

  it.each([
    ['anulada', /anulou/],
    ['sem_gabarito', /Ainda não temos o gabarito/],
    ['inconsistente', /problema de extração/],
    ['status_desconhecido', /não conta/],
  ])('questão %s: avisa antes e não mostra acerto/erro depois', async (status, aviso) => {
    const responder = vi.fn().mockResolvedValue(
      resultado({
        pontuavel: false,
        correta: null,
        respostaCorreta: null,
        gabaritoStatus: status,
      }),
    );
    render(
      <ResolverQuestao
        questao={questaoME({ gabaritoStatus: status, pontuavel: false })}
        responder={responder}
      />,
    );
    expect(screen.getAllByText(aviso).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('radio', { name: /Alternativa D/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));

    expect(await screen.findByText('Resposta registrada, sem pontuação.')).toBeInTheDocument();
    expect(screen.queryByText(/Você acertou|Você errou/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gabarito:/)).not.toBeInTheDocument();
  });

  it('mostra texto de apoio e a imagem do apoio uma única vez', () => {
    render(
      <ResolverQuestao
        questao={questaoCE({
          textoApoio: 'Texto CB1A1. Observe a [FIGURA 1].',
          recortes: [
            recorte({ recorteId: 900, origem: 'apoio', url: '/questoes/206/recortes/900' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('Texto de apoio')).toBeInTheDocument();
    const imagens = screen.getAllByRole('img');
    expect(imagens).toHaveLength(1);
    expect(imagens[0]).toHaveAttribute('src', '/api/questoes/206/recortes/900');
  });

  it('tolera imagem ausente mostrando aviso no lugar', () => {
    render(
      <ResolverQuestao
        questao={questaoME({ enunciado: 'Veja [FIGURA 1]', recortes: [recorte({ pagina: 4 })] })}
      />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText(/Figura indisponível \(página 4/)).toBeInTheDocument();
  });

  it('exibe erro de envio e permite tentar de novo', async () => {
    const responder = vi
      .fn()
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValue(resultado({ correta: true, resposta: 'B' }));
    render(<ResolverQuestao questao={questaoME()} responder={responder} />);
    await userEvent.click(screen.getByRole('radio', { name: /Alternativa B/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar');
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(await screen.findByText('Você acertou!')).toBeInTheDocument();
  });

  it('marca questão sem classificação de forma discreta', () => {
    render(<ResolverQuestao questao={questaoME({ classificada: false, topicos: [] })} />);
    expect(screen.getByText('Sem classificação')).toBeInTheDocument();
  });

  it('tipo de item desconhecido não quebra', () => {
    render(
      <ResolverQuestao
        questao={questaoME({ tipoItem: 'discursiva', opcoesResposta: [], alternativas: [] })}
      />,
    );
    expect(screen.getByText(/ainda não pode ser respondido/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  });
});
