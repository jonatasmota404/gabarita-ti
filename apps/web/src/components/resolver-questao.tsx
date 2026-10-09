'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { QuestaoDetalhe, ResultadoResposta } from '@gabarita/shared';
import { api, ErroApi } from '@/lib/api';
import { planejarRecortes } from '@/lib/marcadores';
import { infoStatus, rotuloBanca, rotuloLetra, rotuloTipoItem } from '@/lib/rotulos';
import { AvisoStatus, EtiquetaStatus } from './status-gabarito';
import { TextoComRecortes } from './texto-com-recortes';
import { Botao, Etiqueta, cx } from './ui';

export type Responder = (questaoId: number, resposta: string) => Promise<ResultadoResposta>;

const responderNaApi: Responder = (questaoId, resposta) =>
  api<ResultadoResposta>(`questoes/${questaoId}/respostas`, {
    method: 'POST',
    body: JSON.stringify({ resposta }),
  });

export function ResolverQuestao({
  questao,
  proximaId,
  responder = responderNaApi,
}: {
  questao: QuestaoDetalhe;
  proximaId?: number | null;
  responder?: Responder;
}) {
  const [escolha, setEscolha] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoResposta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const plano = useMemo(
    () =>
      planejarRecortes(
        questao.textoApoio,
        questao.enunciado,
        questao.alternativas,
        questao.recortes,
      ),
    [questao],
  );
  const ehCertoErrado = questao.tipoItem === 'certo_errado';
  const opcoes = questao.opcoesResposta;
  const respondida = resultado !== null;

  async function enviar() {
    if (!escolha || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      setResultado(await responder(questao.questaoId, escolha));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function refazer() {
    setResultado(null);
    setEscolha(null);
  }

  /** Estado visual de uma opção depois de responder. */
  function estadoOpcao(letra: string): 'certa' | 'errada' | 'escolhida' | null {
    if (!resultado) return null;
    if (resultado.pontuavel && resultado.respostaCorreta === letra) return 'certa';
    if (resultado.resposta === letra) return resultado.pontuavel ? 'errada' : 'escolhida';
    return null;
  }

  return (
    <article className="pb-40" aria-labelledby="titulo-questao">
      <header className="mb-4">
        <p className="text-xs font-semibold tracking-wider text-suave uppercase">
          {rotuloBanca(questao.banca)} · {questao.orgao}
          {questao.ano ? ` · ${questao.ano}` : ''}
        </p>
        <h1 id="titulo-questao" className="mt-1 text-lg leading-snug font-bold">
          Questão {questao.numero}
          <span className="font-normal text-suave"> — {questao.cargo}</span>
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Etiqueta>{rotuloTipoItem(questao.tipoItem)}</Etiqueta>
          <EtiquetaStatus status={questao.gabaritoStatus} />
          {questao.gabaritoStatus === 'ok' && questao.gabaritoVersao === 'preliminar' && (
            <Etiqueta tom="aviso">Gabarito preliminar</Etiqueta>
          )}
          {questao.topicos.map((t) => (
            <Etiqueta key={t.topicoId} tom={t.principal ? 'acento' : 'neutro'}>
              {t.topico}
            </Etiqueta>
          ))}
          {!questao.classificada && <Etiqueta>Sem classificação</Etiqueta>}
        </div>
      </header>

      {questao.tambemCaiuEm.length > 0 && (
        <p className="mb-4 text-sm text-suave" data-testid="tambem-caiu-em">
          Também caiu em:{' '}
          {questao.tambemCaiuEm.map((o, i) => (
            <span key={o.questaoId}>
              {i > 0 && ', '}
              <Link href={`/questoes/${o.questaoId}`} className="underline underline-offset-2">
                {rotuloBanca(o.banca)}
                {o.ano ? ` ${o.ano}` : ''} ({o.orgao})
              </Link>
            </span>
          ))}
        </p>
      )}

      {!questao.pontuavel && (
        <div className="mb-4">
          <AvisoStatus status={questao.gabaritoStatus} />
        </div>
      )}

      {plano.apoio.length > 0 && (
        <details open className="group mb-4 rounded-2xl border border-linha bg-elevada">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-suave select-none">
            Texto de apoio
            <span className="ml-1 group-open:hidden">(mostrar)</span>
          </summary>
          <div className="texto-questao border-t border-linha px-4 py-3">
            <TextoComRecortes segmentos={plano.apoio} />
          </div>
        </details>
      )}

      <div className="texto-questao mb-5">
        {plano.enunciado.length ? (
          <TextoComRecortes segmentos={plano.enunciado} />
        ) : (
          <span className="text-suave italic">Enunciado indisponível.</span>
        )}
      </div>

      {opcoes.length === 0 ? (
        <p className="rounded-2xl bg-neutro-fundo p-4 text-sm">
          Este tipo de questão ainda não pode ser respondido no app.
        </p>
      ) : (
        <fieldset disabled={respondida || enviando}>
          <legend className="sr-only">
            {ehCertoErrado ? 'Julgue o item: certo ou errado' : 'Escolha uma alternativa'}
          </legend>
          <div className={cx(ehCertoErrado ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2.5')}>
            {opcoes.map((letra) => {
              const estado = estadoOpcao(letra);
              const segmentos = plano.alternativas[letra];
              return (
                <label
                  key={letra}
                  className={cx(
                    'relative flex cursor-pointer gap-3 rounded-2xl border-2 bg-superficie p-3.5 transition-colors',
                    'has-checked:border-acento has-focus-visible:outline-3 has-focus-visible:outline-acento',
                    ehCertoErrado && 'min-h-16 items-center justify-center text-lg font-semibold',
                    !estado && 'border-linha',
                    estado === 'certa' && 'border-acerto! bg-acerto-fundo',
                    estado === 'errada' && 'border-erro! bg-erro-fundo',
                    estado === 'escolhida' && 'border-suave!',
                    respondida && 'cursor-default',
                  )}
                >
                  <input
                    type="radio"
                    name={`resposta-${questao.questaoId}`}
                    value={letra}
                    checked={escolha === letra}
                    onChange={() => setEscolha(letra)}
                    className="sr-only"
                  />
                  {ehCertoErrado ? (
                    <span>{rotuloLetra('certo_errado', letra)}</span>
                  ) : (
                    <>
                      <span
                        aria-hidden
                        className={cx(
                          'flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-bold',
                          escolha === letra
                            ? 'border-acento bg-acento text-white dark:text-fundo'
                            : 'border-linha',
                        )}
                      >
                        {letra}
                      </span>
                      <span className="sr-only">Alternativa {letra}: </span>
                      <span className="texto-questao min-w-0 flex-1 pt-0.5">
                        {segmentos?.length ? <TextoComRecortes segmentos={segmentos} /> : null}
                      </span>
                    </>
                  )}
                  {estado === 'certa' && <span className="sr-only"> (gabarito)</span>}
                  {estado === 'errada' && (
                    <span className="sr-only"> (sua resposta, incorreta)</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div aria-live="polite" className="mt-5">
        {resultado && <Resultado resultado={resultado} tipoItem={questao.tipoItem} />}
        {erro && (
          <p role="alert" className="rounded-2xl bg-erro-fundo p-3 text-sm text-erro">
            {erro}
          </p>
        )}
      </div>

      {opcoes.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-linha bg-fundo/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-2">
            {!respondida ? (
              <Botao className="flex-1" disabled={!escolha || enviando} onClick={enviar}>
                {enviando ? 'Enviando…' : 'Responder'}
              </Botao>
            ) : (
              <>
                <Botao variante="secundario" onClick={refazer}>
                  Refazer
                </Botao>
                <Link
                  href={proximaId ? `/questoes/${proximaId}` : '/'}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-acento px-5 font-semibold text-white hover:bg-acento-forte dark:text-fundo"
                >
                  {proximaId ? 'Próxima questão' : 'Voltar às questões'}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Resultado({ resultado, tipoItem }: { resultado: ResultadoResposta; tipoItem: string }) {
  if (!resultado.pontuavel) {
    const info = infoStatus(resultado.gabaritoStatus);
    return (
      <div className="rounded-2xl bg-neutro-fundo p-4" data-testid="resultado">
        <p className="font-semibold">Resposta registrada, sem pontuação.</p>
        <p className="mt-1 text-sm text-suave">
          {info?.descricao ?? 'Esta questão não conta como acerto nem erro.'}
        </p>
      </div>
    );
  }
  const gabarito = rotuloLetra(tipoItem, resultado.respostaCorreta ?? '');
  return (
    <div
      data-testid="resultado"
      className={cx('rounded-2xl p-4', resultado.correta ? 'bg-acerto-fundo' : 'bg-erro-fundo')}
    >
      <p className={cx('text-lg font-bold', resultado.correta ? 'text-acerto' : 'text-erro')}>
        {resultado.correta ? 'Você acertou!' : 'Você errou.'}
      </p>
      <p className="mt-1">
        Gabarito: <strong>{gabarito}</strong>
        {!resultado.correta && (
          <>
            {' '}
            · sua resposta: <strong>{rotuloLetra(tipoItem, resultado.resposta)}</strong>
          </>
        )}
      </p>
      {resultado.gabaritoVersao === 'preliminar' && (
        <p className="mt-2 text-sm text-aviso">
          Gabarito preliminar: pode mudar no definitivo, e sua estatística acompanha.
        </p>
      )}
    </div>
  );
}
