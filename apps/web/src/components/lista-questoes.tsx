'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FiltrosDisponiveis, Pagina, QuestaoResumo } from '@gabarita/shared';
import { api, ErroApi } from '@/lib/api';
import { rotuloBanca, rotuloTipoItem } from '@/lib/rotulos';
import { salvarSequencia } from '@/lib/sequencia';
import { useApi } from '@/lib/use-api';
import { EtiquetaStatus } from './status-gabarito';
import { Botao, Esqueleto, Etiqueta, MensagemErro, Titulo, cx } from './ui';

const CHAVES = ['banca', 'ano', 'areaId', 'topicoId', 'tipoItem', 'semClassificacao'] as const;
type Chave = (typeof CHAVES)[number];
type Filtro = Partial<Record<Chave, string>>;
const POR_PAGINA = 20;

export function ListaQuestoes() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filtro: Filtro = Object.fromEntries(
    CHAVES.flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : [])),
  );
  const consulta = new URLSearchParams(filtro as Record<string, string>).toString();

  const filtros = useApi<FiltrosDisponiveis>('questoes/filtros');
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [painelAberto, setPainelAberto] = useState(false);
  const chave = `${consulta}|${pagina}|${versao}`;
  const [estado, setEstado] = useState<{
    chave: string | null;
    consulta: string | null;
    itens: QuestaoResumo[];
    total: number | null;
    erro: string | null;
  }>({ chave: null, consulta: null, itens: [], total: null, erro: null });

  useEffect(() => {
    let ativo = true;
    const q = new URLSearchParams(consulta);
    q.set('pagina', String(pagina));
    q.set('porPagina', String(POR_PAGINA));
    api<Pagina<QuestaoResumo>>(`questoes?${q}`)
      .then((r) => {
        if (!ativo) return;
        setEstado((anterior) => {
          // Páginas seguintes acumulam; a primeira (ou outro filtro) substitui.
          const acumula = pagina > 1 && anterior.consulta === consulta;
          const itens = acumula ? [...anterior.itens, ...r.itens] : r.itens;
          return { chave, consulta, itens, total: r.total, erro: null };
        });
      })
      .catch(
        (e: unknown) =>
          ativo &&
          setEstado((anterior) => ({
            ...anterior,
            chave,
            erro: e instanceof ErroApi ? e.message : 'Erro inesperado',
          })),
      );
    return () => {
      ativo = false;
    };
  }, [chave, consulta, pagina]);

  const carregando = estado.chave !== chave;
  // Ao trocar de filtro, não mostra a lista antiga enquanto a nova carrega.
  const itens = estado.consulta === consulta ? estado.itens : [];
  const total = estado.consulta === consulta ? estado.total : null;
  const erro = carregando ? null : estado.erro;

  useEffect(() => salvarSequencia(estado.itens.map((i) => i.questaoId)), [estado.itens]);

  function aplicar(novo: Filtro) {
    const q = new URLSearchParams();
    for (const k of CHAVES) if (novo[k]) q.set(k, novo[k]!);
    setPagina(1);
    setVersao((v) => v + 1);
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const ativos = CHAVES.filter((k) => filtro[k]).length;
  const areaSel = filtros.dados?.areas.find((a) => String(a.areaId) === filtro.areaId);
  const topicoSel =
    areaSel?.topicos.find((t) => String(t.topicoId) === filtro.topicoId) ??
    filtros.dados?.areas
      .flatMap((a) => a.topicos)
      .find((t) => String(t.topicoId) === filtro.topicoId);

  return (
    <>
      <Titulo
        sub={total === null ? 'Carregando…' : `${total} ${total === 1 ? 'questão' : 'questões'}`}
      >
        Questões
      </Titulo>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setPainelAberto(true)}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-linha bg-superficie px-4 text-sm font-semibold"
          aria-haspopup="dialog"
        >
          Filtros
          {ativos > 0 && (
            <span className="rounded-full bg-acento px-1.5 text-xs text-white dark:text-fundo">
              {ativos}
            </span>
          )}
        </button>
        {filtro.banca && (
          <Chip onRemover={() => aplicar({ ...filtro, banca: undefined })}>
            {rotuloBanca(filtro.banca)}
          </Chip>
        )}
        {filtro.ano && (
          <Chip onRemover={() => aplicar({ ...filtro, ano: undefined })}>{filtro.ano}</Chip>
        )}
        {areaSel && (
          <Chip onRemover={() => aplicar({ ...filtro, areaId: undefined, topicoId: undefined })}>
            {areaSel.area}
          </Chip>
        )}
        {topicoSel && (
          <Chip onRemover={() => aplicar({ ...filtro, topicoId: undefined })}>
            {topicoSel.topico}
          </Chip>
        )}
        {filtro.tipoItem && (
          <Chip onRemover={() => aplicar({ ...filtro, tipoItem: undefined })}>
            {rotuloTipoItem(filtro.tipoItem)}
          </Chip>
        )}
        {filtro.semClassificacao && (
          <Chip onRemover={() => aplicar({ ...filtro, semClassificacao: undefined })}>
            Sem classificação
          </Chip>
        )}
      </div>

      {erro && <MensagemErro aoTentarDeNovo={() => aplicar(filtro)}>{erro}</MensagemErro>}

      <ul className="flex flex-col gap-3">
        {itens.map((q) => (
          <li key={q.questaoId}>
            <CartaoQuestao questao={q} />
          </li>
        ))}
        {carregando &&
          Array.from({ length: itens.length ? 2 : 5 }, (_, i) => (
            <li key={`e${i}`}>
              <Esqueleto className="h-32" />
            </li>
          ))}
      </ul>

      {!carregando && !erro && itens.length === 0 && (
        <div className="mt-8 text-center text-suave">
          <p>Nenhuma questão com esses filtros.</p>
          {ativos > 0 && (
            <Botao variante="fantasma" className="mt-2" onClick={() => aplicar({})}>
              Limpar filtros
            </Botao>
          )}
        </div>
      )}

      {!carregando && total !== null && itens.length < total && (
        <Botao
          variante="secundario"
          className="mt-4 w-full"
          onClick={() => setPagina((p) => p + 1)}
        >
          Carregar mais
        </Botao>
      )}

      {painelAberto && (
        <PainelFiltros
          disponiveis={filtros.dados}
          inicial={filtro}
          aoFechar={() => setPainelAberto(false)}
          aoAplicar={(f) => {
            setPainelAberto(false);
            aplicar(f);
          }}
        />
      )}
    </>
  );
}

function Chip({ children, onRemover }: { children: React.ReactNode; onRemover: () => void }) {
  return (
    <button
      onClick={onRemover}
      className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-acento-fundo px-3.5 text-sm font-semibold text-acento-forte"
      aria-label={`Remover filtro ${typeof children === 'string' ? children : ''}`}
    >
      {children}
      <span aria-hidden>×</span>
    </button>
  );
}

export function CartaoQuestao({ questao: q }: { questao: QuestaoResumo }) {
  return (
    <Link
      href={`/questoes/${q.questaoId}`}
      className="block rounded-3xl border border-linha bg-superficie p-4 transition-colors hover:border-suave active:bg-elevada"
    >
      <p className="text-xs font-semibold tracking-wide text-suave uppercase">
        {rotuloBanca(q.banca)} · {q.orgao}
        {q.ano ? ` · ${q.ano}` : ''} · Q{q.numero}
      </p>
      <p className="mt-1.5 line-clamp-3 leading-snug">
        {q.trecho || <span className="text-suave italic">Questão com imagem</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Etiqueta>{q.tipoItem === 'certo_errado' ? 'C/E' : 'Múltipla escolha'}</Etiqueta>
        {q.topicoPrincipal ? (
          <Etiqueta tom="acento">{q.topicoPrincipal.topico}</Etiqueta>
        ) : (
          !q.classificada && <Etiqueta>Sem classificação</Etiqueta>
        )}
        <EtiquetaStatus status={q.gabaritoStatus} />
      </div>
    </Link>
  );
}

function PainelFiltros({
  disponiveis,
  inicial,
  aoFechar,
  aoAplicar,
}: {
  disponiveis?: FiltrosDisponiveis;
  inicial: Filtro;
  aoFechar: () => void;
  aoAplicar: (f: Filtro) => void;
}) {
  const [f, setF] = useState<Filtro>(inicial);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const area = disponiveis?.areas.find((a) => String(a.areaId) === f.areaId);
  const campo =
    'mt-1 block min-h-12 w-full rounded-xl border border-linha bg-elevada px-3 text-base';

  return (
    <dialog
      ref={dialogo}
      onClose={aoFechar}
      onClick={(e) => e.target === dialogo.current && aoFechar()}
      aria-labelledby="titulo-filtros"
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-3xl bg-superficie p-0 text-tinta backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          aoAplicar(f);
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id="titulo-filtros" className="text-lg font-bold">
            Filtros
          </h2>
          <button
            type="button"
            onClick={() => setF({})}
            className="text-sm font-semibold text-acento"
          >
            Limpar
          </button>
        </div>

        <label className="text-sm font-semibold">
          Banca
          <select
            className={campo}
            value={f.banca ?? ''}
            onChange={(e) => setF({ ...f, banca: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {disponiveis?.bancas.map((b) => (
              <option key={b} value={b}>
                {rotuloBanca(b)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Ano
          <select
            className={campo}
            value={f.ano ?? ''}
            onChange={(e) => setF({ ...f, ano: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {disponiveis?.anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Área
          <select
            className={campo}
            value={f.areaId ?? ''}
            onChange={(e) =>
              setF({ ...f, areaId: e.target.value || undefined, topicoId: undefined })
            }
          >
            <option value="">Todas</option>
            {disponiveis?.areas.map((a) => (
              <option key={a.areaId} value={a.areaId}>
                {a.area}
              </option>
            ))}
          </select>
        </label>

        <label className={cx('text-sm font-semibold', !area && 'opacity-50')}>
          Tópico
          <select
            className={campo}
            disabled={!area}
            value={f.topicoId ?? ''}
            onChange={(e) => setF({ ...f, topicoId: e.target.value || undefined })}
          >
            <option value="">{area ? 'Todos' : 'Escolha uma área'}</option>
            {area?.topicos.map((t) => (
              <option key={t.topicoId} value={t.topicoId}>
                {t.topico}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Tipo
          <select
            className={campo}
            value={f.tipoItem ?? ''}
            onChange={(e) => setF({ ...f, tipoItem: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            <option value="multipla_escolha">Múltipla escolha</option>
            <option value="certo_errado">Certo ou Errado</option>
          </select>
        </label>

        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-acento"
            checked={f.semClassificacao === 'true'}
            onChange={(e) =>
              setF({ ...f, semClassificacao: e.target.checked ? 'true' : undefined })
            }
          />
          Só questões ainda sem classificação de assunto
        </label>

        <div className="flex gap-2 pt-1">
          <Botao type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" className="flex-1">
            Aplicar
          </Botao>
        </div>
      </form>
    </dialog>
  );
}
