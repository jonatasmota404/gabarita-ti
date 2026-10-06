export default function LayoutAcesso({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-end px-5 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:justify-center"
    >
      <div className="mb-8">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#10201e]">
          <svg
            viewBox="0 0 24 24"
            className="size-8 text-[#34d399]"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 12.5 10 16.5 18 8" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Gabarita TI</h1>
        <p className="mt-2 text-suave">Questões reais de concursos de TI, uma de cada vez.</p>
      </div>
      {children}
    </main>
  );
}
