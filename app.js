// Uygulama kabuğu: giriş, üst çubuk, alt gezinme, yönlendirme.
// Yeni modül eklemek: modul/ altına dosya yaz, aşağıdaki MODULLER listesine ekle.
import * as api from './api.js';
import { logoSvg } from './logo.js';
import { esc, bildir } from './util.js';
import { ikon } from './ui.js';
import bugun from './modul/bugun.js';
import projeler from './modul/projeler.js';
import gunluk from './modul/gunluk.js';
import rehber from './modul/rehber.js';
import ornekler from './modul/ornekler.js';
import gorevler from './modul/gorevler.js';
import odemeler from './modul/odemeler.js';
import diger from './modul/diger.js';

const MODULLER = [bugun, projeler, gunluk, rehber, ornekler, gorevler, odemeler, diger];
const ALT = [['bugun', 'Bugün', 'ev'], ['projeler', 'Projeler', 'klasor'], ['gunluk', 'Günlük', 'defter'], ['rehber', 'Rehber', 'kisi'], ['diger', 'Daha', 'daha']];
const kok = document.getElementById('uygulama');
// Satır içi onerror yerine (CSP): data-hata="kaldir" | "yok" taşıyan görsel yüklenemezse
document.addEventListener('error', e => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG' || !t.dataset.hata) return;
  if (t.dataset.hata === 'yok') t.parentNode?.classList.add('yok');
  t.remove();
}, true);

function girisEkrani() {
  const yerel = api.durum().mod === 'yerel';
  kok.innerHTML = `<main class="giris">
    <div class="giris-logo">${logoSvg({ orman: '#E7E3D6', bronz: '#CDB287', boyut: 72 })}<h1>Mahal</h1><p>Yapı Stüdyosu</p></div>
    <form id="gf" autocomplete="on">
      <div class="alan"><label for="gk">Kullanıcı adı</label><input id="gk" name="username" autocomplete="username" autocapitalize="none" required value="${yerel ? 'demo' : ''}"></div>
      <div class="alan ilk" hidden><label for="gd">Davet kodu</label><input id="gd" autocapitalize="characters" autocomplete="off"></div>
      <div class="alan"><label for="gs"><span class="sifre-et">Şifre</span></label><input id="gs" type="password" autocomplete="current-password" required minlength="${yerel ? 1 : 8}"></div>
      <p class="hata-satir" id="gh" role="alert"></p>
      <button class="dugme" type="submit">Giriş yap</button>
      ${yerel ? '<p class="not">Yerel deneme modu: kullanıcı <b>demo</b>, şifre <b>demo</b>. Veriler yalnızca bu tarayıcıda durur.</p>'
      : '<button type="button" class="baglanti" id="ilk">İlk girişim, davet kodum var</button>'}
    </form></main>`;
  const f = kok.querySelector('#gf'); let ilk = false;
  kok.querySelector('#ilk')?.addEventListener('click', () => {
    ilk = !ilk; f.querySelector('.ilk').hidden = !ilk;
    f.querySelector('.sifre-et').textContent = ilk ? 'Yeni şifre (en az 8 karakter)' : 'Şifre';
    f.querySelector('#gs').autocomplete = ilk ? 'new-password' : 'current-password';
  });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const h = f.querySelector('#gh'); h.textContent = '';
    try {
      const k = f.querySelector('#gk').value, s = f.querySelector('#gs').value;
      if (ilk) await api.ilkGiris(k, f.querySelector('#gd').value, s); else await api.giris(k, s);
      basla();
    } catch (er) { h.textContent = er.message || 'Giriş yapılamadı'; }
  });
}

function kabuk() {
  kok.innerHTML = `<header class="ust"><a class="geri" id="geri" hidden aria-label="Geri">‹</a><span class="marka">${logoSvg({ orman: '#E7E3D6', bronz: '#CDB287', boyut: 26 })}</span><h1 id="baslik">Mahal</h1><span id="esit" class="esit"></span></header>
  <main id="ekran"></main>
  <nav class="alt">${ALT.map(([id, ad, ik]) => `<a href="#/${id}" data-nav="${id}">${ikon(ik)}<span>${ad}</span></a>`).join('')}</nav>`;
  if (kabuk.bagli) return guncelleDurum();
  kabuk.bagli = true;
  window.addEventListener('mahal-durum', guncelleDurum); window.addEventListener('online', guncelleDurum); window.addEventListener('offline', guncelleDurum);
  guncelleDurum();
}
function guncelleDurum() {
  {
    const n = api.bekleyen(), e = document.getElementById('esit'); if (!e) return;
    e.textContent = n ? `${n} bekliyor` : (!navigator.onLine ? 'çevrimdışı' : (api.yukleniyor() ? 'eşitleniyor…' : ''));
    e.className = 'esit' + (n || !navigator.onLine || api.yukleniyor() ? ' var' : '');
  }
}

let sira = 0;
async function yonlendir(sessiz = false) {
  const ekran = document.getElementById('ekran'); if (!ekran) return;
  const [yolu, sorguStr = ''] = (location.hash.slice(2) || 'bugun').split('?');
  const [id, ...arg] = yolu.split('/');
  const mod = MODULLER.find(m => m.id === id) || bugun;
  const bu = ++sira;
  const kayY = window.scrollY, kayE = ekran.scrollTop;
  // Ağ beklenirken ekran boş kalmasın: 150 ms içinde veri gelmezse yükleniyor göstergesi
  const yt = sessiz ? 0 : setTimeout(() => { if (bu === sira) ekran.innerHTML = '<p class="bos yukleniyor">Yükleniyor…</p>'; }, 150);
  const ctx = {
    sorgu: new URLSearchParams(sorguStr), ortaklar: api.ortaklar(), kullanici: api.durum().oturum,
    projeler: null, rehber: null,
    baslik(t, geri) {
      document.getElementById('baslik').textContent = t;
      const g = document.getElementById('geri'); g.hidden = !geri; if (geri) g.href = geri;
    },
    menu: MODULLER.filter(m => m.menu),
    git: h => { location.hash = h; }, yenile: () => yonlendir(),
  };
  // Bu ekranın ihtiyaç duyduğu tüm koleksiyonlar paralel istenir
  [ctx.projeler, ctx.rehber] = await Promise.all(['projeler', 'rehber', ...(mod.veri || [])].map(k => api.liste(k)));
  clearTimeout(yt);
  if (bu !== sira) return;
  ctx.baslik(mod.baslik); if (!sessiz) { ekran.scrollTop = 0; window.scrollTo(0, 0); }
  document.querySelectorAll('.alt a').forEach(a => a.classList.toggle('secili', a.dataset.nav === (ALT.some(x => x[0] === mod.id) ? mod.id : 'diger')));
  try { await mod.ekran(ekran, arg, ctx); } catch (e) { console.error(e); ekran.innerHTML = `<p class="bos">Bir sorun oluştu: ${esc(e.message)}</p>`; }
  if (sessiz && bu === sira) { ekran.scrollTop = kayE; window.scrollTo(0, kayY); }
}

// Arka plan yenilemesi: veri sunucudan değişmiş geldiyse açık ekranı sessizce yeniden çiz.
// Kullanıcı yazıyorsa ya da form açıksa ertele.
let bekleyenCizim = 0;
function yazilirMi() {
  const ekran = document.getElementById('ekran'); if (!ekran) return false;
  const a = document.activeElement;
  if (a && ekran.contains(a) && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return true;
  if (ekran.querySelector('form')) return true;
  return [...ekran.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),textarea')].some(x => x.value);
}
function yenidenCiz() {
  clearTimeout(bekleyenCizim); bekleyenCizim = 0;
  if (!api.durum().oturum || !document.getElementById('ekran')) return;
  if (yazilirMi()) { bekleyenCizim = setTimeout(yenidenCiz, 2000); return; }
  yonlendir(true);
}
window.addEventListener('mahal:veri', () => { clearTimeout(bekleyenCizim); bekleyenCizim = setTimeout(yenidenCiz, 50); });
window.addEventListener('hashchange', () => { clearTimeout(bekleyenCizim); bekleyenCizim = 0; });

function basla() {
  if (!api.durum().oturum) return girisEkrani();
  kabuk(); yonlendir(); api.esitle(); api.onYukle();
}
window.addEventListener('hashchange', () => api.durum().oturum && yonlendir());
window.addEventListener('mahal-durum', () => { if (!api.durum().oturum && document.getElementById('ekran')) { girisEkrani(); bildir('Oturum kapandı'); } });
basla();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
