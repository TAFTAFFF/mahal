// Şema ile form üretici. Yeni modül için yalnızca alan listesi (şema) yazmak yeterli.
// Alan: { ad, etiket, tur, secenekler?, zorunlu?, varsayilan? }
// Türler: metin uzun tel sayi tarih saat secim projeSec ortakSec cokluProje puan konum foto fotolar onay
import { esc, kucult, bildir } from './util.js';
import * as api from './api.js';

const girdi = (a, d, ctx) => {
  const v = d[a.ad] ?? a.varsayilan ?? '';
  const n = `name="${a.ad}"${a.zorunlu ? ' required' : ''}`;
  switch (a.tur) {
    case 'uzun': return `<textarea ${n} rows="3">${esc(v)}</textarea>`;
    case 'tel': return `<input ${n} type="tel" inputmode="tel" value="${esc(v)}" placeholder="05xx xxx xx xx">`;
    case 'sayi': return `<input ${n} type="number" inputmode="decimal" step="any" value="${esc(v)}">`;
    case 'tarih': return `<input ${n} type="date" value="${esc(v)}">`;
    case 'saat': return `<input ${n} type="time" value="${esc(v)}">`;
    case 'liste': return `<input ${n} type="text" list="dl-${a.ad}" value="${esc(v)}" autocomplete="off"><datalist id="dl-${a.ad}">${(a.secenekler || []).map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
    case 'secim': return secim(n, a.secenekler, v, true);
    case 'projeSec': return secim(n, ctx.projeler.map(p => [p.id, p.ad]), v, !a.zorunlu);
    case 'ortakSec': return secim(n, ctx.ortaklar, v, true);
    case 'cokluProje': return `<div class="onaylar" data-coklu="${a.ad}">${ctx.projeler.map(p => `<label><input type="checkbox" value="${esc(p.id)}" ${(d[a.ad] || []).includes(p.id) ? 'checked' : ''}> ${esc(p.ad)}</label>`).join('') || '<span class="soluk">Henüz proje yok</span>'}</div>`;
    case 'puan': return `<div class="puan" data-puan="${a.ad}">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-p="${i}" class="${i <= v ? 'acik' : ''}" aria-label="${i} puan">★</button>`).join('')}<input type="hidden" ${n} value="${esc(v)}"></div>`;
    case 'konum': return `<div class="konum"><input name="lat" type="number" step="any" inputmode="decimal" placeholder="Enlem" value="${esc(d.lat ?? '')}"><input name="lon" type="number" step="any" inputmode="decimal" placeholder="Boylam" value="${esc(d.lon ?? '')}"></div><button type="button" class="ikincil" data-konum>Konumumu al</button>`;
    case 'foto': case 'fotolar': {
      const refs = a.tur === 'foto' ? (v ? [v] : []) : (v || []);
      return `<div class="fotolar" data-foto="${a.ad}" data-cok="${a.tur === 'fotolar' ? 1 : 0}"><div class="kucukler">${refs.map(r => `<div class="kucuk" data-ref="${esc(r)}"><img alt=""><button type="button" data-sil aria-label="Kaldır">×</button></div>`).join('')}</div>
        <div class="sira"><label class="dugme ikincil">Kamera<input type="file" accept="image/*" capture="environment" hidden></label><label class="dugme ikincil">Galeri<input type="file" accept="image/*" ${a.tur === 'fotolar' ? 'multiple' : ''} hidden></label></div></div>`;
    }
    case 'onay': return `<label class="onay"><input type="checkbox" ${n} ${v ? 'checked' : ''}> ${esc(a.etiket)}</label>`;
    default: return `<input ${n} type="text" value="${esc(v)}">`;
  }
};
const secim = (n, ops, v, bos) => `<select ${n}>${bos ? '<option value="">Seçiniz</option>' : ''}${ops.map(o => { const [k, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;

export const formHtml = (sema, kayit = {}, ctx = {}) => sema.map(a =>
  a.tur === 'onay' ? `<div class="alan">${girdi(a, kayit, ctx)}</div>` :
    `<div class="alan"><label>${esc(a.etiket)}</label>${girdi(a, kayit, ctx)}</div>`).join('');

// Fotoğraf küçüklerini yükler, konum/puan/fotoğraf düğmelerini bağlar.
export function formBaglan(kap) {
  const kucukDoldur = el => api.fotoAl(el.dataset.ref).then(u => { el.querySelector('img').src = u; });
  kap.querySelectorAll('.kucuk').forEach(kucukDoldur);

  kap.addEventListener('click', e => {
    const t = e.target;
    if (t.matches('[data-sil]')) t.closest('.kucuk').remove();
    if (t.matches('[data-p]')) {
      const w = t.closest('.puan'), p = +t.dataset.p;
      w.querySelector('input').value = p;
      w.querySelectorAll('button').forEach(b => b.classList.toggle('acik', +b.dataset.p <= p));
    }
    if (t.matches('[data-konum]')) {
      t.textContent = 'Konum alınıyor…';
      navigator.geolocation.getCurrentPosition(
        pos => {
          kap.querySelector('[name=lat]').value = pos.coords.latitude.toFixed(5);
          kap.querySelector('[name=lon]').value = pos.coords.longitude.toFixed(5);
          t.textContent = 'Konumumu al'; kap.dispatchEvent(new Event('konum-degisti', { bubbles: true }));
        },
        () => { t.textContent = 'Konumumu al'; bildir('Konum alınamadı. Konum iznini kontrol edin.', true); },
        { enableHighAccuracy: true, timeout: 15000 });
    }
  });
  kap.addEventListener('change', async e => {
    const t = e.target;
    if (t.type !== 'file' || !t.files.length) return;
    const w = t.closest('.fotolar'), liste = w.querySelector('.kucukler');
    if (w.dataset.cok !== '1') liste.innerHTML = '';
    for (const f of t.files) {
      try {
        const ref = await api.fotoEkle(await kucult(f));
        const el = document.createElement('div'); el.className = 'kucuk'; el.dataset.ref = ref;
        el.innerHTML = '<img alt=""><button type="button" data-sil aria-label="Kaldır">×</button>';
        liste.append(el); kucukDoldur(el);
      } catch { bildir('Fotoğraf eklenemedi', true); }
    }
    t.value = '';
  });
}

export function formOku(kap, sema) {
  const o = {};
  for (const a of sema) {
    if (a.tur === 'konum') {
      for (const k of ['lat', 'lon']) { const v = kap.querySelector(`[name=${k}]`).value; o[k] = v === '' ? '' : +v; }
    } else if (a.tur === 'cokluProje') o[a.ad] = [...kap.querySelectorAll(`[data-coklu=${a.ad}] input:checked`)].map(i => i.value);
    else if (a.tur === 'foto' || a.tur === 'fotolar') {
      const r = [...kap.querySelectorAll(`[data-foto=${a.ad}] .kucuk`)].map(k => k.dataset.ref);
      o[a.ad] = a.tur === 'foto' ? (r[0] || '') : r;
    } else if (a.tur === 'onay') o[a.ad] = kap.querySelector(`[name=${a.ad}]`).checked;
    else if (a.tur === 'puan' || a.tur === 'sayi') { const v = kap.querySelector(`[name=${a.ad}]`).value; o[a.ad] = v === '' ? '' : +v; }
    else o[a.ad] = kap.querySelector(`[name=${a.ad}]`).value.trim();
  }
  return o;
}
