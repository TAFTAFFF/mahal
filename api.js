// Tek veri katmanı. Yerel deneme modu ve Apps Script (uzak) modu aynı arayüzü sunar:
//   durum() giris() ilkGiris() cikis() tumCikis() ortaklar()
//   liste(kol) kaydet(kol, kayit) sil(kol, id)   fotoEkle(dataUrl) fotoAl(ref)
//   bekleyen() esitle()
import { API_URL } from './config.js';
import { DEMO_KULLANICI, DEMO_ORTAKLAR, DEMO_VERI, DEMO_PAZAR } from './demo-veri.js';
import { uid, kvGet, kvSet, kvKapat } from './util.js';

export const YEREL = !API_URL;
const L = (k, v) => {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify(v));
  } catch { return null; }
};
const ONEK = YEREL ? 'mahal.yerel.' : 'mahal.onbellek.';
const OTURUM_K = 'mahal.oturum', KUYRUK_K = 'mahal.kuyruk';
const olay = () => window.dispatchEvent(new Event('mahal-durum'));
const veriOlay = kol => window.dispatchEvent(new CustomEvent('mahal:veri', { detail: { kol } }));
const CEKILDI_K = 'mahal.cekildi', TAZE_MS = 30000;   // koleksiyon -> sunucudan son çekilme zamanı
let yuk = 0, degisim = 0;                              // devam eden ağ okuması; yerel değişiklik sayacı
export const yukleniyor = () => yuk > 0;

// Çıkış / uzaktan iptal / yetkisiz: bu cihazdaki tüm iş verisini sil (localStorage 'mahal.*', IndexedDB 'mahal', veri önbellekleri; kabuk önbelleği kalır).
async function yerelTemizle() {
  if (YEREL) { try { localStorage.removeItem(OTURUM_K); } catch { /* */ } return; }   // yerel deneme modunda demo verisi silinmez
  try { Object.keys(localStorage).filter(k => k.startsWith('mahal.')).forEach(k => localStorage.removeItem(k)); } catch { /* */ }
  pazarBellek = null; pazarKontrolT = 0;
  try { await kvKapat(); await new Promise(ok => { const r = indexedDB.deleteDatabase('mahal'); r.onsuccess = r.onerror = r.onblocked = () => ok(); }); } catch { /* */ }
  try { if (window.caches) for (const ad of await caches.keys()) if (!/^mahal-v\d+$/.test(ad)) await caches.delete(ad); } catch { /* */ }
}

// ---------- oturum ----------
function oturum() {
  const o = L(OTURUM_K);
  return o && o.bitis > Date.now() ? o : null;
}
export const kullaniciAdi = () => oturum()?.kullanici || '';
export const durum = () => ({ mod: YEREL ? 'yerel' : 'uzak', oturum: oturum() });
export const ortaklar = () => oturum()?.ortaklar || DEMO_ORTAKLAR;

async function uzak(eylem, veri = {}, zamanAsimi = 0) {
  const ac = zamanAsimi ? new AbortController() : null, zt = ac && setTimeout(() => ac.abort(), zamanAsimi);
  let r;
  try {
    r = await fetch(API_URL, {
    signal: ac?.signal,
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // preflight olmasın
    body: JSON.stringify({ eylem, belirtec: oturum()?.belirtec, ...veri }),
    });
  } catch (e) { if (e.name === 'AbortError') throw new Error(`zaman aşımı (${zamanAsimi / 1000} sn)`); throw e; }
  finally { clearTimeout(zt); }
  const j = await r.json();
  if (!j.ok && j.hata === 'yetkisiz') { await yerelTemizle(); olay(); }
  return j;
}
function oturumAc(j, kullanici) {
  L(OTURUM_K, { belirtec: j.belirtec, kullanici, ad: j.ad, ortaklar: j.ortaklar, bitis: Date.now() + 90 * 864e5 });
  olay();
}
export async function giris(kullanici, sifre) {
  const ad = kullanici.trim().toLowerCase();
  if (YEREL) {
    if (ad === DEMO_KULLANICI.kullanici && sifre === DEMO_KULLANICI.sifre) {
      return oturumAc({ belirtec: 'yerel', ad: DEMO_KULLANICI.ad, ortaklar: DEMO_ORTAKLAR }, ad);
    }
    throw new Error('Yerel deneme modunda kullanıcı adı: demo, şifre: demo');
  }
  const j = await uzak('giris', { kullanici: ad, sifre });
  if (!j.ok) throw new Error(j.hata);
  oturumAc(j, ad);
}
export async function ilkGiris(kullanici, davet, yeniSifre) {
  if (YEREL) throw new Error('Davet kodu yalnızca Apps Script bağlıyken kullanılır.');
  const ad = kullanici.trim().toLowerCase();
  const j = await uzak('ilkGiris', { kullanici: ad, davet: davet.trim(), yeniSifre });
  if (!j.ok) throw new Error(j.hata);
  oturumAc(j, ad);
}
export async function cikis() {
  if (!YEREL) { try { await uzak('cikis'); } catch { /* çevrimdışı */ } }
  await yerelTemizle(); olay();
}
export async function tumCikis() {
  if (!YEREL) { const j = await uzak('tumCikis'); if (!j.ok) throw new Error(j.hata); }
  await yerelTemizle(); olay();
}

// ---------- veri ----------
function oku(kol) {
  const v = L(ONEK + kol);
  if (v) return v;
  const ilk = YEREL ? structuredClone(DEMO_VERI[kol] || []) : [];
  L(ONEK + kol, ilk);
  return ilk;
}
const yaz = (kol, liste) => L(ONEK + kol, liste);
const kuyruk = () => L(KUYRUK_K) || [];
export const bekleyen = () => kuyruk().length;

// Önce önbellek, arkadan yenile: önbellekte veri varsa hemen döner, sunucudan arka planda çeker;
// veri değiştiyse 'mahal:veri' olayı yayınlanır. Önbellek hiç yoksa (ilk açılış) sunucuyu bekler.
const surenler = new Map();
function tazele(kol) {
  if (surenler.has(kol)) return surenler.get(kol);
  const ts = (L(CEKILDI_K) || {})[kol];
  if (ts && Date.now() - ts < TAZE_MS) return Promise.resolve();
  const p = (async () => {
    await Promise.resolve();   // surenler.set'ten sonra çalışsın
    if (!navigator.onLine || !oturum()) return;
    yuk++; olay();
    try {
      if (kuyruk().length) await esitle();
      const d0 = degisim;
      const j = await uzak('liste', { kol });
      if (!j.ok || d0 !== degisim) return;   // fetch sırasında yerel değişiklik oldu: sonucu atma, sonraki sefer tazelenir
      const k = kuyruk();
      const bekle = new Map(k.filter(x => x.kol === kol && x.rec).map(x => [x.rec.id, x.rec]));
      const silinecek = new Set(k.filter(x => x.kol === kol && x.sil).map(x => x.sil));
      const sunucu = j.kayitlar.filter(r => !silinecek.has(r.id)).map(r => bekle.get(r.id) || r);
      const var_ = new Set(sunucu.map(r => r.id));
      const yeni = [...sunucu, ...[...bekle.values()].filter(r => !var_.has(r.id))];
      const eski = L(ONEK + kol);
      L(CEKILDI_K, { ...(L(CEKILDI_K) || {}), [kol]: Date.now() });
      if (JSON.stringify(eski) !== JSON.stringify(yeni)) { yaz(kol, yeni); veriOlay(kol); }
    } catch { /* çevrimdışı: önbellek */ }
    finally { yuk--; surenler.delete(kol); olay(); }
  })();
  surenler.set(kol, p);
  return p;
}
export async function liste(kol) {
  if (YEREL) return oku(kol);
  if ((L(CEKILDI_K) || {})[kol]) { tazele(kol); return oku(kol); }
  await tazele(kol);   // ilk açılış: önbellek yok, bekle
  return oku(kol);
}
// Giriş sonrası: tüm koleksiyonlar ve rehber arka planda paralel ön-yüklenir.
export const KOLEKSIYONLAR = ['projeler', 'rehber', 'gorevler', 'gunluk', 'odemeler', 'ornekler', 'pazarnot', 'favoriler'];
export function onYukle() {
  if (YEREL || !oturum()) return;
  KOLEKSIYONLAR.forEach(k => tazele(k));
  pazarYukle().catch(() => { });
}
export async function kaydet(kol, kayit) {
  const k = { ...kayit, id: kayit.id || uid(), guncelleme: new Date().toISOString() };
  const l = oku(kol), i = l.findIndex(r => r.id === k.id);
  if (i >= 0) l[i] = k; else l.unshift(k);
  yaz(kol, l); degisim++;
  if (!YEREL) { L(KUYRUK_K, [...kuyruk(), { kol, rec: k }]); olay(); esitle(); }
  return k;
}
export async function sil(kol, id) {
  yaz(kol, oku(kol).filter(r => r.id !== id)); degisim++;
  if (!YEREL) { L(KUYRUK_K, [...kuyruk().filter(x => x.rec?.id !== id), { kol, sil: id }]); olay(); esitle(); }
}

// ---------- rehber verisi (pazar): ayrı, sürüm damgalı yükleme ----------
// Yerel modda web/yerel/rehber-pazar.json varsa o, yoksa demo-veri'deki sahte kayıtlar.
// Uzak modda Apps Script 'pazar' eylemi; sürüm değişmediyse sunucudan veri çekilmez (IndexedDB önbelleği).
let pazarBellek = null, pazarKontrolT = 0, pazarKontrolP = null, pazarHata = '';
const kvG = async k => { try { return await kvGet(k); } catch { return null; } };   // IndexedDB yoksa/bozuksa bellekte devam
const kvS = async (k, v) => { try { await kvSet(k, v); return true; } catch { return false; } };
// Sürüm kontrolü arka planda; yeni sürüm gelirse 'mahal:veri' {kol:'pazar'} yayınlanır.
// Başarısızlıkta pazarBellek null kalır (boş dizi bellekte kalıcılaşmaz), sebep pazarHata'da tutulur.
function pazarKontrol() {
  if (pazarKontrolP) return pazarKontrolP;
  if (pazarBellek && Date.now() - pazarKontrolT < TAZE_MS) return Promise.resolve();
  pazarKontrolP = (async () => {
    await Promise.resolve();
    if (!navigator.onLine || !oturum()) { pazarHata = !oturum() ? 'oturum yok' : 'çevrimdışı'; return; }
    yuk++; olay();
    try {
      const eski = pazarBellek;
      const surum = eski ? await kvG('pazar:surum') : '';
      const j = await uzak('pazar', { surum: surum || '' }, 60000);
      if (!j.ok) { pazarHata = j.hata || 'sunucu hatası'; return; }
      pazarKontrolT = Date.now(); pazarHata = '';
      if (!j.ayni) {
        if (!Array.isArray(j.kayitlar)) { pazarHata = 'sunucu geçersiz veri döndürdü'; return; }
        pazarBellek = j.kayitlar;
        if (await kvS('pazar:veri', j.kayitlar)) await kvS('pazar:surum', j.surum);   // 890 KB tek kayıt: iOS'ta sorun değil; yazılamazsa bellekte kalır
        if (eski) veriOlay('pazar');
      }
    } catch (e) { pazarHata = e.message || 'ağ hatası'; }
    finally { yuk--; pazarKontrolP = null; olay(); }
  })();
  return pazarKontrolP;
}
export async function pazarHazirMi() { return YEREL || !!pazarBellek || Array.isArray(await kvG('pazar:veri')); }
export async function pazarYukle() {
  if (YEREL) {
    if (pazarBellek) return pazarBellek;
    const l = await yerelDosya('rehber-pazar.json');
    return (pazarBellek = l || structuredClone(DEMO_PAZAR));
  }
  if (pazarBellek) { pazarKontrol(); return pazarBellek; }
  const onb = await kvG('pazar:veri');
  if (Array.isArray(onb) && onb.length) { pazarBellek = onb; pazarKontrol(); return onb; }
  await pazarKontrol();   // ilk açılış: indirmeyi bekle
  if (!pazarBellek) throw new Error(pazarHata || 'Rehber indirilemedi');
  return pazarBellek;
}
export const pazarKaynagi = () => (YEREL && pazarBellek && pazarBellek.length > 50 ? 'gercek' : 'demo');
export async function yerelDosya(ad) {
  try { const r = await fetch('yerel/' + ad, { cache: 'no-cache' }); if (!r.ok) return null; const j = await r.json(); return Array.isArray(j) ? j : null; } catch { return null; }
}

// ---------- fotoğraf ----------
// Kayıtlarda fotoğraf başvurusu: "idb:..." (bu cihazda) veya "drive:..." (Drive'a yüklenmiş).
const refler = r => Object.entries(r).flatMap(([a, v]) => [].concat(v).filter(x => typeof x === 'string' && x.startsWith('idb:')).map(x => [a, x]));
export async function fotoEkle(dataUrl) {
  const ref = 'idb:' + uid();
  await kvSet('foto:' + ref, dataUrl);
  return ref;
}
export async function fotoAl(ref) {
  if (!ref) return '';
  const y = await kvGet('foto:' + ref);
  if (y) return y;
  if (ref.startsWith('drive:') && !YEREL) {
    const j = await uzak('fotoAl', { id: ref.slice(6) });
    if (j.ok) { await kvSet('foto:' + ref, j.dataUrl); return j.dataUrl; }
  }
  return '';
}
async function fotolariYukle(rec) {
  const yeni = { ...rec };
  for (const [alan, ref] of refler(rec)) {
    const veri = await kvGet('foto:' + ref);
    const j = await uzak('fotoYukle', { dataUrl: veri });
    if (!j.ok) throw new Error(j.hata);
    const dr = 'drive:' + j.id;
    await kvSet('foto:' + dr, veri);
    yeni[alan] = Array.isArray(yeni[alan]) ? yeni[alan].map(x => x === ref ? dr : x) : dr;
  }
  return yeni;
}

// ---------- eşitleme (çevrimdışı kuyruk) ----------
let esitlemeP = null;
export function esitle() {
  if (YEREL || !navigator.onLine || !oturum()) return Promise.resolve();
  return esitlemeP ||= esitleGercek().finally(() => { esitlemeP = null; });
}
async function esitleGercek() {
  {
    for (let k = kuyruk()[0]; k; k = kuyruk()[0]) {
      let j;
      try {
        if (k.sil) j = await uzak('sil', { kol: k.kol, id: k.sil });
        else {
          const rec = await fotolariYukle(k.rec);
          j = await uzak('kaydet', { kol: k.kol, kayit: rec });
          if (j.ok) {
            const l = oku(k.kol), i = l.findIndex(r => r.id === rec.id);
            if (i >= 0) { l[i] = rec; yaz(k.kol, l); }
          }
        }
      } catch { break; }  // ağ yok: sonra tekrar denenecek
      if (!j.ok && j.hata === 'yetkisiz') break;
      if (!j.ok) console.warn('Kayıt gönderilemedi, atlandı:', j.hata);
      L(KUYRUK_K, kuyruk().slice(1)); degisim++; olay();
    }
  }
}
window.addEventListener('online', esitle);
