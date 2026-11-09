// Şantiye günlüğü PDF'i (jsPDF) ve paylaşma. Türkçe karakterler için Roboto TTF gömülür.
import * as api from './api.js';
import { RENK, logoSvg } from './logo.js';
import { kvGet, kvSet, trTarih } from './util.js';
import { havaMetni } from './hava.js';

const JSPDF = 'lib/jspdf.umd.min.js';   // cdnjs jspdf 2.5.1 (SRI sha512-qZvrmS2e... doğrulandı), yerelden sunulur
const FONT = { normal: 'lib/Roboto_400Regular.ttf', bold: 'lib/Roboto_700Bold.ttf' };   // npm @expo-google-fonts/roboto@0.2.3

const betikYukle = src => window.jspdf ? Promise.resolve() : new Promise((ok, hata) => {
  const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => hata(new Error('PDF kütüphanesi yüklenemedi '));
  document.head.append(s);
});
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
async function fontAl(tur) {
  const k = 'font:' + tur;
  let v = await kvGet(k);
  if (!v) { const r = await fetch(FONT[tur]); if (!r.ok) throw new Error('Yazı tipi alınamadı'); v = b64(await r.arrayBuffer()); await kvSet(k, v); }
  return v;
}
const resimYukle = src => new Promise((ok, hata) => { const i = new Image(); i.onload = () => ok(i); i.onerror = hata; i.src = src; });
async function logoPng() {
  const svg = logoSvg({ orman: RENK.keten, bronz: RENK.bronzAcik, boyut: 256 });
  const img = await resimYukle('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const c = document.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').drawImage(img, 0, 0, 256, 256);
  return c.toDataURL('image/png');
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export async function gunlukPdf(g, proje) {
  await betikYukle(JSPDF);
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Roboto-Regular.ttf', await fontAl('normal')); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', await fontAl('bold')); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  const W = 210, M = 16, EN = W - 2 * M; let y = 0;

  // Başlık bandı
  doc.setFillColor(...hex(RENK.orman)); doc.rect(0, 0, W, 30, 'F');
  doc.addImage(await logoPng(), 'PNG', M, 7, 16, 16);
  doc.setTextColor(...hex(RENK.keten)); doc.setFont('Roboto', 'bold'); doc.setFontSize(20); doc.text('Mahal', M + 21, 16);
  doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.text('Yapı Stüdyosu', M + 21, 21.5);
  doc.setFontSize(11); doc.text('ŞANTİYE GÜNLÜĞÜ', W - M, 16, { align: 'right' });
  y = 40;

  const sayfaKontrol = h => { if (y + h > 280) { doc.addPage(); y = 20; } };
  doc.setTextColor(...hex(RENK.orman)); doc.setFont('Roboto', 'bold'); doc.setFontSize(15);
  doc.text(proje?.ad || 'Proje', M, y); y += 7;
  doc.setFont('Roboto', 'normal'); doc.setFontSize(10); doc.setTextColor(70, 70, 70);
  const bilgi = [`Tarih: ${trTarih(g.tarih, true)}  ·  Saat: ${g.saat || ''}`, `Hava: ${havaMetni(g.hava)}`, proje?.adres ? `Adres: ${proje.adres}` : '', g.lat !== undefined && g.lat !== '' && g.lat != null ? `Konum: ${g.adresMetni ? g.adresMetni + ' ' : ''}(${g.lat}, ${g.lon})` : '', g.yazan ? `Kaydeden: ${g.yazan}` : ''].filter(Boolean);
  for (const s of bilgi) for (const sat of doc.splitTextToSize(s, EN)) { doc.text(sat, M, y); y += 5; }
  y += 3; doc.setDrawColor(...hex(RENK.bronz)); doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 8;

  for (const [baslik, metin] of [['Yapılanlar', g.yapilanlar], ['Çalışanlar', g.calisanlar], ['Yarın', g.yarin], ['Notlar', g.notlar]]) {
    if (!metin) continue;
    const satirlar = doc.splitTextToSize(metin, EN);
    sayfaKontrol(14);
    doc.setFont('Roboto', 'bold'); doc.setFontSize(11); doc.setTextColor(...hex(RENK.bronz)); doc.text(baslik.toUpperCase('tr'), M, y); y += 5.5;
    doc.setFont('Roboto', 'normal'); doc.setFontSize(10.5); doc.setTextColor(30, 30, 30);
    for (const s of satirlar) { sayfaKontrol(6); doc.text(s, M, y); y += 5.2; }
    y += 5;
  }

  // Fotoğraflar: yan yana iki sütun
  const fotolar = (g.fotolar || []);
  if (fotolar.length) {
    sayfaKontrol(20);
    doc.setFont('Roboto', 'bold'); doc.setFontSize(11); doc.setTextColor(...hex(RENK.bronz)); doc.text('FOTOĞRAFLAR', M, y); y += 6;
    const gen = (EN - 6) / 2; let sutun = 0, satirYuk = 0;
    for (const ref of fotolar) {
      const u = await api.fotoAl(ref); if (!u) continue;
      const im = await resimYukle(u); let w = gen, h = w * im.height / im.width;
      if (h > 75) { h = 75; w = h * im.width / im.height; }
      if (sutun === 0) { sayfaKontrol(h + 4); satirYuk = 0; }
      doc.addImage(u, 'JPEG', M + sutun * (gen + 6), y, w, h);
      satirYuk = Math.max(satirYuk, h);
      if (sutun === 1) { y += satirYuk + 6; sutun = 0; } else sutun = 1;
    }
    if (sutun === 1) y += satirYuk + 6;
  }

  // Alt bilgi
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text('Mahal Yapı Stüdyosu · Mersin' + (g.adresMetni ? ' · Adres: © OpenStreetMap katkıcıları' : ''), M, 289); doc.text(`${i} / ${n}`, W - M, 289, { align: 'right' });
  }
  return doc.output('blob');
}

export const pdfAdi = (g, proje) => `Mahal-gunluk-${(proje?.ad || 'proje').toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşıöç]+/gi, '-').replace(/-+$/, '')}-${g.tarih}.pdf`;

export function indir(blob, ad) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
export async function paylas(blob, ad, baslik) {
  const dosya = new File([blob], ad, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [dosya] })) { await navigator.share({ files: [dosya], title: baslik }); return true; }
  indir(blob, ad); return false;
}
export const waBag = m => `https://wa.me/?text=${encodeURIComponent(m)}`;
export const postaBag = (konu, m) => `mailto:?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(m)}`;
