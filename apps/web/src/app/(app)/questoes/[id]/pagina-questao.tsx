'use client';

import Link from 'next/link';
import type { QuestaoDetalhe } from '@gabarita/shared';
import { ResolverQuestao } from '@/components/resolver-questao';
import { Esqueleto, MensagemErro } from '@/components/ui';
import { proximaDaSequencia } from '@/lib/sequencia';
import { useApi } from '@/lib/use-api';

export function PaginaQuestao({ id }: { id: number }) {
  const { dados, erro, carregando, recarregar } = useApi<QuestaoDetalhe>(`questoes/${id}`);

  return (
    <>
      <Link
        href="/"
        className="mb-3 inline-flex min-h-10 items-center text-sm font-semibold text-acento"
      >
        ← Questões
      </Link>
      {carregando && !dados && (
        <div className="flex flex-col gap-3">
          <Esqueleto className="h-16" />
          <Esqueleto className="h-40" />
          <Esqueleto className="h-14" />
          <Esqueleto className="h-14" />
          <Esqueleto className="h-14" />
        </div>
      )}
      {erro && <MensagemErro aoTentarDeNovo={recarregar}>{erro}</MensagemErro>}
      {/* `dados` só existe no cliente (busca via efeito), então ler sessionStorage aqui é seguro. */}
      {dados && (
        <ResolverQuestao key={dados.questaoId} questao={dados} proximaId={proximaDaSequencia(id)} />
      )}
    </>
  );
}
