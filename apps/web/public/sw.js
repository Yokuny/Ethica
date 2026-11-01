// Service worker do Ethica (AD-128): guarda o app para abrir a tela de campo sem conexão.
// Navegação: rede primeiro, cópia do index.html sem rede. Arquivos com hash do build e fontes:
// cache primeiro. Mídia da vistoria (imutável, id novo a cada arquivo): cache primeiro. O resto
// (a API) passa direto; os dados offline do campo ficam no IndexedDB, não aqui.
const VERSION = 'ethica-v1';
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(ESSENCIAIS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== VERSION).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request) => {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  const doApp = url.origin === self.location.origin;
  if (
    (doApp && /^\/(assets|fonts|icons)\//.test(url.pathname)) ||
    /\/inspections\/[0-9a-f]{24}\/media\//.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
