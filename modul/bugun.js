// Açılış ekranı: tarih + konum + hava tek satır, döşeme butonlar, bugünün görevleri, aktif şantiyeler.
import * as api from '../api.js';
import { esc, trTarih, bugunStr, kucult, bildir } from '../util.js';
import { havaAl } from '../hava.js';
import { ikon, bos } from '../ui.js';
import { konumSessiz, konumIste, konumDurumu, mesafeliProjeler, mesafeYaz, yolTarifi, tersAdres, varsayilan, konumlu } from '../konum.js';

export const TASLAK_FOTO = 'mahal.taslakFoto';
const DOSEMELER = [
  ['#/rehber?odak=1', 'Usta ara', 'tel'], ['kamera', 'Fotoğraf çek', 'kamera'], ['#/gorevler/yeni', 'Görev ekle', 'gorev'],
  ['yakin', 'Yakın şantiye', 'yakin'], ['#/odemeler', 'Ödeme', 'odeme'], ['#/rehber/yeni', 'Yeni kişi', 'kisiEkle'],
];

export default {
  id: 'bugun', baslik: 'Bugün',
  async ekran(kap, _, ctx) {
    const t = bugunStr();
    const gorevler = (await api.liste('gorevler')).filter(g => !g.tamam && g.tarih && g.tarih <= t);
    const aktif = ctx.projeler.filter(p => p.asama === 'uygulama');
    kap.innerHTML = `<section class="durum"><div><p class="soluk">${esc(ctx.kullanici?.ad || '')}</p><h2>${trTarih(t, true)}</h2></div>
      <button class="konum-satir" id="ks" type="button"><span class="soluk">${esc(varsayilan.ad)} merkez · hava yükleniyor…</span></button></section>
      <div class="dosemeler">${DOSEMELER.map(([h, ad, ik]) => h === 'kamera'
    ? `<label class="dosem">${ikon(ik, 30)}<span>${ad}</span><input type="file" accept="image/*" capture="environment" hidden id="kf"></label>`
    : h === 'yakin' ? `<button class="dosem" id="yk" type="button">${ikon(ik, 30)}<span>${ad}</span></button>`
      : `<a class="dosem" href="${h}">${ikon(ik, 30)}<span>${ad}</span></a>`).join('')}
        <a class="dosem birincil genis" href="#/gunluk/yeni">${ikon('defter', 30)}<span>Günlük yaz</span></a></div>
      <h3>Bugünün görevleri</h3><div class="tablo" id="gt">${gorevler.map(g => `<div class="rs"><button class="tikb" data-g="${esc(g.id)}" aria-label="Tamamla">${ikon('gorev', 22)}</button>
        <a class="rs-ad" href="#/gorevler/${esc(g.id)}"><b>${esc(g.baslik)}</b><span class="soluk">${esc(ctx.projeler.find(p => p.id === g.projeId)?.ad || '')} · <span class="${g.tarih < t ? 'gecmis' : ''}">${g.tarih < t ? 'gecikmiş' : 'bugün'}</span></span></a></div>`).join('') || bos('Bugün için görev yok.')}</div>
      <h3>Aktif şantiyeler</h3><div class="tablo" id="at"></div>`;

    const aktifCiz = k => {
      const l = mesafeliProjeler(aktif, k);
      kap.querySelector('#at').innerHTML = l.map(p => `<div class="rs"><a class="rs-ad" href="#/projeler/${esc(p.id)}"><b>${esc(p.ad)}</b><span class="soluk">${esc(p.sorumlu || '')}${p.mesafe != null ? ' · ' + mesafeYaz(p.mesafe) : ''}</span></a>
        <span class="rs-e"><a class="eb" href="${esc(yolTarifi(p))}" target="_blank" rel="noopener" aria-label="Yol tarifi">${ikon('yol', 22)}</a><a class="eb" href="#/gunluk/yeni?proje=${esc(p.id)}" aria-label="Günlük yaz">${ikon('defter', 22)}</a></span></div>`).join('') || bos('Uygulama aşamasında proje yok.');
    };
    aktifCiz(null);

    kap.querySelector('#gt').addEventListener('click', async e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      const g = gorevler.find(x => x.id === b.dataset.g); b.closest('.rs').classList.add('bitti');
      await api.kaydet('gorevler', { ...g, tamam: true }); setTimeout(() => ctx.yenile(), 350);
    });

    // Konum satırı: sessiz (izin zaten verilmişse) ya da dokununca.
    const ks = kap.querySelector('#ks');
    const satir = async (k) => {
      let yer = k ? 'Konumun' : `${varsayilan.ad} merkez`;
      if (k) { try { const o = JSON.parse(localStorage.getItem(`mahal.adres.${k.lat.toFixed(3)},${k.lon.toFixed(3)}`)); if (o) yer = o.metin; } catch { /* */ } }
      let hv = '';
      try { const h = await havaAl(k ? k.lat : varsayilan.lat, k ? k.lon : varsayilan.lon); hv = ` · ${h.sicaklik}°C ${h.durum.toLocaleLowerCase('tr')}`; } catch { hv = ' · hava alınamadı'; }
      const kapali = !k && konumDurumu() !== 'tamam';
      ks.innerHTML = `<span>${ikon('yakin', 18)} <b>${esc(yer)}</b>${esc(hv)}</span>${kapali ? '<span class="baglanti-k">Konumu aç</span>' : ''}`;
    };
    let k0 = await konumSessiz(); if (k0) aktifCiz(k0);
    satir(k0);
    ks.addEventListener('click', async () => {
      const k = await konumIste();
      if (!k) { bildir('Konum alınamadı veya kapalı', true); return; }
      aktifCiz(k); await satir(k);
      const a = await tersAdres(k.lat, k.lon); if (a) await satir(k);
    });

    kap.querySelector('#yk').addEventListener('click', async () => {
      const k = await konumIste();
      const p = mesafeliProjeler(ctx.projeler.filter(konumlu), k)[0];
      ctx.git(k && p ? `#/projeler/${p.id}` : '#/projeler');
    });
    kap.querySelector('#kf').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const ref = await api.fotoEkle(await kucult(f));
        const l = JSON.parse(sessionStorage.getItem(TASLAK_FOTO) || '[]'); l.push(ref); sessionStorage.setItem(TASLAK_FOTO, JSON.stringify(l));
        ctx.git('#/gunluk/yeni');
      } catch { bildir('Fotoğraf eklenemedi', true); }
    });
  },
};
