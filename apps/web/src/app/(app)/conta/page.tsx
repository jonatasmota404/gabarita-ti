'use client';

import type { Usuario } from '@gabarita/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Botao, Cartao, Esqueleto, Titulo } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

export default function PaginaConta() {
  const { dados } = useApi<Usuario & { modoLocal?: boolean }>('sessao');
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  async function sair() {
    setSaindo(true);
    await api('sessao', { method: 'DELETE' }).catch(() => undefined);
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <>
      <Titulo>Conta</Titulo>
      <Cartao>
        {dados ? (
          <>
            <p className="font-semibold">{dados.nome ?? 'Sem nome'}</p>
            <p className="text-sm text-suave">{dados.email}</p>
          </>
        ) : (
          <Esqueleto className="h-10" />
        )}
      </Cartao>
      {dados?.modoLocal ? (
        <p className="mt-4 text-center text-sm text-suave">
          Modo local: sem login, todo o histórico fica neste usuário.
        </p>
      ) : (
        <Botao variante="secundario" className="mt-4 w-full" onClick={sair} disabled={saindo}>
          {saindo ? 'Saindo…' : 'Sair'}
        </Botao>
      )}
      <p className="mt-8 text-center text-xs text-suave">
        Questões de provas públicas de concursos. Gabaritos e classificação de assuntos são
        extraídos automaticamente e podem conter erros.
      </p>
    </>
  );
}
