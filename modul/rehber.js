// Rehber: ekibin kendi kayıtları (mahal) + Mersin pazar listesi (pazar), tek listede.
// Yoğun satır listesi, çipli süzgeç, favoriler, parça parça çizim (60'ar), önceden hesaplanmış arama dizini.
import * as api from '../api.js';
import { esc, telTemiz, norm, debounce, telListe, cepMi, bildir, guvenliUrl } from '../util.js';
import { ILCELER, ikon, bos, rozet } from '../ui.js';
import { formEkrani } from '../crud.js';
import { yolTarifi } from '../konum.js';

const SEMA = [
  { ad: 'ad', etiket: 'Ad / firma', zorunlu: true },
  { ad: 'telefon', etiket: 'Telefon', tur: 'tel' },
  { ad: 'is', etiket: 'Alan (listeden seç ya da yaz)', tur: 'liste', secenekler: [] },
  { ad: 'ilce', etiket: 'İlçe', tur: 'secim', secenekler: [...ILCELER, 'Diğer'] },
  { ad: 'adres', etiket: 'Adres', tur: 'uzun' },
  { ad: 'kartvizit', etiket: 'Kartvizit fotoğrafı (yalnız saklanır)', tur: 'foto' },
  { ad: 'projeler', etiket: 'Çalıştığı projeler', tur: 'cokluProje' },
  { ad: 'not', etiket: 'Not', tur: 'uzun' },
];
export const telBag = t => { const n = telTemiz(t); return { tel: `tel:+90${n}`, wa: `https://wa.me/90${n}` }; };
const SIRA_ILCE = new Set(['Yenişehir', 'Mezitli']);
const PARCA = 60;
const SON_K = 'mahal.sonArama';
const sonAramalar = () => { try { return JSON.parse(localStorage.getItem(SON_K)) || {}; } catch { return {}; } };
const sonAramaYaz = id => { try { const o = sonAramalar(); o[id] = new Date().toISOString(); localStorage.setItem(SON_K, JSON.stringify(o)); } catch { /* */ } };
const trZaman = s => s ? new Date(s).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

// ---- birleşik liste ----
let hazir = null, hazirKaynak = null;
function pazarHazirla(pazar) {
  if (hazirKaynak === pazar) return hazir;
  for (const k of pazar) { k.kaynak = 'pazar'; k._a = norm(`${k.ad} ${k.alan || ''} ${k.altAlan || ''} ${k.ilce || ''} ${k.adres || ''} ${k.not || ''}`); }
  hazir = [...pazar].sort((a, b) => (a.tel ? 0 : 1) - (b.tel ? 0 : 1) || (SIRA_ILCE.has(a.ilce) ? 0 : 1) - (SIRA_ILCE.has(b.ilce) ? 0 : 1) || a.ad.localeCompare(b.ad, 'tr'));
  hazirKaynak = pazar; return hazir;
}
function kendiHazirla(l) {
  return l.map(k => ({ id: k.id, kaynak: 'mahal', ad: k.ad, alan: k.is || '', ilce: k.ilce || '', adres: k.adres || '', tel: k.telefon || '', not: k.not || '', puan: k.puan, projeler: k.projeler, kartvizit: k.kartvizit,
    _a: norm(`${k.ad} ${k.is || ''} ${k.ilce || ''} ${k.adres || ''} ${k.not || ''}`) }));
}
export async function veriYukle(ctx) {
  const [pazar, notlar, fav] = await Promise.all([api.pazarYukle(), api.liste('pazarnot'), api.liste('favoriler')]);
  const nm = new Map(notlar.map(n => [n.id, n]));
  const hepsi = [...kendiHazirla(ctx.rehber), ...pazarHazirla(pazar)];
  for (const k of hepsi) {
    const n = nm.get(k.id);
    k.ekNot = n?.not || ''; k.telEk = n?.telEk || '';
    k.efTel = k.tel || k.telEk; k.pr = n?.projeler || k.projeler || [];
    k._a2 = n ? norm(n.not + ' ' + (n.telEk || '')) : '';
  }
  const fm = new Map();
  for (const f of fav) { if (!fm.has(f.kayitId)) fm.set(f.kayitId, []); fm.get(f.kayitId).push(f); }
  return { hepsi, fm, nm, harita: new Map(hepsi.map(k => [k.id, k])) };
}
const bas = ad => (ad || '?').trim().charAt(0).toLocaleUpperCase('tr');

// ---- satır ----
function satir(k, v, kul) {
  const f = v.fm.get(k.id) || [], benim = f.some(x => x.kullanici === kul);
  const tels = telListe(k.efTel), t0 = tels[0], ilk = t0 && telBag(t0);
  const alt = [k.alan, k.ilce].filter(Boolean).join(' · ');
  let e = `<button class="eb yb ${benim ? 'favori' : ''}" data-a="fav" aria-label="${benim ? 'Favoriden çıkar' : 'Favori'}" aria-pressed="${benim}">${ikon('yildiz', 22)}</button>`;
  if (t0) {
    e += `<a class="eb" data-a="ara" href="${ilk.tel}" aria-label="Ara">${ikon('tel', 22)}</a>`;
    if (cepMi(t0)) e += `<a class="eb wa" href="${ilk.wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ikon('wa', 22)}</a>`;
  } else {
    if (k.web) e += `<a class="eb" href="${esc(/^https?:/.test(k.web) ? k.web : 'https://' + k.web)}" target="_blank" rel="noopener" aria-label="Web sitesi">${ikon('web', 22)}</a>`;
    e += `<a class="eb yazi" href="#/rehber/${esc(k.id)}?numara=1">Numara<br>ekle</a>`;
  }
  if (k.adres || k.lat) e += `<a class="eb" href="${esc(yolTarifi(k))}" target="_blank" rel="noopener" aria-label="Yol tarifi">${ikon('yol', 22)}</a>`;
  const kim = f.length ? `<span class="kim">★ ${f.map(x => esc(bas(x.kullaniciAd || x.kullanici))).join(' ')}</span>` : '';
  return `<div class="rs ${t0 ? '' : 'telsiz'}" data-id="${esc(k.id)}"><a class="rs-ad" href="#/rehber/${esc(k.id)}"><b>${esc(k.ad)}${k.isaret ? '<i class="isr" title="İşaretli">!</i>' : ''}${k.dogrulama ? '<i class="onay-i" title="Doğrulanmış">✓</i>' : ''}</b>
    <span class="soluk">${esc(alt)}${k.kaynak === 'mahal' ? ' ' + rozet('ekip', 'k') : ''} ${kim}</span></a><span class="rs-e">${e}</span></div>`;
}

export default {
  id: 'rehber', baslik: 'Rehber',
  async ekran(kap, [a, b], ctx) {
    if (a === 'yeni') return yeniKisi(kap, ctx);
    const v = await veriYukle(ctx);
    if (a && b === 'duzenle') {
      const k = ctx.rehber.find(x => x.id === a); ctx.baslik('Kişiyi düzenle', `#/rehber/${a}`);
      return formEkrani(kap, { kol: 'rehber', sema: semaAlanli(v), kayit: k, ctx, geri: '#/rehber', sonra: () => `#/rehber/${a}` });
    }
    if (a) return detay(kap, v.harita.get(a), v, ctx);
    return liste(kap, v, ctx);
  },
};

const semaAlanli = v => SEMA.map(s => s.ad === 'is' ? { ...s, secenekler: alanSayilari(v.hepsi).map(x => x[0]) } : s);
function alanSayilari(hepsi, grup) {
  const c = new Map();
  for (const k of hepsi) if (k.alan && (!grup || k.grup === grup)) c.set(k.alan, (c.get(k.alan) || 0) + 1);
  return [...c].sort((x, y) => y[1] - x[1]);
}

// ---- liste ----
const temizler = [];
const ctxTemizle = f => temizler.push(f);
window.addEventListener('hashchange', () => { while (temizler.length) temizler.pop()(); });

function liste(kap, v, ctx) {
  const kul = ctx.kullanici?.kullanici || '';
  const S = { q: ctx.sorgu.get('q') || '', s: ctx.sorgu.get('s') || 'tum', g: ctx.sorgu.get('g') || '', a: ctx.sorgu.get('a') || '', i: ctx.sorgu.get('i') || '' };
  const href = (o = {}) => { const n = { ...S, ...o }; const p = new URLSearchParams(); for (const [k, x] of Object.entries(n)) if (x && !(k === 's' && x === 'tum')) p.set(k, x); const t = p.toString(); return '#/rehber' + (t ? '?' + t : ''); };
  const GRUPLAR = [...new Set(v.hepsi.map(k => k.grup).filter(Boolean))];
  const top = alanSayilari(v.hepsi, S.g).slice(0, 12).map(x => x[0]), topK = new Set(top);
  const ilceVar = ILCELER.filter(i => v.hepsi.some(k => k.ilce === i));
  const cip = (ad, h, sec) => `<a href="${h}" class="${sec ? 'secili' : ''}">${esc(ad)}</a>`;
  const favSay = v.hepsi.filter(k => v.fm.has(k.id)).length;
  kap.innerHTML = `<div class="yap"><input class="ara" type="search" placeholder="Ara: ad, alan, ilçe, adres, not" value="${esc(S.q)}" id="ara" autocomplete="off" enterkeyhint="search">
    <div class="cipler">${cip(`Favoriler (${favSay})`, href({ s: 'fav' }), S.s === 'fav')}${cip('Tümü', href({ s: 'tum' }), S.s === 'tum')}${cip('Telefonlu', href({ s: 'tel' }), S.s === 'tel')}</div></div>
    <div class="cipler">${cip('Tüm gruplar', href({ g: '', a: '' }), !S.g)}${GRUPLAR.map(g => cip(g, href({ g, a: '' }), S.g === g)).join('')}</div>
    <div class="cipler">${cip('Tüm alanlar', href({ a: '' }), !S.a)}${top.map(x => cip(x, href({ a: x }), S.a === x)).join('')}${cip('diğer', href({ a: '__diger' }), S.a === '__diger')}</div>
    <div class="cipler">${cip('Tüm ilçeler', href({ i: '' }), !S.i)}${ilceVar.map(i => cip(i, href({ i }), S.i === i)).join('')}${cip('Diğer', href({ i: '__diger' }), S.i === '__diger')}</div>
    <div class="alt-eylem"><a class="dugme ikincil" href="#/rehber/yeni">${ikon('kisiEkle', 20)} Yeni kişi</a><span class="soluk" id="say"></span></div>
    <div id="rl" class="rliste"></div><div id="son"></div>
    <button class="yukari" id="yk" hidden aria-label="Yukarı çık">${ikon('yukari', 22)}</button>`;

  const rl = kap.querySelector('#rl'), say = kap.querySelector('#say'), son = kap.querySelector('#son');
  let sonuc = [], cizilen = 0, obs = null;
  const uygula = () => {
    const toks = norm(S.q).split(' ').filter(Boolean);
    const l = v.hepsi.filter(k => {
      if (S.s === 'fav' && !v.fm.has(k.id)) return false;
      if (S.s === 'tel' && !k.efTel) return false;
      if (S.g && k.grup !== S.g) return false;
      if (S.a) { if (S.a === '__diger' ? topK.has(k.alan) : k.alan !== S.a) return false; }
      if (S.i) { if (S.i === '__diger' ? ILCELER.includes(k.ilce) : k.ilce !== S.i) return false; }
      for (const t of toks) if (!k._a.includes(t) && !k._a2.includes(t)) return false;
      return true;
    });
    const tl = l.filter(k => k.efTel), ts = l.filter(k => !k.efTel);
    sonuc = S.s === 'tel' ? tl : S.s === 'fav' ? l : [...tl, ...(ts.length ? [{ baslik: ts.length }] : []), ...ts];
    say.textContent = `${l.length} kayıt`;
    rl.innerHTML = ''; cizilen = 0; devam();
  };
  const devam = () => {
    const parca = sonuc.slice(cizilen, cizilen + PARCA); cizilen += parca.length;
    rl.insertAdjacentHTML('beforeend', parca.map(k => k.baslik ? `<h3 class="tbas">Telefonu olmayan ${k.baslik} kayıt</h3>` : satir(k, v, kul)).join(''));
    if (!sonuc.length) rl.innerHTML = bos(S.s === 'fav' ? 'Henüz favori yok. Satırdaki yıldıza dokun.' : 'Kayıt yok.');
    obs?.disconnect();
    if (cizilen < sonuc.length) { obs = new IntersectionObserver(es => { if (es[0].isIntersecting) devam(); }, { rootMargin: '600px' }); obs.observe(son); }
  };
  uygula();
  ctxTemizle(() => obs?.disconnect());

  const git = debounce(() => { S.q = kap.querySelector('#ara').value; history.replaceState(null, '', href()); uygula(); }, 150);
  kap.querySelector('#ara').addEventListener('input', git);
  if (ctx.sorgu.get('odak')) kap.querySelector('#ara').focus();

  rl.addEventListener('click', async e => {
    const d = e.target.closest('[data-a]'); if (!d) return;
    const id = d.closest('.rs').dataset.id;
    if (d.dataset.a === 'ara') sonAramaYaz(id);
    if (d.dataset.a === 'fav') {
      e.preventDefault();
      const acik = await favDegistir(id, v, ctx);
      d.classList.toggle('favori', acik); d.setAttribute('aria-pressed', acik);
      if (S.s === 'fav' && !acik) uygula();
    }
  });
  const yk = kap.querySelector('#yk');
  yk.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const kay = () => { yk.hidden = window.scrollY < 700; };
  window.addEventListener('scroll', kay, { passive: true }); ctxTemizle(() => window.removeEventListener('scroll', kay));
}

// Favori: ekip ortak. Kayıt kimliği = kayitId|kullanıcı. Çevrimdışı kuyruğa api.kaydet/sil ile girer.
async function favDegistir(id, v, ctx) {
  const kul = ctx.kullanici?.kullanici || 'demo', fid = `${id}|${kul}`;
  const l = v.fm.get(id) || [], var_ = l.find(x => x.kullanici === kul);
  if (var_) {
    const y = l.filter(x => x !== var_); if (y.length) v.fm.set(id, y); else v.fm.delete(id);
    await api.sil('favoriler', fid); return false;
  }
  const f = { id: fid, kayitId: id, kullanici: kul, kullaniciAd: ctx.kullanici?.ad || kul, tarih: new Date().toISOString().slice(0, 10) };
  v.fm.set(id, [...l, f]); await api.kaydet('favoriler', f); return true;
}

// ---- detay ----
async function detay(kap, k, v, ctx) {
  ctx.baslik(k ? 'Kayıt' : 'Rehber', '#/rehber');
  if (!k) { kap.innerHTML = bos('Kayıt bulunamadı.'); return; }
  const kul = ctx.kullanici?.kullanici || '', fav = (v.fm.get(k.id) || []), benimFav = fav.some(x => x.kullanici === kul);
  const tels = telListe(k.efTel), sonA = sonAramalar()[k.id];
  const web = k.web ? (/^https?:/.test(k.web) ? k.web : 'https://' + k.web) : '';
  const dl = [['Grup', k.grup], ['Alan', [k.alan, k.altAlan].filter(Boolean).join(' › ')], ['İlçe', k.ilce], ['Adres', k.adres], ['E-posta', k.eposta], ['Instagram', k.instagram], ['Puan', k.puan],
    ['Doğrulama', k.dogrulama], ['Erişim', k.erisim], [k.kaynak === 'pazar' ? 'Kaynak not' : 'Not', k.not]].filter(x => x[1]);
  const link = u0 => { const u = guvenliUrl(u0) || String(u0).split(/\s/)[0]; return guvenliUrl(u0) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))}</a>` : esc(u); };
  kap.innerHTML = `<section class="panel"><div class="kart-ust"><h2>${esc(k.ad)}</h2>${rozet(k.kaynak === 'pazar' ? 'pazar' : 'ekip', k.kaynak === 'pazar' ? '' : 'k')}</div>
    ${k.isaret ? `<p class="isaret"><b>Kontrol edin:</b> ${esc(k.isaret)}</p>` : ''}
    ${tels.map(t => { const b = telBag(t); return `<div class="tel-satir"><span class="tel">${esc(t)}</span><a class="eb" data-ara="1" href="${b.tel}" aria-label="Ara">${ikon('tel', 22)}</a>${cepMi(t) ? `<a class="eb wa" href="${b.wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ikon('wa', 22)}</a>` : ''}</div>`; }).join('') || '<p class="soluk">Telefon numarası yok.</p>'}
    <div class="sira">${k.adres ? `<a class="dugme ikincil" href="${esc(yolTarifi(k))}" target="_blank" rel="noopener">${ikon('yol', 18)} Yol tarifi</a>` : ''}${web ? `<a class="dugme ikincil" href="${esc(web)}" target="_blank" rel="noopener">${ikon('web', 18)} Web</a>` : ''}
      <button class="dugme ikincil ${benimFav ? 'favori' : ''}" id="fv">${ikon('yildiz', 18)} <span>${benimFav ? 'Favoride' : 'Favori'}</span></button></div>
    ${fav.length ? `<p class="soluk">Favoriye ekleyen: ${fav.map(x => esc(x.kullaniciAd || x.kullanici)).join(', ')}</p>` : ''}
    <p class="soluk" id="sa">${sonA ? 'Son arama: ' + trZaman(sonA) : 'Henüz aranmadı.'}</p>
    <dl class="bilgi">${dl.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}${k.kaynakUrl ? `<dt>Kaynak</dt><dd>${link(k.kaynakUrl)}</dd>` : ''}</dl></section>
    <section class="panel"><h3>Ekip notu</h3><textarea id="nt" rows="3" placeholder="Not: fiyat, güvenilirlik, ne iş yaptı…">${esc(k.kaynak === 'pazar' ? k.ekNot : k.not)}</textarea>
    ${!k.tel && k.kaynak === 'pazar' ? `<label for="ne">Numara ekle</label><input id="ne" type="tel" inputmode="tel" placeholder="05xx xxx xx xx" value="${esc(k.telEk)}">` : ''}
    <div class="sira"><button class="dugme" id="nk">Kaydet</button><button class="dugme ikincil" id="yn">Yanlış numara</button></div></section>
    <section class="panel"><h3>Projelere bağla</h3><div class="onaylar" id="pb">${ctx.projeler.map(p => `<label><input type="checkbox" value="${esc(p.id)}" ${(k.pr || []).includes(p.id) ? 'checked' : ''}> ${esc(p.ad)}</label>`).join('') || '<span class="soluk">Henüz proje yok</span>'}</div></section>
    ${k.kaynak === 'mahal' ? `<a class="dugme ikincil" href="#/rehber/${esc(k.id)}/duzenle">Düzenle</a>` : ''}`;
  if (ctx.sorgu.get('numara')) kap.querySelector('#ne')?.focus();
  const kaydetNot = async (ek = {}) => {
    if (k.kaynak === 'mahal') {
      const o = ctx.rehber.find(x => x.id === k.id);
      await api.kaydet('rehber', { ...o, ...(ek.not !== undefined ? { not: ek.not } : {}), ...(ek.projeler ? { projeler: ek.projeler } : {}) });
    } else await api.kaydet('pazarnot', { ...(v.nm.get(k.id) || { id: k.id }), ...ek });
  };
  kap.querySelectorAll('[data-ara]').forEach(a => a.addEventListener('click', () => {
    sonAramaYaz(k.id); kap.querySelector('#sa').textContent = 'Son arama: ' + trZaman(new Date().toISOString());
  }));
  kap.querySelector('#fv').addEventListener('click', async e => {
    const acik = await favDegistir(k.id, v, ctx); e.currentTarget.classList.toggle('favori', acik); e.currentTarget.querySelector('span').textContent = acik ? 'Favoride' : 'Favori';
  });
  kap.querySelector('#nk').addEventListener('click', async () => {
    const ek = { not: kap.querySelector('#nt').value.trim() };
    const ne = kap.querySelector('#ne'); if (ne) ek.telEk = ne.value.trim();
    await kaydetNot(ek); bildir('Kaydedildi');
  });
  kap.querySelector('#yn').addEventListener('click', async () => {
    const t = new Date().toLocaleDateString('tr-TR'), nt = kap.querySelector('#nt');
    nt.value = (nt.value.trim() + `\n[${t}] Yanlış numara bildirildi.`).trim();
    await kaydetNot({ not: nt.value }); bildir('Not düşüldü');
  });
  kap.querySelector('#pb').addEventListener('change', async () => {
    await kaydetNot({ projeler: [...kap.querySelectorAll('#pb input:checked')].map(i => i.value) }); bildir('Kaydedildi');
  });
}

// ---- yeni kişi ----
async function yeniKisi(kap, ctx) {
  ctx.baslik('Yeni kişi', '#/rehber');
  const v = await veriYukle(ctx);
  const cp = 'contacts' in navigator && 'ContactsManager' in window;
  const ek = cp ? '<button type="button" class="ikincil" id="cp">Telefon rehberinden seç</button>' : '';
  const f = formEkrani(kap, {
    kol: 'rehber', sema: semaAlanli(v), ctx, geri: '#/rehber', ek,
    once: kayit => {
      const n = telTemiz(kayit.telefon); if (n.length < 7) return true;
      const ayni = v.hepsi.find(k => telListe(k.efTel).some(t => telTemiz(t) === n));
      return !ayni || confirm(`Bu numara zaten kayıtlı: ${ayni.ad}. Yine de eklensin mi?`);
    },
  });
  f.querySelector('#cp')?.addEventListener('click', async () => {
    try {
      const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!c) return;
      if (c.name?.[0]) f.querySelector('[name=ad]').value = c.name[0];
      if (c.tel?.[0]) f.querySelector('[name=telefon]').value = c.tel[0];
    } catch { /* iptal */ }
  });
}
