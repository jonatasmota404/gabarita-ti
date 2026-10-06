import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link href="/" className="mt-4 font-semibold text-acento">
        Voltar às questões
      </Link>
    </main>
  );
}
