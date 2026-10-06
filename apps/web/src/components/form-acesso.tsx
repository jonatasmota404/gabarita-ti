'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, ErroApi } from '@/lib/api';
import { Botao } from './ui';

/** Só caminhos internos (evita open redirect via ?volta=). */
export function destinoSeguro(volta: string | null) {
  return volta && volta.startsWith('/') && !volta.startsWith('//') && !volta.startsWith('/\\')
    ? volta
    : '/';
}

export function FormAcesso({ modo }: { modo: 'entrar' | 'cadastro' }) {
  const params = useSearchParams();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cadastro = modo === 'cadastro';

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setEnviando(true);
    setErro(null);
    try {
      await api('sessao', { method: 'POST', body: JSON.stringify({ modo, ...dados }) });
      router.replace(destinoSeguro(params.get('volta')));
      router.refresh();
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível continuar.');
      setEnviando(false);
    }
  }

  const campo =
    'mt-1 block min-h-12 w-full rounded-xl border border-linha bg-elevada px-3.5 text-base placeholder:text-suave/70';

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate={false}>
      {cadastro && (
        <label className="text-sm font-semibold">
          Nome <span className="font-normal text-suave">(opcional)</span>
          <input name="nome" autoComplete="name" maxLength={80} className={campo} />
        </label>
      )}
      <label className="text-sm font-semibold">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          className={campo}
        />
      </label>
      <label className="text-sm font-semibold">
        Senha
        <input
          name="senha"
          type="password"
          required
          minLength={cadastro ? 8 : 1}
          maxLength={128}
          autoComplete={cadastro ? 'new-password' : 'current-password'}
          className={campo}
          aria-describedby={cadastro ? 'dica-senha' : undefined}
        />
        {cadastro && (
          <span id="dica-senha" className="mt-1 block text-xs font-normal text-suave">
            Pelo menos 8 caracteres.
          </span>
        )}
      </label>
      {erro && (
        <p role="alert" className="rounded-xl bg-erro-fundo p-3 text-sm text-erro">
          {erro}
        </p>
      )}
      <Botao type="submit" disabled={enviando} className="mt-2">
        {enviando ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
      </Botao>
      <p className="text-center text-sm text-suave">
        {cadastro ? 'Já tem conta? ' : 'Ainda não tem conta? '}
        <Link
          href={cadastro ? '/entrar' : '/cadastro'}
          className="font-semibold text-acento underline-offset-2 hover:underline"
        >
          {cadastro ? 'Entrar' : 'Criar conta'}
        </Link>
      </p>
    </form>
  );
}
