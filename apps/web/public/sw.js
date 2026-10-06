// Service worker simples do Gabarita TI.
// - Assets estáticos (_next/static, ícones): cache-first (são versionados por hash).
// - Navegação: network-first, com cópia em cache e página /offline como último recurso.
// - /api/*: nunca em cache (dados do usuário e respostas precisam ser frescos).
const VERSAO = 'gabarita-v1';
const ESTATICO = `${VERSAO}-estatico`;
const PAGINAS = `${VERSAO}-paginas`;
const PRECACHE = ['/offline', '/icons/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ESTATICO)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(ESTATICO).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copia = res.clone();
            caches.open(PAGINAS).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then((salvo) => salvo || caches.match('/offline'))),
    );
  }
});
