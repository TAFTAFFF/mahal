// Küçük yardımcılar: kaçış, tarih, IndexedDB, görsel küçültme, bildirim.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Dış bağlantı yalnız http(s) ise geçerlidir; değilse boş döner.
export const guvenliUrl = u => { const s = String(u ?? '').trim().split(/\s/)[0]; return /^https?:\/\//i.test(s) ? s : ''; };
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const p2 = n => String(n).padStart(2, '0');
export const bugunStr = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const saatStr = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const trTarih = (s, uzun = false) => {
  if (!s) return '';
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', uzun ? { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' } : { day: 'numeric', month: 'short', year: 'numeric' });
};
export const para = n => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
export const telTemiz = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('90')) d = d.slice(2); if (d.startsWith('0')) d = d.slice(1); return d; };

// --- IndexedDB (fotoğraflar ve önbelleğe alınmış yazı tipleri) ---
let _db;
const db = () => _db ||= new Promise((ok, hata) => {
  const r = indexedDB.open('mahal', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => ok(r.result); r.onerror = () => hata(r.error);
});
const kvIs = async (mod, fn) => { const d = await db(); return new Promise((ok, hata) => { const t = d.transaction('kv', mod); const r = fn(t.objectStore('kv')); t.oncomplete = () => ok(r.result); t.onerror = () => hata(t.error); }); };
export const kvKapat = async () => { if (_db) { try { (await _db).close(); } catch { /* */ } _db = null; } };
export const kvGet = k => kvIs('readonly', s => s.get(k));
export const kvSet = (k, v) => kvIs('readwrite', s => s.put(v, k));
export const kvDel = k => kvIs('readwrite', s => s.delete(k));

// Görseli en uzun kenarı 1600px olacak şekilde küçültüp JPEG (0.7) veri adresine çevirir.
export async function kucult(dosya, enBuyuk = 1600, kalite = 0.7) {
  const bmp = await createImageBitmap(dosya, { imageOrientation: 'from-image' });
  const o = Math.min(1, enBuyuk / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * o); c.height = Math.round(bmp.height * o);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', kalite);
}

export function bildir(metin, hata = false) {
  const t = document.createElement('div');
  t.className = 'bildirim' + (hata ? ' hata' : ''); t.textContent = metin;
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}

// Arama normalleştirme: Türkçe küçük harf + aksan sadeleştirme (ı/i, ş/s, ğ/g...). İndeks bir kez üretilir.
const KATLA = { 'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u' };
export const norm = s => String(s ?? '').toLocaleLowerCase('tr').replace(/[ışğüöçâîû]/g, c => KATLA[c]).replace(/\s+/g, ' ').trim();
export const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
export const telListe = t => String(t || '').split(/[\/,;]/).map(x => x.trim()).filter(x => telTemiz(x).length >= 7);
export const cepMi = t => /^5\d{9}$/.test(telTemiz(t));
