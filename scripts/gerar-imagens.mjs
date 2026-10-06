// Gera PNGs sem dependências: recortes de exemplo da fixture e ícones do PWA.
// Uso: node scripts/gerar-imagens.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (tipo, dados) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
};

/** pixel(x, y) => [r, g, b] ou [r, g, b, a] */
function png(largura, altura, pixel) {
  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const base = y * (largura * 4 + 1);
    for (let x = 0; x < largura; x++) {
      const [r, g, b, a = 255] = pixel(x, y);
      linhas.set([r, g, b, a], base + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(linhas)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function salvar(caminho, dados) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, dados);
}

const raiz = join(import.meta.dirname, '..');
const papel = [250, 248, 242];
const tinta = [40, 44, 52];

// Recortes: um "diagrama" de caixas e linhas, variando a cor de destaque.
const recortes = {
  'cesgranrio/2023/p10/q32_fig1.png': [21, 128, 110],
  'cebraspe/2022/p20/apoio_cb1a1.png': [180, 83, 9],
  'fgv/p31/q12_codigo.png': [79, 70, 229],
  'fgv/p31/q13_a.png': [21, 128, 110],
  'fgv/p31/q13_b.png': [190, 18, 60],
  // q13_c_inexistente.png fica de fora de propósito: o app deve tolerar arquivo ausente.
};
for (const [rel, cor] of Object.entries(recortes)) {
  const L = 480;
  const A = 220;
  salvar(
    join(raiz, 'infra/ingest-fixture/recortes', rel),
    png(L, A, (x, y) => {
      const borda = x < 3 || y < 3 || x >= L - 3 || y >= A - 3;
      const caixa1 = x > 40 && x < 180 && y > 60 && y < 160;
      const caixa2 = x > 300 && x < 440 && y > 60 && y < 160;
      const contorno =
        (caixa1 || caixa2) &&
        !((x > 44 && x < 176 && y > 64 && y < 156) || (x > 304 && x < 436 && y > 64 && y < 156));
      const linha = x >= 180 && x <= 300 && y >= 108 && y <= 112;
      if (borda || linha) return tinta;
      if (contorno) return cor;
      return papel;
    }),
  );
}

// Ícones do PWA: quadrado com cantos arredondados e um "check" de gabarito.
function icone(tam, mascaravel) {
  const fundo = [16, 32, 30];
  const acento = [52, 211, 153];
  const margem = mascaravel ? 0 : tam * 0.06;
  const raio = mascaravel ? 0 : tam * 0.22;
  return png(tam, tam, (x, y) => {
    const dentro = (() => {
      const a = margem;
      const b = tam - margem;
      if (x < a || x >= b || y < a || y >= b) return false;
      const cx = Math.min(Math.max(x, a + raio), b - raio);
      const cy = Math.min(Math.max(y, a + raio), b - raio);
      return (x - cx) ** 2 + (y - cy) ** 2 <= raio ** 2;
    })();
    if (!dentro) return [0, 0, 0, 0];
    const u = x / tam;
    const v = y / tam;
    const esp = 0.055;
    const dist = (px, py, ax, ay, bx, by) => {
      const t = Math.max(
        0,
        Math.min(
          1,
          ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2),
        ),
      );
      return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
    };
    const check =
      dist(u, v, 0.3, 0.52, 0.44, 0.66) < esp || dist(u, v, 0.44, 0.66, 0.72, 0.36) < esp;
    return check ? acento : fundo;
  });
}
const pub = join(raiz, 'apps/web/public/icons');
salvar(join(pub, 'icon-192.png'), icone(192, false));
salvar(join(pub, 'icon-512.png'), icone(512, false));
salvar(join(pub, 'icon-maskable-512.png'), icone(512, true));
salvar(join(pub, 'apple-touch-icon.png'), icone(180, true));
console.log('imagens geradas');
