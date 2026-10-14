const VERSAO = 'ae-v2';
const ARQUIVOS = ['/', '/index.html', '/style.css', '/data.js', '/app.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSAO);
    const chave = req.mode === 'navigate' ? '/index.html' : req;
    const salvo = await c.match(chave);
    const rede = fetch(req).then((r) => { if (r.ok) c.put(chave, r.clone()); return r; }).catch(() => null);
    return salvo || (await rede) || new Response('Sem conexão', { status: 503 });
  })());
});
