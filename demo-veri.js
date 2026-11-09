// Yerel deneme modunun örnek verisi. Hepsi UYDURMADIR; gerçek kişi/müşteri içermez.
const bugun = new Date().toISOString().slice(0, 10);
export const DEMO_KULLANICI = { kullanici: 'demo', sifre: 'demo', ad: 'Demo Ortak' };
export const DEMO_ORTAKLAR = ['Ortak 1', 'Ortak 2', 'Ortak 3', 'Ortak 4'];
export const DEMO_VERI = {
  projeler: [
    { id: 'p1', ad: 'Örnek Villa Bahçesi', musteri: 'Örnek Müşteri A', adres: 'Örnek Mah. 1. Sk. No:1, Yenişehir', lat: 36.78, lon: 34.58, tur: 'Peyzaj', asama: 'uygulama', sorumlu: 'Ortak 1' },
    { id: 'p2', ad: 'Örnek Site Girişi', musteri: 'Örnek Müşteri B', adres: 'Örnek Cad. 2, Mezitli', lat: 36.76, lon: 34.53, tur: 'Mimari', asama: 'tasarim', sorumlu: 'Ortak 2' },
    { id: 'p3', ad: 'Örnek Ofis Tadilatı', musteri: 'Örnek Müşteri C', adres: 'Örnek Bulvarı 3, Yenişehir', lat: 36.79, lon: 34.6, tur: 'Mekân tasarımı', asama: 'teklif', sorumlu: 'Ortak 3' },
  ],
  rehber: [
    { id: 'r1', ad: 'Örnek Usta', is: 'Sıvacı', telefon: '0555 000 00 00', not: 'Uydurma kayıt.', puan: 4, projeler: ['p1'] },
    { id: 'r2', ad: 'Örnek Elektrikçi', is: 'Elektrikçi', telefon: '0555 000 00 01', not: 'Uydurma kayıt.', puan: 5, projeler: ['p1', 'p3'] },
    { id: 'r3', ad: 'Örnek Bahçıvan', is: 'Bahçıvan', telefon: '0555 000 00 02', not: 'Uydurma kayıt.', puan: 3, projeler: [] },
  ],
  gorevler: [
    { id: 'g1', projeId: 'p1', baslik: 'Sulama hattı kontrolü', sorumlu: 'Ortak 1', tarih: bugun, tamam: false },
    { id: 'g2', projeId: 'p2', baslik: 'Giriş kapısı çizimlerini gönder', sorumlu: 'Ortak 2', tarih: bugun, tamam: false },
  ],
  odemeler: [
    { id: 'soz-p1', projeId: 'p1', tur: 'sozlesme', tutar: 250000, tarih: bugun, aciklama: 'Sözleşme tutarı' },
    { id: 'o1', projeId: 'p1', tur: 'alinan', tutar: 100000, tarih: bugun, aciklama: 'İlk taksit' },
    { id: 'o2', projeId: 'p1', tur: 'usta', tutar: 18000, tarih: bugun, aciklama: 'Örnek Usta hakediş', ustaId: 'r1' },
  ],
  ornekler: [
    { id: 'e1', kategori: 'Pergola/gölgelik', baslik: 'Örnek pergola detayı', aciklama: 'Uydurma örnek kayıt.', malzeme: 'Ahşap', tedarikciAd: 'Örnek Marangoz', tedarikciId: 'pzdemo05', kaynakUrl: 'https://ornek.invalid/pergola', gorsel: '', etiketler: ['demo'] },
    { id: 'e2', kategori: 'Dış aydınlatma', baslik: 'Örnek bahçe aydınlatması', aciklama: 'Uydurma örnek kayıt.', malzeme: 'Alüminyum', kaynakUrl: 'https://ornek.invalid/aydinlatma', gorsel: '' },
  ],
  gunluk: [
    { id: 'j1', projeId: 'p1', tarih: bugun, saat: '10:30', hava: { sicaklik: 22, durum: 'Açık', ruzgar: 8 }, yapilanlar: 'Zemin hazırlığı yapıldı, şev düzeltildi.', calisanlar: 'Örnek Usta + 2 işçi', yarin: 'Sulama borularının serilmesi', notlar: 'Aydınlatma için kablo payı bırakıldı.', fotolar: [], yazan: 'Demo Ortak' },
  ],
};

// Rehber (pazar) için YALNIZCA sahte kayıtlar. Gerçek liste web/yerel/rehber-pazar.json'dadır (git dışı).
const P = (n, grup, ad, alan, ilce, tel, ek = {}) => ({ id: 'pzdemo' + n, grup, ad, alan, ilce, tel, adres: `Örnek Mah. ${n}. Sk., ${ilce}`, ...ek });
export const DEMO_PAZAR = [
  P('01', 'İnce İşler', 'Örnek Boya Ustası', 'alçı/sıva/boya', 'Yenişehir', '0555 000 01 01', { dogrulama: 'örnek doğrulama' }),
  P('02', 'İnce İşler', 'Örnek Fayans Ustası', 'fayans/seramik', 'Mezitli', '0555 000 01 02 / 0324 000 01 02'),
  P('03', 'İnce İşler', 'Örnek Parke Ustası', 'parke/zemin', 'Akdeniz', '0324 000 01 03'),
  P('04', 'İnce İşler', 'Örnek Mermer Atölyesi', 'mermer/granit', 'Toroslar', '0555 000 01 04', { isaret: 'örnek işaret metni: numara başka firmada da geçiyor, kontrol edin' }),
  P('05', 'İnce İşler', 'Örnek Marangoz', 'marangoz/ahşap/mobilya/mutfak', 'Yenişehir', '0555 000 01 05', { web: 'https://ornek.invalid' }),
  P('06', 'Teknik-Metal', 'Örnek Ferforje', 'demir/çelik/ferforje', 'Tarsus', '0555 000 01 06'),
  P('07', 'Teknik-Metal', 'Örnek Sulama Sistemleri', 'sulama sistemleri', 'Erdemli', ''),
  P('08', 'Mimarlık-İnşaat', 'Örnek Peyzaj Mimarlığı', 'peyzaj mimarlığı', 'Mezitli', '0555 000 01 08'),
  P('09', 'Mimarlık-İnşaat', 'Örnek İnşaat Taahhüt', 'inşaat/taahhüt', 'Silifke', ''),
  P('10', 'Mimarlık-İnşaat', 'Örnek Mimarlık Ofisi', 'mimarlık ofisi', 'Merkez/belirtilmemiş', '', { web: 'https://ornek.invalid/ofis' }),
];
