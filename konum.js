// Konum: izin açıklaması, tek seferlik okuma, haversine, en yakın proje, Nominatim ters adres (önbellekli).
// Arka planda izleme yok; konum yalnız kullanıcı bir ekranı açtığında/dokunduğunda alınır.
import { VARSAYILAN_KONUM, NOMINATIM_EMAIL } from './config.js';

const BAYRAK = 'mahal.konumIzni';  // 'tamam' | 'red'
const bayrak = (v) => { try { if (v === undefined) return localStorage.getItem(BAYRAK); localStorage.setItem(BAYRAK, v); } catch { return null; } };
export const konumDurumu = () => (navigator.geolocation ? bayrak() || 'sorulmadi' : 'yok');

let son = null;  // { lat, lon, dogruluk, zaman }
export const sonKonum = () => (son && Date.now() - son.zaman < 120000 ? son : null);

// Tarayıcı izni zaten verilmişse uygulama içi açıklama tekrar gösterilmez.
export async function izinVerilmis() {
  if (bayrak() === 'tamam') return true;
  try { if ((await navigator.permissions.query({ name: 'geolocation' })).state === 'granted') { bayrak('tamam'); return true; } } catch { /* Safari: yok */ }
  return false;
}

function oku() {
  return new Promise(ok => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      p => { bayrak('tamam'); son = { lat: p.coords.latitude, lon: p.coords.longitude, dogruluk: p.coords.accuracy, zaman: Date.now() }; ok(son); },
      e => { if (e.code === 1) bayrak('red'); ok(null); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}

// Sessiz okuma: yalnız izin zaten verilmişse konum ister, aksi halde null döner.
export async function konumSessiz() {
  if (sonKonum()) return sonKonum();
  if (bayrak() === 'red' || !(await izinVerilmis())) return null;
  return oku();
}

// İzin açıklamasını gösterip (ilk kullanımda) konum ister. Kullanıcı dokunuşuyla çağrılmalı.
export async function konumIste() {
  if (sonKonum()) return sonKonum();
  if (!navigator.geolocation) return null;
  if (!(await izinVerilmis())) {
    const evet = await aciklama();
    if (!evet) return null;
  }
  return oku();
}
function aciklama() {
  return new Promise(ok => {
    const d = document.createElement('div'); d.className = 'modal';
    d.innerHTML = `<div class="modal-kutu" role="dialog" aria-modal="true"><h2>Konum izni</h2>
      <p>Konum yalnız günlük ve proje için, sen dokununca alınır. Arka planda izlenmez; koordinat yalnız ekip E-Tablosuna, hava ve adres için Open-Meteo ile OpenStreetMap'e gider.</p>
      <div class="sira"><button class="dugme ikincil" data-h>Vazgeç</button><button class="dugme" data-e>Devam</button></div></div>`;
    d.addEventListener('click', e => {
      if (e.target.matches('[data-e]')) { d.remove(); ok(true); }
      else if (e.target.matches('[data-h]') || e.target === d) { d.remove(); ok(false); }
    });
    document.body.append(d);
  });
}
export const konumuSifirla = () => { try { localStorage.removeItem(BAYRAK); } catch { /* */ } son = null; };

// ---- mesafe ----
export function mesafe(a, b) {  // metre, haversine
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const mesafeYaz = m => m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10 || 10} m` : `${(m / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
export const konumlu = p => p && p.lat !== '' && p.lat != null && p.lon !== '' && p.lon != null && !isNaN(+p.lat) && !isNaN(+p.lon);
export function mesafeliProjeler(projeler, k) {
  const l = projeler.map(p => ({ ...p, mesafe: k && konumlu(p) ? mesafe(k, { lat: +p.lat, lon: +p.lon }) : null }));
  return l.sort((a, b) => (a.mesafe ?? 1e12) - (b.mesafe ?? 1e12));
}
export const yakinProje = (projeler, k, esik = 300) => { const p = mesafeliProjeler(projeler, k)[0]; return p && p.mesafe != null && p.mesafe <= esik ? p : null; };
export const yolTarifi = (p) => konumlu(p) ? `https://www.google.com/maps/dir/?api=1&destination=${+p.lat},${+p.lon}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.adres, p.ilce, 'Mersin'].filter(Boolean).join(', '))}`;
export const sayiMi = x => x !== '' && x != null && Number.isFinite(+x);
export const haritadaAc = (lat, lon) => sayiMi(lat) && sayiMi(lon) ? `https://www.google.com/maps/search/?api=1&query=${+lat},${+lon}` : '';
export const konumHava = k => k || null;
export const varsayilan = VARSAYILAN_KONUM;

// ---- Nominatim ters adres ----
// Politika: en çok 1 istek/sn, toplu kullanım yok. Yalnız kullanıcı eylemiyle; sonuç 3 ondalıkla önbelleklenir.
let sonIstek = 0;
export async function tersAdres(lat, lon) {
  const anahtar = `mahal.adres.${(+lat).toFixed(3)},${(+lon).toFixed(3)}`;
  try { const o = JSON.parse(localStorage.getItem(anahtar)); if (o) return o; } catch { /* */ }
  const bekle = sonIstek + 1100 - Date.now(); if (bekle > 0) await new Promise(r => setTimeout(r, bekle));
  sonIstek = Date.now();
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${(+lat).toFixed(4)}&lon=${(+lon).toFixed(4)}&zoom=16&accept-language=tr${NOMINATIM_EMAIL ? '&email=' + encodeURIComponent(NOMINATIM_EMAIL) : ''}`;
    const r = await fetch(u); if (!r.ok) return null;
    const a = (await r.json()).address || {};
    const mahalle = a.suburb || a.neighbourhood || a.quarter || a.village || '';
    const ilce = a.city_district || a.town || a.county || a.city || '';
    const o = { mahalle, ilce, yol: a.road || '', il: a.province || a.state || 'Mersin' };
    o.metin = [mahalle, ilce !== mahalle ? ilce : '', 'Mersin'].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).join(', ');
    try { localStorage.setItem(anahtar, JSON.stringify(o)); } catch { /* */ }
    return o;
  } catch { return null; }
}
export const OSM_ATIF = '<small class="atif">Adres: © OpenStreetMap katkıcıları</small>';
