// Yapılacaklar: projeye bağlı görev, sorumlu, tarih, tamam işareti.
import * as api from '../api.js';
import { esc, trTarih, bugunStr } from '../util.js';
import { bos, ekle, projeAdi } from '../ui.js';
import { formEkrani } from '../crud.js';

const SEMA = [
  { ad: 'baslik', etiket: 'Görev', zorunlu: true },
  { ad: 'projeId', etiket: 'Proje', tur: 'projeSec' },
  { ad: 'sorumlu', etiket: 'Sorumlu', tur: 'ortakSec' },
  { ad: 'tarih', etiket: 'Tarih', tur: 'tarih' },
  { ad: 'tamam', etiket: 'Tamamlandı', tur: 'onay' },
];

export default {
  id: 'gorevler', baslik: 'Yapılacaklar', menu: { ad: 'Yapılacaklar', acik: 'Görevler ve tarihler' },
  async ekran(kap, [a], ctx) {
    const liste = await api.liste('gorevler');
    if (a === 'yeni') { ctx.baslik('Yeni görev', '#/gorevler'); return formEkrani(kap, { kol: 'gorevler', sema: SEMA, kayit: { projeId: ctx.sorgu.get('proje') || '', sorumlu: ctx.kullanici?.ad }, ctx, geri: '#/gorevler' }); }
    if (a) { ctx.baslik('Görevi düzenle', '#/gorevler'); return formEkrani(kap, { kol: 'gorevler', sema: SEMA, kayit: liste.find(x => x.id === a), ctx, geri: '#/gorevler' }); }
    const pr = ctx.sorgu.get('proje') || '', bugun = bugunStr();
    const l = liste.filter(g => !pr || g.projeId === pr).sort((x, y) => (x.tamam - y.tamam) || (x.tarih || '9').localeCompare(y.tarih || '9'));
    kap.innerHTML = `${pr ? `<p class="soluk">Proje: ${esc(projeAdi(ctx, pr))} · <a href="#/gorevler">tümü</a></p>` : ''}
      <div class="liste">${l.map(g => `<div class="kart gorev ${g.tamam ? 'bitti' : ''}"><button class="tik" data-id="${esc(g.id)}" aria-label="Tamam işaretle">${g.tamam ? '✓' : ''}</button>
      <a href="#/gorevler/${esc(g.id)}"><b>${esc(g.baslik)}</b><span class="soluk">${esc(projeAdi(ctx, g.projeId))}${g.sorumlu ? ' · ' + esc(g.sorumlu) : ''}</span></a>
      <span class="tarih ${!g.tamam && g.tarih && g.tarih < bugun ? 'gecmis' : ''}">${trTarih(g.tarih)}</span></div>`).join('') || bos('Görev yok.')}</div>${ekle(`#/gorevler/yeni${pr ? '?proje=' + pr : ''}`)}`;
    kap.querySelectorAll('.tik').forEach(b => b.addEventListener('click', async () => {
      const g = liste.find(x => x.id === b.dataset.id); await api.kaydet('gorevler', { ...g, tamam: !g.tamam }); ctx.yenile();
    }));
  },
};
