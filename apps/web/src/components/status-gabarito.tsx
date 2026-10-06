import { infoStatus } from '@/lib/rotulos';
import { Etiqueta, cx } from './ui';

/** Etiqueta curta para listas. Nada quando o gabarito está ok. */
export function EtiquetaStatus({ status }: { status: string }) {
  const info = infoStatus(status);
  return info ? <Etiqueta tom={info.tom}>{info.rotulo}</Etiqueta> : null;
}

const CORES = {
  neutro: 'bg-neutro-fundo text-tinta',
  aviso: 'bg-aviso-fundo text-aviso',
  perigo: 'bg-erro-fundo text-erro',
};

/** Aviso explicativo na tela da questão quando ela não é pontuável. */
export function AvisoStatus({ status }: { status: string }) {
  const info = infoStatus(status);
  if (!info) return null;
  return (
    <div className={cx('rounded-2xl px-4 py-3 text-sm', CORES[info.tom])} role="note">
      <strong className="font-semibold">{info.rotulo}.</strong> {info.descricao}
    </div>
  );
}
