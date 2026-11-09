// Şantiye günlüğü: otomatik tarih/saat/hava, fotoğraf, PDF ve paylaşım.
import * as api from '../api.js';
import { esc, trTarih, bugunStr, saatStr, bildir } from '../util.js';
import { konumSessiz, konumDurumu, konumIste, mesafeliProjeler, mesafeYaz, yakinProje, tersAdres, konumlu, varsayilan, haritadaAc, sayiMi } from '../konum.js';
import { TASLAK_FOTO } from './bugun.js';
import { havaAl, havaMetni } from '../hava.js';
import { bos, ekle, projeAdi, ikon } from '../ui.js';
import { formEkrani } from '../crud.js';

const SEMA = [
  { ad: 'projeId', etiket: 'Proje', tur: 'projeSec', zorunlu: true },
  { ad: 'yapilanlar', etiket: 'Yapılanlar', tur: 'uzun' },
  { ad: 'calisanlar', etiket: 'Çalışanlar', tur: 'uzun' },
  { ad: 'yarin', etiket: 'Yarın', tur: 'uzun' },
  { ad: 'notlar', etiket: 'Notlar', tur: 'uzun' },
  { ad: 'fotolar', etiket: 'Fotoğraflar', tur: 'fotolar' },
];
const NOT_CIPLERI = ['Kalıp', 'Beton', 'Peyzaj dikim', 'Malzeme geldi', 'Ekip: N kişi'];
const PANEL = `<div class="alan konum-panel"><label>Zaman, konum ve hava (otomatik)</label><div class="otomatik"><span id="zt"></span><span id="zk" class="soluk"></span><span id="zh" class="soluk"></span></div>
  <div class="sira" id="ke"></div><small class="atif">Adres: © OpenStreetMap katkıcıları · hava: Open-Meteo</small></div>`;

export default {
  veri: ['gunluk'], id: 'gunluk', baslik: 'Şantiye günlüğü',
  async ekran(kap, [a, b], ctx) {
    const liste = await api.liste('gunluk');
    if (a === 'yeni' || (a && b === 'duzenle')) return form(kap, a === 'yeni' ? null : liste.find(x => x.id === a), ctx);
    if (a) return detay(kap, liste.find(x => x.id === a), ctx);
    const pr = ctx.sorgu.get('proje') || '';
    const l = liste.filter(g => !pr || g.projeId === pr).sort((x, y) => (y.tarih + y.saat).localeCompare(x.tarih + x.saat));
    kap.innerHTML = `<div class="liste">${l.map(g => `<a class="kart" href="#/gunluk/${esc(g.id)}"><div class="kart-ust"><b>${esc(projeAdi(ctx, g.projeId))}</b><span class="soluk">${trTarih(g.tarih)} ${esc(g.saat)}</span></div>
      <div class="soluk">${esc((g.yapilanlar || '').slice(0, 90))}</div></a>`).join('') || bos('Henüz günlük kaydı yok.')}</div>${ekle('#/gunluk/yeni')}`;
  },
};

async function form(kap, mevcut, ctx) {
  ctx.baslik(mevcut ? 'Günlüğü düzenle' : 'Yeni günlük', mevcut ? `#/gunluk/${mevcut.id}` : '#/gunluk');
  const simdi = new Date();
  let taslak = [];
  if (!mevcut) { try { taslak = JSON.parse(sessionStorage.getItem(TASLAK_FOTO) || '[]'); sessionStorage.removeItem(TASLAK_FOTO); } catch { /* */ } }
  const kayit = mevcut || { tarih: bugunStr(simdi), saat: saatStr(simdi), projeId: ctx.sorgu.get('proje') || '', yazan: ctx.kullanici?.ad, hava: null, fotolar: taslak };
  const f = formEkrani(kap, { kol: 'gunluk', sema: SEMA, kayit, ctx, geri: '#/gunluk', sonra: k => `#/gunluk/${k.id}` });
  f.insertAdjacentHTML('afterbegin', PANEL);
  const zt = f.querySelector('#zt'), zk = f.querySelector('#zk'), zh = f.querySelector('#zh'), ke = f.querySelector('#ke'), sec = f.querySelector('[name=projeId]');
  const goster = () => { zt.textContent = `${trTarih(kayit.tarih, true)} · ${kayit.saat}`; zh.textContent = havaMetni(kayit.hava); };
  const eylem = (metin, fn, ikincil = true) => { ke.innerHTML = `<button type="button" class="${ikincil ? 'ikincil' : 'dugme'}">${metin}</button>`; ke.firstChild.onclick = fn; };

  // Hızlı not çipleri
  f.querySelector('[name=yapilanlar]').insertAdjacentHTML('afterend', `<div class="cipler cip-not">${NOT_CIPLERI.map(c => `<button type="button" class="cip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);
  f.querySelector('.cip-not').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    let c = b.dataset.c;
    if (c.startsWith('Ekip')) { const n = prompt('Kaç kişi?', '3'); if (!n) return; c = `Ekip: ${n} kişi`; }
    const t = f.querySelector('[name=yapilanlar]'); t.value = (t.value.trim() ? t.value.trim() + '\n' : '') + c; t.focus();
  });

  const sirala = konum => {  // proje listesini mesafeye göre sırala, 300 m içindekini seç
    const l = mesafeliProjeler(ctx.projeler, konum), onceki = sec.value;
    sec.innerHTML = '<option value="">Seçiniz</option>' + l.map(p => `<option value="${esc(p.id)}">${esc(p.ad)}${p.mesafe != null ? ' · ' + mesafeYaz(p.mesafe) : ''}</option>`).join('');
    sec.value = onceki;
    const y = yakinProje(ctx.projeler, konum);
    if (y && !onceki && !mevcut) { sec.value = y.id; return `${y.ad} · ${mesafeYaz(y.mesafe)}`; }
    return '';
  };
  const havaIcin = async konum => {
    const p = ctx.projeler.find(x => x.id === sec.value);
    const k = konum || (p && konumlu(p) ? p : varsayilan);
    zh.textContent = 'Hava alınıyor…';
    try { kayit.hava = await havaAl(k.lat, k.lon); } catch { bildir('Hava alınamadı (çevrimdışı olabilir)', true); }
    goster();
  };
  let konum = null;
  const konumIsle = async k => {
    konum = k; kayit.lat = +k.lat.toFixed(5); kayit.lon = +k.lon.toFixed(5);
    const oner = sirala(k);
    zk.textContent = oner ? `Yakın proje: ${oner}` : `Konum alındı (±${Math.round(k.dogruluk || 0)} m)`;
    eylem('Havayı yenile', () => havaIcin(konum));
    await havaIcin(k);
    const a = await tersAdres(k.lat, k.lon);   // günlük açılışı = kullanıcı eylemi; tek istek, önbellekli
    if (a) { kayit.adresMetni = a.metin; zk.textContent = `${oner ? 'Yakın proje: ' + oner + ' · ' : ''}${a.metin}`; }
  };
  const elle = () => { zk.textContent = konumDurumu() === 'red' ? 'Konum kapalı · projeyi elle seç' : 'Konum alınmadı'; eylem(konumDurumu() === 'red' ? 'Konumu yeniden dene' : 'Konumu kullan', async () => { zk.textContent = 'Konum alınıyor…'; const k = await konumIste(); if (k) konumIsle(k); else elle(); }, false); havaIcin(null); };

  goster();
  if (mevcut) { zk.textContent = mevcut.adresMetni || ''; eylem('Havayı yenile', () => havaIcin(null)); }
  else {
    zk.textContent = 'Konum alınıyor…';
    konumSessiz().then(k => k ? konumIsle(k) : elle());
  }
  sec.addEventListener('change', () => { if (!konum) havaIcin(null); });
}

async function detay(kap, g, ctx) {
  if (!g) { kap.innerHTML = bos('Kayıt bulunamadı.'); return; }
  ctx.baslik('Günlük', '#/gunluk');
  const p = ctx.projeler.find(x => x.id === g.projeId);
  const alan = (t, m) => m ? `<h3>${t}</h3><p class="metin">${esc(m)}</p>` : '';
  kap.innerHTML = `<section class="panel"><h2>${esc(p?.ad || '—')}</h2><p class="soluk">${trTarih(g.tarih, true)} · ${esc(g.saat)}<br>${esc(havaMetni(g.hava))}${sayiMi(g.lat) && sayiMi(g.lon) ? `<br>${esc(g.adresMetni || 'Konum')} · <a href="${esc(haritadaAc(g.lat, g.lon))}" target="_blank" rel="noopener">${+g.lat}, ${+g.lon}</a>` : ''}${g.yazan ? '<br>' + esc(g.yazan) : ''}</p>
    ${alan('Yapılanlar', g.yapilanlar)}${alan('Çalışanlar', g.calisanlar)}${alan('Yarın', g.yarin)}${alan('Notlar', g.notlar)}
    <div class="kucukler buyuk" id="fl">${(g.fotolar || []).map(r => `<div class="kucuk" data-ref="${esc(r)}"><img alt="Fotoğraf"></div>`).join('')}</div>
    <div class="sira"><button class="dugme" id="pdf">${ikon('pdf', 18)} PDF yap</button><a class="dugme ikincil" href="#/gunluk/${esc(g.id)}/duzenle">Düzenle</a></div>
    <div id="sonuc"></div></section>`;
  kap.querySelectorAll('.kucuk').forEach(k => api.fotoAl(k.dataset.ref).then(u => { k.querySelector('img').src = u; }));
  kap.querySelector('#pdf').addEventListener('click', async e => {
    const d = e.currentTarget; d.disabled = true; d.textContent = 'PDF hazırlanıyor…';
    try {
      const pdf = await import('../pdf.js');
      const blob = await pdf.gunlukPdf(g, p), ad = pdf.pdfAdi(g, p);
      const ozet = `Mahal şantiye günlüğü: ${p?.ad || ''} (${trTarih(g.tarih)})`;
      kap.querySelector('#sonuc').innerHTML = `<div class="sonuc"><p>PDF hazır: ${esc(ad)}</p><div class="sira">
        <button class="dugme" id="pa">${ikon('paylas', 18)} Paylaş</button><button class="dugme ikincil" id="in">İndir</button></div>
        <div class="sira"><a class="dugme ikincil" target="_blank" rel="noopener" href="${pdf.waBag(ozet + ' (PDF dosyasını ekleyin)')}">WhatsApp</a><a class="dugme ikincil" href="${pdf.postaBag(ozet, ozet + '\n\nPDF dosyası ektedir.')}">E-posta</a></div></div>`;
      kap.querySelector('#in').onclick = () => pdf.indir(blob, ad);
      kap.querySelector('#pa').onclick = async () => {
        try { if (!(await pdf.paylas(blob, ad, ozet))) bildir('Paylaşım desteklenmiyor; PDF indirildi. WhatsApp veya e-postaya ekleyin.'); }
        catch (er) { if (er.name !== 'AbortError') bildir('Paylaşılamadı', true); }
      };
    } catch (er) { bildir(er.message, true); }
    d.disabled = false; d.innerHTML = `${ikon('pdf', 18)} PDF yap`;
  });
}
