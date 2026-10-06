import { Suspense } from 'react';
import { ListaQuestoes } from '@/components/lista-questoes';

export default function PaginaQuestoes() {
  return (
    <Suspense>
      <ListaQuestoes />
    </Suspense>
  );
}
