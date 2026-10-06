import type { ComponentProps, ReactNode } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type Variante = 'primario' | 'secundario' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-acento text-white dark:text-fundo hover:bg-acento-forte disabled:opacity-40 shadow-sm',
  secundario: 'bg-superficie text-tinta border border-linha hover:border-suave disabled:opacity-50',
  fantasma: 'text-acento hover:bg-acento-fundo disabled:opacity-50',
};

export function Botao({
  variante = 'primario',
  className,
  ...props
}: ComponentProps<'button'> & { variante?: Variante }) {
  return (
    <button
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed',
        VARIANTES[variante],
        className,
      )}
      {...props}
    />
  );
}

export function Cartao({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cx('rounded-3xl border border-linha bg-superficie p-4 sm:p-5', className)}
      {...props}
    />
  );
}

type Tom = 'neutro' | 'aviso' | 'perigo' | 'acento' | 'acerto' | 'erro';
const TONS: Record<Tom, string> = {
  neutro: 'bg-neutro-fundo text-suave',
  aviso: 'bg-aviso-fundo text-aviso',
  perigo: 'bg-erro-fundo text-erro',
  acento: 'bg-acento-fundo text-acento-forte',
  acerto: 'bg-acerto-fundo text-acerto',
  erro: 'bg-erro-fundo text-erro',
};

export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONS[tom],
      )}
    >
      {children}
    </span>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-2xl bg-neutro-fundo', className)} />;
}

export function MensagemErro({
  children,
  aoTentarDeNovo,
}: {
  children: ReactNode;
  aoTentarDeNovo?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl bg-erro-fundo p-4 text-erro">
      <p>{children}</p>
      {aoTentarDeNovo && (
        <button className="mt-2 font-semibold underline" onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-suave">{sub}</p>}
    </header>
  );
}
