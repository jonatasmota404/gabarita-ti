import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormAcesso } from '@/components/form-acesso';

export const metadata: Metadata = { title: 'Criar conta' };

export default function Cadastro() {
  return (
    <Suspense>
      <FormAcesso modo="cadastro" />
    </Suspense>
  );
}
