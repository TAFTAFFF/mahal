// Örnek kütüphanesi: Mersin'den gerçek örnekler (kategori, tedarikçi, kaynak bağlantısı).
// Başkasının fotoğrafı depoya indirilmez; yalnız dış URL olarak gösterilir ve "İç referans" etiketi taşır.
import * as api from '../api.js';
import { esc, bildir, para, guvenliUrl } from '../util.js';
import { bos, ekle, ikon } from '../ui.js';
import { formEkrani } from '../crud.js';

export const KATEGORILER = ['Pergola/gölgelik', 'Saksı/bitki kabı', 'Dış aydınlatma', 'Zemin (taş/deck/çakıl)', 'Korkuluk/ferforje', 'Bitki (Akdeniz)', 'Sulama', 'Su ögesi/havuz', 'Dış mekân mobilyası', 'Kapı/çit/duvar'];
const SEMA = [
  { ad: 'baslik', etiket: 'Başlık', zorunlu: true },
  { ad: 'kategori', etiket: 'Kategori', tur: 'secim', secenekler: KATEGORILER },
  { ad: 'aciklama', etiket: 'Açıklama', tur: 'uzun' },
  { ad: 'malzeme', etiket: 'Malzeme' },
  { ad: 'tedarikciAd', etiket: 'Mersin tedarikçisi' },
  { ad: 'foto', etiket: 'Kendi fotoğrafımız (Mahal etiketiyle paylaşılabilir)', tur: 'foto' },
  { ad: 'kaynakUrl', etiket: 'Kaynak bağlantısı' },
];
const kat = k => k.kategori && KATEGORILER.includes(k.kategori) ? k.kategori : 'Genel';
const alanAdi = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function hepsi() {
  const kendi = await api.liste('ornekler');
  const tohum = api.YEREL ? (await api.yerelDosya('ornekler.json')) || [] : [];
  const ids = new Set(kendi.map(k => k.id));
  return [...kendi, ...tohum.filter(k => !ids.has(k.id))];
}

export default {
  id: 'ornekler', baslik: 'Örnekler', menu: { ad: 'Örnek kütüphanesi', acik: 'Mersin\'den gerçek örnekler' },
  async ekran(kap, [a, b], ctx) {
    const l = await hepsi();
    if (a === 'yeni') { ctx.baslik('Yeni örnek', '#/ornekler'); return formEkrani(kap, { kol: 'ornekler', sema: SEMA, ctx, geri: '#/ornekler' }); }
    if (a && b === 'duzenle') { ctx.baslik('Örneği düzenle', `#/ornekler/${a}`); return formEkrani(kap, { kol: 'ornekler', sema: SEMA, kayit: l.find(x => x.id === a), ctx, geri: '#/ornekler', sonra: k => `#/ornekler/${k.id}` }); }
    if (a) return detay(kap, l.find(x => x.id === a), ctx);
    const sec = ctx.sorgu.get('kat') || '';
    const var_ = [...KATEGORILER, 'Genel'].filter(c => l.some(k => kat(k) === c));
    const g = l.filter(k => !sec || kat(k) === sec);
    kap.innerHTML = `<div class="cipler yap"><a href="#/ornekler" class="${sec ? '' : 'secili'}">Tümü (${l.length})</a>${var_.map(t => `<a href="#/ornekler?kat=${encodeURIComponent(t)}" class="${sec === t ? 'secili' : ''}">${esc(t)} (${l.filter(k => kat(k) === t).length})</a>`).join('')}</div>
      <div class="izgara">${g.map(k => `<a class="kart ornek" href="#/ornekler/${esc(k.id)}"><div class="gorsel" data-ref="${esc(k.foto || '')}">${guvenliUrl(k.gorsel) ? `<img src="${esc(guvenliUrl(k.gorsel))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-hata="kaldir">` : ''}<span class="bas">${esc((k.baslik || '?').charAt(0))}</span></div>
        <b>${esc(k.baslik)}</b><span class="soluk">${k.tedarikciAd ? 'Mersin: ' + esc(k.tedarikciAd) : esc(kat(k))}</span></a>`).join('') || bos('Henüz örnek yok.')}</div>${ekle('#/ornekler/yeni')}`;
    kap.querySelectorAll('.gorsel[data-ref]').forEach(async d => { if (!d.dataset.ref) return; const u = await api.fotoAl(d.dataset.ref); if (u) d.style.backgroundImage = `url(${u})`; });
  },
};

async function detay(kap, k, ctx) {
  ctx.baslik('Örnek', '#/ornekler');
  if (!k) { kap.innerHTML = bos('Örnek bulunamadı.'); return; }
  const gorsel = guvenliUrl(k.gorsel), kaynak = guvenliUrl(k.kaynakUrl), dis = !!gorsel, ho = alanAdi(kaynak);
  const dl = [['Kategori', kat(k)], ['Malzeme', k.malzeme], ['Ölçü', k.olcu], ['Yaklaşık fiyat', k.fiyat ? `${k.fiyat}${k.fiyatTarih ? ' (' + k.fiyatTarih + ')' : ''}` : ''], ['Mersin\'de', k.yer], ['Etiketler', (k.etiketler || []).join(', ')]].filter(x => x[1]);
  kap.innerHTML = `<section class="panel"><div class="ornek-gorsel" id="og">${dis ? `<img src="${esc(gorsel)}" alt="" referrerpolicy="no-referrer" data-hata="yok">` : ''}</div>
    ${dis ? `<p class="telif">İç referans — yayınlanamaz${ho ? ', kaynak: ' + esc(ho) : ''}</p>` : ''}
    <h2>${esc(k.baslik)}</h2><p>${esc(k.aciklama || '')}</p>
    <dl class="bilgi">${dl.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}
    ${k.tedarikciAd ? `<dt>Tedarikçi</dt><dd>${k.tedarikciId ? `<a href="#/rehber/${esc(k.tedarikciId)}">${esc(k.tedarikciAd)} · rehberde aç</a>` : esc(k.tedarikciAd)}</dd>` : ''}
    ${kaynak ? `<dt>Kaynak</dt><dd><a href="${esc(kaynak)}" target="_blank" rel="noopener noreferrer">${esc(ho || kaynak)}</a></dd>` : ''}</dl>
    <div class="sira">${dis || k.foto ? '<button class="dugme" id="gs">Müşteriye göster</button>' : ''}${kaynak ? '<button class="dugme ikincil" id="pl">' + ikon('paylas', 18) + ' Bağlantıyı paylaş</button>' : ''}</div>
    ${k.id?.startsWith('ek-') ? '' : `<a class="dugme ikincil" href="#/ornekler/${esc(k.id)}/duzenle">Düzenle</a>`}</section>`;
  if (k.foto) api.fotoAl(k.foto).then(u => { if (u) kap.querySelector('#og').innerHTML = `<img src="${u}" alt="">`; });
  kap.querySelector('#gs')?.addEventListener('click', async () => {
    const src = k.foto ? await api.fotoAl(k.foto) : gorsel;
    const d = document.createElement('div'); d.className = 'tamekran'; d.innerHTML = `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer"><button type="button" aria-label="Kapat">×</button>`;
    d.addEventListener('click', () => d.remove()); document.body.append(d);
  });
  kap.querySelector('#pl')?.addEventListener('click', async () => {
    try { if (navigator.share) await navigator.share({ title: k.baslik, url: kaynak }); else { await navigator.clipboard.writeText(kaynak); bildir('Bağlantı kopyalandı'); } } catch { /* iptal */ }
  });
}
