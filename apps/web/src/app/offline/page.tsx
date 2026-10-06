import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sem conexão' };

export default function Offline() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-2xl font-bold">Sem conexão</h1>
      <p className="mt-2 text-suave">
        Você está offline. Assim que a internet voltar, é só recarregar para continuar resolvendo
        questões.
      </p>
    </main>
  );
}
