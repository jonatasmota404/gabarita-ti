'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi } from './api';

/**
 * Busca simples via BFF, com estado de carregamento/erro e recarga manual. "Carregando" é
 * derivado: a resposta guardada não corresponde à requisição atual (caminho + versão).
 * Mantém os dados anteriores na tela enquanto recarrega.
 */
export function useApi<T>(caminho: string | null) {
  const [versao, setVersao] = useState(0);
  const chave = caminho === null ? null : `${caminho}#${versao}`;
  const [estado, setEstado] = useState<{ chave: string | null; dados?: T; erro?: string }>({
    chave: null,
  });

  useEffect(() => {
    if (caminho === null || chave === null) return;
    let ativo = true;
    api<T>(caminho)
      .then((dados) => ativo && setEstado({ chave, dados }))
      .catch(
        (e: unknown) =>
          ativo &&
          setEstado((anterior) => ({
            chave,
            dados: anterior.dados,
            erro: e instanceof ErroApi ? e.message : 'Erro inesperado',
          })),
      );
    return () => {
      ativo = false;
    };
  }, [caminho, chave]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const carregando = chave !== null && estado.chave !== chave;
  return {
    dados: estado.dados,
    erro: carregando ? undefined : estado.erro,
    carregando,
    recarregar,
  };
}
