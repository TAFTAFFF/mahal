// Open-Meteo (anahtarsız) ile anlık hava.
const KODLAR = [[0, 'Açık'], [2, 'Az bulutlu'], [3, 'Kapalı'], [48, 'Sisli'], [57, 'Çiseleme'], [67, 'Yağmurlu'], [77, 'Karlı'], [82, 'Sağanak yağışlı'], [86, 'Kar sağanağı'], [99, 'Gök gürültülü fırtına']];
export const havaAdi = k => (KODLAR.find(([son]) => k <= son) || [0, '—'])[1];

export async function havaAl(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${(+lat).toFixed(2)}&longitude=${(+lon).toFixed(2)}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('Hava alınamadı');
  const c = (await r.json()).current;
  return { sicaklik: Math.round(c.temperature_2m), durum: havaAdi(c.weather_code), ruzgar: Math.round(c.wind_speed_10m) };
}
export const havaMetni = h => h ? `${h.sicaklik}°C, ${h.durum}, rüzgâr ${h.ruzgar} km/sa` : 'Hava bilgisi yok';
