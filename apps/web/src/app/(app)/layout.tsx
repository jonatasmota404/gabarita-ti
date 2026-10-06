import { NavInferior } from '@/components/nav-inferior';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main
        id="conteudo"
        className="mx-auto min-h-dvh max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28"
      >
        {children}
      </main>
      <NavInferior />
    </>
  );
}
