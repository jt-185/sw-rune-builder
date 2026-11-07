// 離線快取：App 程式全部存在手機上，有網路時才在背景更新。資料檔不在這裡，放在 IndexedDB。
const CACHE = 'rune-builder-07c7ca5f8708';
const FILES = ['./', 'index.html', 'builder.js', 'builder.css', 'mobile.js', 'mobile.css',
               'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(hit => hit || fetch(e.request)));
});
