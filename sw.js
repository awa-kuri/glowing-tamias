// 栗鼠の帳：帳面・字体・絵を端末に保存し、二度目からは端末の中で開く
const CACHE = 'risu-cho-v5';
const CORE = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './img/squirrel_full.png', './img/squirrel_last.png', './img/squirrel_empty.png',
  './img/squirrel_carry.png', './img/squirrel_face.png',
  './img/icon.png', './img/icon-empty.png',
  './img/chestnut%20burr1.png', './img/chestnut%20burr2.png', './img/chestnut%20burrs.png',
  './img/basket.png', './img/leaf.png', './img/three%20chestnuts.png',
  './img/line1.png', './img/line2.png', './img/book.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  // 写しを作る時は、ブラウザの一時置き場を通さず必ず新しいものを取る
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = FONT_HOSTS.includes(url.hostname);
  if (url.origin !== self.location.origin && !isFont) return;

  const isImg = url.origin === self.location.origin && /\.png$/i.test(url.pathname);
  if (isFont || isImg) {
    // 字体と絵は一度取れば変わらない：端末にあればそれを使い、取りに行かない
    e.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response('', { status: 504 });
      }
    }));
    return;
  }

  // 帳面：端末の写しをすぐ出し、裏で新しいものに取り替えておく
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') {
      const idx = await cache.match('./index.html');
      if (idx) return idx;
    }
    return new Response('', { status: 504 });
  }));
});
