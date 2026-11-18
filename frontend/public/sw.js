// Rede primeiro; se estiver offline, mostra a última versão vista (páginas e dados da API).
const CACHE = 'ecofrota-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  // PDFs e CSVs são sempre buscados na hora; só páginas e arquivos estáticos ficam disponíveis offline.
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || Response.error()))
  );
});
