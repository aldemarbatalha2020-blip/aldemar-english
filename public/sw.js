const VERSAO = 'ae-v6';
const ARQUIVOS = ['/', '/index.html', '/style.css', '/data.js', '/midia.js', '/posts.js', '/moderacao.js', '/notif.js', '/teoria.js', '/perfil.js', '/chamada.js', '/desafios.js', '/live.js', '/estudos1.js', '/estudos2.js', '/estudos3.js', '/historias.js', '/estudos.js', '/historias-ui.js', '/loja.js', '/app.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
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

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'Aldemar English', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (abertos.some((c) => c.visibilityState === 'visible')) return; // app aberto na tela: já aparece lá dentro
    await self.registration.showNotification(d.titulo || 'Aldemar English', {
      body: d.corpo || '', tag: d.tag || 'ae', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url || '' },
    });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '';
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (abertos.length) { const c = abertos[0]; await c.focus(); c.postMessage({ abrir: url }); return; }
    await self.clients.openWindow('/' + (url === '#chamada' ? '' : url));
  })());
});
