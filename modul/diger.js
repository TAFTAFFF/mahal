// Daha fazla: diğer modüller ve hesap işlemleri.
import * as api from '../api.js';
import { esc, bildir } from '../util.js';
import { konumDurumu, konumuSifirla } from '../konum.js';

export default {
  id: 'diger', baslik: 'Daha fazla',
  async ekran(kap, _, ctx) {
    const d = api.durum();
    kap.innerHTML = `<div class="liste">${ctx.menu.map(m => `<a class="kart" href="#/${esc(m.id)}"><b>${esc(m.menu.ad)}</b><span class="soluk">${esc(m.menu.acik)}</span></a>`).join('')}</div>
      <section class="panel"><h3>Hesap</h3><p>${esc(d.oturum?.ad || '')} <span class="soluk">(${esc(d.oturum?.kullanici || '')})</span></p>
      <p class="soluk">${d.mod === 'yerel' ? 'Yerel deneme modu: veriler yalnızca bu tarayıcıda.' : 'Bağlı: Google E-Tablo / Drive'}${api.bekleyen() ? ` · ${api.bekleyen()} kayıt gönderilmeyi bekliyor` : ''}</p>
      <div class="sira"><button class="dugme ikincil" id="c">Çıkış yap</button><button class="dugme tehlike" id="tc">Tüm cihazlardan çık</button></div></section>`;
    kap.insertAdjacentHTML('beforeend', `<section class="panel"><h3>Gizlilik ve konum</h3>
      <p class="soluk">Konum arka planda izlenmez; yalnız günlük, proje ve ana ekranı açtığında (izin verdiysen) alınır. Koordinat ekip E-Tablosuna kaydedilir. Hava için Open-Meteo, adres için OpenStreetMap (Nominatim) koordinatı görür. Adres verisi © OpenStreetMap katkıcıları.</p>
      <p class="soluk">Konum izni: <b>${{ tamam: 'verildi', red: 'reddedildi', sorulmadi: 'henüz sorulmadı', yok: 'bu cihazda yok' }[konumDurumu()]}</b></p>
      <button class="dugme ikincil" id="kx">Konum iznini sıfırla</button></section>`);
    kap.querySelector('#kx').onclick = () => { konumuSifirla(); bildir('Konum bayrağı sıfırlandı'); ctx.yenile(); };
    kap.querySelector('#c').onclick = () => api.cikis();
    kap.querySelector('#tc').onclick = async () => {
      if (!confirm('Bu hesabın tüm cihazlardaki oturumları kapatılsın mı?')) return;
      try { await api.tumCikis(); } catch (e) { bildir(e.message, true); }
    };
  },
};
