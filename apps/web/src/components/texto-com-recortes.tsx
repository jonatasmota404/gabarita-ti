import type { Segmento } from '@/lib/marcadores';
import { ImagemRecorte } from './imagem-recorte';

export function TextoComRecortes({ segmentos }: { segmentos: Segmento[] }) {
  return (
    <>
      {segmentos.map((s, i) => {
        if (s.tipo === 'texto') return <span key={i}>{s.texto}</span>;
        if (s.tipo === 'recorte')
          return <ImagemRecorte key={`r${s.recorte.recorteId}`} recorte={s.recorte} />;
        return (
          <span key={i} className="mx-0.5 rounded bg-neutro-fundo px-1.5 text-sm text-suave">
            {s.rotulo}
          </span>
        );
      })}
    </>
  );
}
