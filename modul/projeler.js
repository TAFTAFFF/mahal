// Proje kartı: liste, detay, ekle/düzenle.
import * as api from '../api.js';
import { esc, trTarih, para } from '../util.js';
import { ASAMALAR, TURLER, asamaAdi, rozet, bos, ekle, ikon } from '../ui.js';
import { konumSessiz, konumIste, mesafeliProjeler, mesafeYaz, yolTarifi, haritadaAc, konumlu, tersAdres, konumDurumu } from '../konum.js';
import { telBag } from './rehber.js';
import { telListe, bildir } from '../util.js';
import { formEkrani } from '../crud.js';

export const SEMA = [
  { ad: 'ad', etiket: 'Proje adı', zorunlu: true },
  { ad: 'musteri', etiket: 'Müşteri' },
  { ad: 'adres', etiket: 'Adres', tur: 'uzun' },
  { ad: 'konum', etiket: 'Konum', tur: 'konum' },
  { ad: 'tur', etiket: 'Tür', tur: 'secim', secenekler: TURLER },
  { ad: 'asama', etiket: 'Aşama', tur: 'secim', secenekler: ASAMALAR, varsayilan: 'kesif' },
  { ad: 'sorumlu', etiket: 'Sorumlu ortak', tur: 'ortakSec' },
  { ad: 'telefon', etiket: 'Sorumlu / müşteri telefonu (ara düğmesi için)', tur: 'tel' },
];

export default {
  id: 'projeler', baslik: 'Projeler',
  async ekran(kap, [a, b], ctx) {
    if (a === 'yeni') {
      ctx.baslik('Yeni proje', '#/projeler');
      const f = formEkrani(kap, { kol: 'projeler', sema: SEMA, ctx, geri: '#/projeler', sonra: k => `#/projeler/${k.id}` });
      konumBagla(f, true); return;
    }
    if (a && b === 'duzenle') {
      const p = ctx.projeler.find(x => x.id === a); ctx.baslik('Projeyi düzenle', `#/projeler/${a}`);
      const f = formEkrani(kap, { kol: 'projeler', sema: SEMA, kayit: p, ctx, geri: '#/projeler', sonra: k => `#/projeler/${k.id}` });
      konumBagla(f, false); return;
    }
    if (a) return detay(kap, a, ctx);
    const filtre = ctx.sorgu.get('asama') || '';
    const cizl = k => {
      const l = mesafeliProjeler(ctx.projeler.filter(p => !filtre || p.asama === filtre), k);
      kap.querySelector('#pl').innerHTML = l.map(p => { const t = telListe(p.telefon)[0];
        return `<div class="rs"><a class="rs-ad" href="#/projeler/${esc(p.id)}"><b>${esc(p.ad)}</b><span class="soluk">${esc(asamaAdi(p.asama))}${p.adres ? ' · ' + esc((p.adres.split(',').pop() || '').trim()) : ''}${p.mesafe != null ? ' · <b class="mesafe">' + mesafeYaz(p.mesafe) + '</b>' : ''}</span></a>
        <span class="rs-e">${t ? `<a class="eb" href="${telBag(t).tel}" aria-label="Ara">${ikon('tel', 22)}</a>` : ''}<a class="eb" href="${esc(yolTarifi(p))}" target="_blank" rel="noopener" aria-label="Yol tarifi">${ikon('yol', 22)}</a><a class="eb" href="#/gunluk/yeni?proje=${esc(p.id)}" aria-label="Günlük yaz">${ikon('defter', 22)}</a></span></div>`; }).join('') || bos('Henüz proje yok.');
    };
    kap.innerHTML = `<div class="cipler"><a href="#/projeler" class="${filtre ? '' : 'secili'}">Tümü</a>${ASAMALAR.map(([k, t]) => `<a href="#/projeler?asama=${k}" class="${filtre === k ? 'secili' : ''}">${t}</a>`).join('')}</div>
      <p class="soluk" id="pk"></p><div class="tablo" id="pl"></div>${ekle('#/projeler/yeni')}`;
    cizl(null);
    const k = await konumSessiz();
    if (k) cizl(k); else kap.querySelector('#pk').innerHTML = konumDurumu() === 'red' ? '' : '<button class="baglanti sol" id="kb">Mesafeleri görmek için konumu aç</button>';
    kap.querySelector('#kb')?.addEventListener('click', async () => { const k2 = await konumIste(); if (k2) { cizl(k2); kap.querySelector('#pk').textContent = ''; } });
  },
};

// Yeni projede "Konumumu kullan": izin zaten varsa kendiliğinden alır; adres satırı ters çözümden dolar (düzenlenebilir).
function konumBagla(f, yeni) {
  const btn = f.querySelector('[data-konum]'); if (!btn) return;
  btn.textContent = 'Konumumu kullan';
  const adres = f.querySelector('[name=adres]');
  const yaz = async (lat, lon) => {
    if (adres.value.trim() && adres.dataset.oto !== '1') return;
    const a = await tersAdres(lat, lon); if (!a) return;
    adres.value = [a.yol, a.mahalle, a.ilce !== a.mahalle ? a.ilce : '', 'Mersin'].filter(Boolean).join(', '); adres.dataset.oto = '1';
    adres.insertAdjacentHTML('afterend', '<small class="atif">Adres: © OpenStreetMap katkıcıları</small>');
  };
  f.addEventListener('konum-degisti', () => yaz(f.querySelector('[name=lat]').value, f.querySelector('[name=lon]').value));
  adres.addEventListener('input', () => { adres.dataset.oto = '0'; });
  if (yeni) konumSessiz().then(k => { if (k) { f.querySelector('[name=lat]').value = k.lat.toFixed(5); f.querySelector('[name=lon]').value = k.lon.toFixed(5); yaz(k.lat, k.lon); } });
}

async function detay(kap, id, ctx) {
  const p = ctx.projeler.find(x => x.id === id);
  if (!p) { kap.innerHTML = bos('Proje bulunamadı.'); return; }
  ctx.baslik('Proje', '#/projeler');
  const [gunluk, gorevler, odemeler] = await Promise.all(['gunluk', 'gorevler', 'odemeler'].map(k => api.liste(k)));
  const o = odemeler.filter(x => x.projeId === id), top = t => o.filter(x => x.tur === t).reduce((s, x) => s + (+x.tutar || 0), 0);
  const soz = o.filter(x => x.tur === 'sozlesme').at(-1)?.tutar || 0;
  const harita = konumlu(p) ? haritadaAc(p.lat, p.lon) : '';
  const js = gunluk.filter(x => x.projeId === id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const gs = gorevler.filter(x => x.projeId === id && !x.tamam);
  kap.innerHTML = `<section class="panel"><div class="kart-ust"><h2>${esc(p.ad)}</h2>${rozet(asamaAdi(p.asama), 'a-' + p.asama)}</div>
    <dl class="bilgi"><dt>Müşteri</dt><dd>${esc(p.musteri || '—')}</dd><dt>Adres</dt><dd>${esc(p.adres || '—')}</dd><dt>Tür</dt><dd>${esc(p.tur || '—')}</dd><dt>Sorumlu</dt><dd>${esc(p.sorumlu || '—')}</dd>
    <dt>Konum</dt><dd>${harita ? `<a href="${esc(harita)}" target="_blank" rel="noopener">Haritada aç</a> · <button class="baglanti sol" id="kk">${+p.lat}, ${+p.lon} (kopyala)</button>` : '—'}</dd></dl>
    <div class="sira"><a class="dugme" href="#/gunluk/yeni?proje=${esc(id)}">Günlük yaz</a><a class="dugme ikincil" href="#/projeler/${esc(id)}/duzenle">Düzenle</a></div></section>
    <section class="panel"><h3>Ödeme özeti</h3><dl class="bilgi"><dt>Sözleşme</dt><dd>${para(soz)}</dd><dt>Alınan</dt><dd>${para(top('alinan'))}</dd><dt>Kalan</dt><dd>${para(soz - top('alinan'))}</dd></dl><a href="#/odemeler?proje=${esc(id)}">Ödemelere git</a></section>
    <section class="panel"><h3>Açık görevler</h3>${gs.map(g => `<div class="satir"><span>${esc(g.baslik)}</span><span class="soluk">${trTarih(g.tarih)}</span></div>`).join('') || '<p class="soluk">Açık görev yok.</p>'}<a href="#/gorevler?proje=${esc(id)}">Görevlere git</a></section>
    <section class="panel"><h3>Şantiye günlüğü</h3>${js.slice(0, 5).map(j => `<a class="satir" href="#/gunluk/${esc(j.id)}"><span>${trTarih(j.tarih)} ${esc(j.saat)}</span><span class="soluk">${esc((j.yapilanlar || '').slice(0, 40))}</span></a>`).join('') || '<p class="soluk">Kayıt yok.</p>'}</section>`;
  kap.querySelector('#kk')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`${p.lat}, ${p.lon}`); bildir('Koordinat kopyalandı'); } catch { bildir('Kopyalanamadı', true); }
  });
}
