import { NextResponse, type NextRequest } from 'next/server';

// Só checa a presença do cookie para redirecionar ao login; a validação do JWT é da API.
const PUBLICAS = ['/entrar', '/cadastro', '/offline'];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (process.env.AUTH_MODE === 'local') {
    // Modo local: sem login. As telas de acesso voltam para a home.
    if (pathname === '/entrar' || pathname === '/cadastro') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  const logado = req.cookies.has('gabarita_sessao');
  const publica = PUBLICAS.includes(pathname);
  if (!logado && !publica) {
    const url = new URL('/entrar', req.url);
    if (pathname !== '/') url.searchParams.set('volta', pathname + search);
    return NextResponse.redirect(url);
  }
  if (logado && (pathname === '/entrar' || pathname === '/cadastro')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Fora: rotas de API (respondem 401 em JSON), assets e arquivos do PWA.
  matcher: [
    '/((?!api/|_next/|icons/|sw\\.js|manifest\\.webmanifest|favicon\\.ico|robots\\.txt).*)',
  ],
};
