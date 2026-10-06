'use client';

import { useState } from 'react';
import type { Recorte } from '@gabarita/shared';
import { urlRecorte } from '@/lib/api';

const NOMES: Record<string, string> = {
  figura: 'Figura',
  tabela: 'Tabela',
  codigo: 'Código',
  formula: 'Fórmula',
};

/** Imagem de um recorte. Se o arquivo não existir, mostra um aviso e segue o texto. */
export function ImagemRecorte({ recorte }: { recorte: Recorte }) {
  const [falhou, setFalhou] = useState(false);
  const nome = NOMES[recorte.tipo] ?? 'Imagem';
  if (falhou) {
    return (
      <span className="my-2 block rounded-xl border border-dashed border-linha px-3 py-2 text-sm text-suave">
        {nome} indisponível (página {recorte.pagina} da prova)
      </span>
    );
  }
  return (
    <span className="my-3 block overflow-x-auto rounded-xl border border-linha bg-white p-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem autenticada via BFF */}
      <img
        src={urlRecorte(recorte.url)}
        alt={`${nome} da questão (página ${recorte.pagina} da prova)`}
        loading="lazy"
        decoding="async"
        className="mx-auto h-auto max-w-full"
        onError={() => setFalhou(true)}
      />
    </span>
  );
}
