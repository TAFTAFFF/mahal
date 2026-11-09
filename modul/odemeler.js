// Ödeme/hakediş: proje başına sözleşme, alınan ödemeler, ustalara ödenenler, bakiye.
import * as api from '../api.js';
import { esc, trTarih, para, bugunStr } from '../util.js';
import { bos } from '../ui.js';
import { formEkrani } from '../crud.js';

const TURLER = [['alinan', 'Müşteriden alınan'], ['usta', 'Ustaya ödenen']];
const sema = ctx => [
  { ad: 'tur', etiket: 'Tür', tur: 'secim', secenekler: TURLER, varsayilan: 'alinan' },
  { ad: 'tutar', etiket: 'Tutar (₺)', tur: 'sayi', zorunlu: true },
  { ad: 'tarih', etiket: 'Tarih', tur: 'tarih', varsayilan: bugunStr() },
  { ad: 'ustaId', etiket: 'Usta (ustaya ödemede)', tur: 'secim', secenekler: ctx.rehber.map(r => [r.id, r.ad]) },
  { ad: 'aciklama', etiket: 'Açıklama' },
];
const SOZ = [{ ad: 'tutar', etiket: 'Sözleşme tutarı (₺)', tur: 'sayi', zorunlu: true }];

export default {
  id: 'odemeler', baslik: 'Ödemeler', menu: { ad: 'Ödeme / hakediş', acik: 'Sözleşme, tahsilat, usta ödemeleri' },
  async ekran(kap, [a], ctx) {
    const hepsi = await api.liste('odemeler');
    const pid = ctx.sorgu.get('proje') || ctx.projeler[0]?.id || '';
    if (!pid) { kap.innerHTML = bos('Önce bir proje ekleyin.'); return; }
    const geri = `#/odemeler?proje=${pid}`;
    if (a === 'sozlesme') {
      ctx.baslik('Sözleşme tutarı', geri);
      const k = hepsi.find(x => x.id === 'soz-' + pid) || {};
      return formEkrani(kap, { kol: 'odemeler', sema: SOZ, kayit: { ...k, id: 'soz-' + pid, projeId: pid, tur: 'sozlesme', tarih: bugunStr() }, ctx, geri });
    }
    if (a === 'yeni') { ctx.baslik('Ödeme ekle', geri); return formEkrani(kap, { kol: 'odemeler', sema: sema(ctx), kayit: { projeId: pid }, ctx, geri }); }
    if (a) { ctx.baslik('Ödemeyi düzenle', geri); return formEkrani(kap, { kol: 'odemeler', sema: sema(ctx), kayit: hepsi.find(x => x.id === a), ctx, geri }); }

    const o = hepsi.filter(x => x.projeId === pid), top = t => o.filter(x => x.tur === t).reduce((s, x) => s + (+x.tutar || 0), 0);
    const soz = +o.find(x => x.tur === 'sozlesme')?.tutar || 0, alinan = top('alinan'), usta = top('usta');
    const hareket = o.filter(x => x.tur !== 'sozlesme').sort((x, y) => (y.tarih || '').localeCompare(x.tarih || ''));
    kap.innerHTML = `<select class="proje-sec" id="ps">${ctx.projeler.map(p => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.ad)}</option>`).join('')}</select>
      <section class="panel ozet"><div><span>Sözleşme</span><b>${para(soz)}</b></div><div><span>Alınan</span><b>${para(alinan)}</b></div><div class="vurgu"><span>Kalan tahsilat</span><b>${para(soz - alinan)}</b></div>
      <div><span>Ustalara ödenen</span><b>${para(usta)}</b></div><div><span>Kasada kalan</span><b>${para(alinan - usta)}</b></div></section>
      <div class="sira"><a class="dugme" href="#/odemeler/yeni?proje=${esc(pid)}">Ödeme ekle</a><a class="dugme ikincil" href="#/odemeler/sozlesme?proje=${esc(pid)}">Sözleşme tutarı</a></div>
      <div class="liste">${hareket.map(h => `<a class="kart satir" href="#/odemeler/${esc(h.id)}?proje=${esc(pid)}"><span><b>${h.tur === 'alinan' ? '+' : '−'} ${para(h.tutar)}</b><br><span class="soluk">${esc(h.aciklama || (h.tur === 'usta' ? esc(ctx.rehber.find(r => r.id === h.ustaId)?.ad || 'Usta') : 'Tahsilat'))}</span></span><span class="soluk">${trTarih(h.tarih)}</span></a>`).join('') || bos('Henüz ödeme kaydı yok.')}</div>`;
    kap.querySelector('#ps').addEventListener('change', e => ctx.git(`#/odemeler?proje=${e.target.value}`));
  },
};
