'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

const ITENS = [
  {
    href: '/',
    rotulo: 'Questões',
    icone: 'M4 6h16M4 12h16M4 18h10',
    ativo: (p: string) => p === '/' || p.startsWith('/questoes'),
  },
  {
    href: '/desempenho',
    rotulo: 'Desempenho',
    icone: 'M5 20V10m7 10V4m7 16v-7',
    ativo: (p: string) => p.startsWith('/desempenho'),
  },
  {
    href: '/conta',
    rotulo: 'Conta',
    icone: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
    ativo: (p: string) => p.startsWith('/conta'),
  },
];

/** Navegação ao alcance do polegar. */
export function NavInferior() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {ITENS.map((item) => {
          const ativo = item.ativo(caminho);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={cx(
                  'flex h-[4.25rem] flex-col items-center justify-center gap-1 text-xs font-semibold',
                  ativo ? 'text-acento' : 'text-suave',
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icone} />
                </svg>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
