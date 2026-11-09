// Ekleme/düzenleme ekranı iskeleti: şema + koleksiyon adı yeter.
import * as api from './api.js';
import { formHtml, formBaglan, formOku } from './form.js';
import { bildir } from './util.js';

export function formEkrani(kap, { kol, sema, kayit = {}, ctx, geri, sonra, ek = '', once }) {
  kap.innerHTML = `<form class="form" novalidate>${formHtml(sema, kayit, ctx)}${ek}
    <div class="sira alt-sira"><button class="dugme" type="submit">Kaydet</button>${kayit.id ? '<button type="button" class="dugme tehlike" data-sil>Sil</button>' : ''}</div></form>`;
  const f = kap.querySelector('form');
  formBaglan(f);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    const yeni = { ...kayit, ...formOku(f, sema) };
    if (once && once(yeni) === false) return;
    const k = await api.kaydet(kol, yeni);
    bildir('Kaydedildi'); ctx.git(sonra ? sonra(k) : geri);
  });
  f.querySelector('[data-sil]')?.addEventListener('click', async () => {
    if (!confirm('Bu kayıt silinsin mi?')) return;
    await api.sil(kol, kayit.id); ctx.git(geri);
  });
  return f;
}
