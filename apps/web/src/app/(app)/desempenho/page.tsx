import type { Metadata } from 'next';
import { TelaDesempenho } from '@/components/painel-desempenho';

export const metadata: Metadata = { title: 'Desempenho' };

export default function PaginaDesempenho() {
  return <TelaDesempenho />;
}
