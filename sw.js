// Kabuk önbelleği. Uygulama dosyaları değişince SURUM'u artırın.
const SURUM = 'mahal-v4';
const KABUK = ['./', 'index.html', 'style.css', 'app.js', 'api.js', 'config.js', 'crud.js', 'demo-veri.js', 'form.js', 'hava.js', 'konum.js', 'logo.js', 'pdf.js', 'ui.js', 'util.js',
  'modul/bugun.js', 'modul/diger.js', 'modul/gorevler.js', 'modul/gunluk.js', 'modul/odemeler.js', 'modul/ornekler.js', 'modul/projeler.js', 'modul/rehber.js',
  'lib/jspdf.umd.min.js', 'lib/Roboto_400Regular.ttf', 'lib/Roboto_700Bold.ttf',
  'manifest.webmanifest', 'ikon/ikon-192.png', 'ikon/ikon-512.png', 'ikon/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SURUM).then(c => c.addAll(KABUK)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== SURUM).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    // önce ağ (güncel kalsın), olmazsa önbellek
    e.respondWith(fetch(r).then(y => { if (y.ok) { const k = y.clone(); caches.open(SURUM).then(c => c.put(r, k)); } return y; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(y => y || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  }
});
