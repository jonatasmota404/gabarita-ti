import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormAcesso } from '@/components/form-acesso';

export const metadata: Metadata = { title: 'Entrar' };

export default function Entrar() {
  return (
    <Suspense>
      <FormAcesso modo="entrar" />
    </Suspense>
  );
}
