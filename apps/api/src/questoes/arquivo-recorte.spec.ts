import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { resolverArquivoRecorte } from './arquivo-recorte.js';

describe('resolverArquivoRecorte', () => {
  let raiz: string;
  let base: string;

  beforeAll(() => {
    raiz = mkdtempSync(join(tmpdir(), 'recortes-'));
    base = join(raiz, 'recortes');
    mkdirSync(join(base, 'banca/2024'), { recursive: true });
    writeFileSync(join(base, 'banca/2024/fig.png'), 'png');
    writeFileSync(join(raiz, 'fora.png'), 'segredo');
    writeFileSync(join(base, 'nao-imagem.txt'), 'txt');
    symlinkSync(join(raiz, 'fora.png'), join(base, 'link-para-fora.png'));
  });

  it('resolve um caminho válido dentro de RECORTES_DIR', async () => {
    const r = await resolverArquivoRecorte(base, 'banca/2024/fig.png');
    expect(r).toMatchObject({ contentType: 'image/png' });
    expect(r!.caminho.endsWith(join('banca', '2024', 'fig.png'))).toBe(true);
  });

  it.each([
    '../fora.png',
    'banca/../../fora.png',
    '..\\fora.png',
    '/etc/passwd.png',
    'C:\\Windows\\x.png',
    'banca/2024/fig.png\0.png',
    'nao-imagem.txt',
    'link-para-fora.png',
    '',
  ])('rejeita %j', async (caminho) => {
    expect(await resolverArquivoRecorte(base, caminho)).toBeNull();
  });

  it('arquivo ausente vira null (o app mostra o texto sem a imagem)', async () => {
    expect(await resolverArquivoRecorte(base, 'banca/2024/sumiu.png')).toBeNull();
  });
});
