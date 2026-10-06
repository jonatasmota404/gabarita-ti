import { realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const TIPOS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const dentro = (base: string, alvo: string) => {
  const rel = relative(base, alvo);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) && !rel.split(sep).includes('..');
};

/**
 * Resolve `caminho_relativo` (vindo do banco) dentro de RECORTES_DIR, com proteção contra
 * path traversal: rejeita absolutos, `..`, bytes nulos, extensões que não são imagem e
 * links simbólicos que apontem para fora do diretório. Retorna null se inválido ou ausente
 * (o app mostra o texto sem a imagem).
 */
export async function resolverArquivoRecorte(
  recortesDir: string,
  caminhoRelativo: string,
): Promise<{ caminho: string; contentType: string } | null> {
  if (!caminhoRelativo || caminhoRelativo.includes('\0')) return null;
  const normalizado = caminhoRelativo.replaceAll('\\', '/');
  if (isAbsolute(normalizado) || /^[a-zA-Z]:/.test(normalizado)) return null;
  const contentType = TIPOS[extname(normalizado).toLowerCase()];
  if (!contentType) return null;

  const base = resolve(recortesDir);
  const alvo = resolve(base, normalizado);
  if (!dentro(base, alvo)) return null;

  try {
    const [baseReal, alvoReal] = await Promise.all([realpath(base), realpath(alvo)]);
    if (!dentro(baseReal, alvoReal)) return null;
    if (!(await stat(alvoReal)).isFile()) return null;
    return { caminho: alvoReal, contentType };
  } catch {
    return null;
  }
}
