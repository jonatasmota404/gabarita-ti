import { notFound } from 'next/navigation';
import { PaginaQuestao } from './pagina-questao';

export default async function Questao({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PaginaQuestao id={id} />;
}
