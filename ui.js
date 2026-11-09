// Ortak arayüz parçaları.
import { esc } from './util.js';

export const ASAMALAR = [['kesif', 'Keşif'], ['teklif', 'Teklif'], ['tasarim', 'Tasarım'], ['uygulama', 'Uygulama'], ['teslim', 'Teslim']];
export const asamaAdi = k => (ASAMALAR.find(a => a[0] === k) || [0, k || '—'])[1];
export const TURLER = ['Mimari', 'Peyzaj', 'Mekân tasarımı', 'Uygulama', 'Diğer'];
export const ILCELER = ['Yenişehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus', 'Erdemli', 'Silifke'];
export const ETIKETLER = ['Sıvacı', 'Sac bükmeci', 'Elektrikçi', 'Bahçıvan', 'Nakliye', 'Boyacı', 'Demirci', 'Marangoz', 'Tesisatçı', 'Seramikçi', 'Diğer'];

const yol = {
  ev: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  klasor: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  defter: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9 8h7M9 12h7',
  kisi: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  daha: 'M5 12h.01M12 12h.01M19 12h.01',
  tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  wa: 'M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.5z',
  artı: 'M12 5v14M5 12h14',
  pdf: 'M7 3h7l5 5v13H7zM14 3v5h5',
  paylas: 'M12 3v12M8 7l4-4 4 4M5 13v7h14v-7',
  yildiz: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z',
  yol: 'M4 11.5L20 4l-7.5 16-2-6.5z',
  web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  kamera: 'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  gorev: 'M5 12.5l4.5 4.5L19 7.5',
  yakin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  odeme: 'M3 7h18v11H3zM3 11h18M7 15h3',
  yukari: 'M12 19V6M6 11l6-6 6 6',
  kisiEkle: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 21a7.5 7.5 0 0 1 15 0M19 8v6M16 11h6',
  ornek: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
};
export const ikon = (ad, b = 22) => `<svg class="ik" width="${b}" height="${b}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${yol[ad]}"/></svg>`;

export const bos = m => `<p class="bos">${esc(m)}</p>`;
export const rozet = (m, sinif = '') => `<span class="rozet ${sinif}">${esc(m)}</span>`;
export const yildiz = p => p ? `<span class="yildiz" aria-label="${p} puan">${'★'.repeat(p)}<i>${'★'.repeat(5 - p)}</i></span>` : '';
export const projeAdi = (ctx, id) => ctx.projeler.find(p => p.id === id)?.ad || '—';
export const ekle = href => `<a class="fab" href="${href}" aria-label="Yeni ekle">${ikon('artı', 26)}</a>`;
export function onayla(m) { return confirm(m); }
