'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Desempenho, HistoricoItem, Pagina, Placar } from '@gabarita/shared';
import { formatarTaxa, rotuloBanca, rotuloLetra } from '@/lib/rotulos';
import { useApi } from '@/lib/use-api';
import { EtiquetaStatus } from './status-gabarito';
import { Botao, Cartao, Esqueleto, Etiqueta, MensagemErro, Titulo, cx } from './ui';

function Barra({ placar, rotulo }: { placar: Placar; rotulo: string }) {
  const total = placar.acertos + placar.erros;
  const pct = placar.taxaAcerto === null ? 0 : Math.round(placar.taxaAcerto * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">{rotulo}</span>
        <span className="shrink-0 font-mono text-suave">
          <strong className="text-tinta">{formatarTaxa(placar.taxaAcerto)}</strong> ·{' '}
          {placar.acertos}/{total}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-erro-fundo"
        role="meter"
        aria-label={`Taxa de acerto em ${rotulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-acerto" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PainelDesempenho({ desempenho: d }: { desempenho: Desempenho }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const pontuadas = d.geral.acertos + d.geral.erros;
  return (
    <div className="flex flex-col gap-4">
      <Cartao className="flex items-center gap-5">
        <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-acento-fundo">
          <span className="font-mono text-2xl font-bold" data-testid="taxa-geral">
            {formatarTaxa(d.geral.taxaAcerto)}
          </span>
        </div>
        <div className="text-sm">
          <p className="text-base font-semibold">Taxa de acerto geral</p>
          <p className="mt-1 text-suave">
            <span className="font-semibold text-acerto">{d.geral.acertos} acertos</span> ·{' '}
            <span className="font-semibold text-erro">{d.geral.erros} erros</span> em {pontuadas}{' '}
            {pontuadas === 1 ? 'resposta pontuada' : 'respostas pontuadas'}
          </p>
          <p className="mt-0.5 text-xs text-suave" data-testid="conteudos-respondidos">
            {d.geral.conteudosRespondidos}{' '}
            {d.geral.conteudosRespondidos === 1 ? 'questão distinta' : 'questões distintas'}{' '}
            (repetidas em outras provas contam uma vez)
          </p>
        </div>
      </Cartao>

      {(d.geral.naoPontuadas > 0 || d.geral.deQuestoesRemovidas > 0) && (
        <p className="rounded-2xl bg-neutro-fundo px-4 py-3 text-sm text-suave">
          Fora da conta:
          {d.geral.naoPontuadas > 0 && (
            <> {d.geral.naoPontuadas} em questões anuladas ou sem gabarito</>
          )}
          {d.geral.naoPontuadas > 0 && d.geral.deQuestoesRemovidas > 0 && ' e'}
          {d.geral.deQuestoesRemovidas > 0 && (
            <> {d.geral.deQuestoesRemovidas} em questões removidas do banco</>
          )}
          .
        </p>
      )}

      {d.porArea.length > 0 && (
        <Cartao>
          <h2 className="mb-3 font-semibold">Por área</h2>
          <ul className="flex flex-col gap-4">
            {d.porArea.map((a) => (
              <li key={a.areaId}>
                <button
                  className="block w-full text-left"
                  aria-expanded={aberta === a.areaId}
                  onClick={() => setAberta(aberta === a.areaId ? null : a.areaId)}
                >
                  <Barra placar={a} rotulo={a.area} />
                </button>
                {aberta === a.areaId && (
                  <ul className="mt-3 flex flex-col gap-3 border-l-2 border-linha pl-3">
                    {a.topicos.map((t) => (
                      <li key={t.topicoId}>
                        <Barra placar={t} rotulo={t.topico} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {d.semClassificacao.acertos + d.semClassificacao.erros > 0 && (
        <Cartao>
          <Barra placar={d.semClassificacao} rotulo="Questões ainda sem classificação" />
        </Cartao>
      )}
    </div>
  );
}

export function TelaDesempenho() {
  const desempenho = useApi<Desempenho>('desempenho');
  const [pagina, setPagina] = useState(1);
  const historico = useApi<Pagina<HistoricoItem>>(`historico?pagina=${pagina}&porPagina=15`);

  return (
    <>
      <Titulo sub="Recalculado com o gabarito vigente de cada questão.">Desempenho</Titulo>
      {desempenho.erro && (
        <MensagemErro aoTentarDeNovo={desempenho.recarregar}>{desempenho.erro}</MensagemErro>
      )}
      {desempenho.carregando && !desempenho.dados && <Esqueleto className="h-40" />}
      {desempenho.dados &&
        (desempenho.dados.geral.respondidas === 0 ? (
          <Cartao className="text-center">
            <p className="font-semibold">Você ainda não respondeu nenhuma questão.</p>
            <Link href="/" className="mt-2 inline-block font-semibold text-acento">
              Começar agora →
            </Link>
          </Cartao>
        ) : (
          <PainelDesempenho desempenho={desempenho.dados} />
        ))}

      <h2 className="mt-8 mb-3 text-lg font-bold">Histórico</h2>
      {historico.erro && (
        <MensagemErro aoTentarDeNovo={historico.recarregar}>{historico.erro}</MensagemErro>
      )}
      {historico.dados && <ListaHistorico itens={historico.dados.itens} />}
      {historico.carregando && <Esqueleto className="h-20" />}
      {historico.dados && historico.dados.total > historico.dados.porPagina && (
        <div className="mt-3 flex items-center justify-between">
          <Botao
            variante="secundario"
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anteriores
          </Botao>
          <span className="text-sm text-suave">
            {pagina} / {Math.ceil(historico.dados.total / historico.dados.porPagina)}
          </span>
          <Botao
            variante="secundario"
            disabled={pagina * historico.dados.porPagina >= historico.dados.total}
            onClick={() => setPagina((p) => p + 1)}
          >
            Seguintes
          </Botao>
        </div>
      )}
    </>
  );
}

const dataCurta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function ListaHistorico({ itens }: { itens: HistoricoItem[] }) {
  if (!itens.length) return <p className="text-sm text-suave">Nada por aqui ainda.</p>;
  return (
    <ul className="flex flex-col divide-y divide-linha rounded-3xl border border-linha bg-superficie">
      {itens.map((h) => {
        const conteudo = (
          <>
            <span
              aria-hidden
              className={cx(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold',
                h.correta === true && 'bg-acerto-fundo text-acerto',
                h.correta === false && 'bg-erro-fundo text-erro',
                h.correta === null && 'bg-neutro-fundo text-suave',
              )}
            >
              {h.questao ? rotuloLetra(h.questao.tipoItem, h.resposta).charAt(0) : h.resposta}
            </span>
            <span className="min-w-0 flex-1">
              {h.questao ? (
                <>
                  <span className="block text-xs text-suave">
                    {rotuloBanca(h.questao.banca)} · {h.questao.orgao}
                    {h.questao.ano ? ` · ${h.questao.ano}` : ''} · Q{h.questao.numero}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm">{h.questao.trecho}</span>
                </>
              ) : (
                <span className="block text-sm text-suave italic">
                  Questão removida do banco (ex.: prova reprocessada)
                </span>
              )}
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-suave">
                {h.correta === true && <Etiqueta tom="acerto">Acerto</Etiqueta>}
                {h.correta === false && <Etiqueta tom="erro">Erro</Etiqueta>}
                {h.removida && <Etiqueta>Removida</Etiqueta>}
                {h.gabaritoStatus && <EtiquetaStatus status={h.gabaritoStatus} />}
                {dataCurta.format(new Date(h.respondidaEm))}
              </span>
            </span>
          </>
        );
        return (
          <li key={h.respostaId}>
            {h.removida ? (
              <div className="flex gap-3 p-3.5">{conteudo}</div>
            ) : (
              <Link href={`/questoes/${h.questaoId}`} className="flex gap-3 p-3.5 hover:bg-elevada">
                {conteudo}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
