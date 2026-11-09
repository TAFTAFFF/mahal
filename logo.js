// Mahal logo işareti (100x100 kutu). Renkler marka renkleridir.
export const RENK = { orman: '#24352B', keten: '#E7E3D6', bronz: '#8A6A3A', bronzAcik: '#CDB287' };

export function logoSvg({ orman = RENK.orman, bronz = RENK.bronz, boyut = 32 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${boyut}" height="${boyut}" aria-hidden="true">
<path fill="${orman}" d="M0 0H47V47H35V23.5A11.5 11.5 0 0 0 12 23.5V47H0Z"/>
<path fill="${orman}" d="M53 47V0A47 47 0 0 1 100 47Z"/>
<path fill="${bronz}" fill-rule="evenodd" d="M0 76.5A23.5 23.5 0 1 1 47 76.5A23.5 23.5 0 1 1 0 76.5ZM14.5 76.5A9 9 0 1 0 32.5 76.5A9 9 0 1 0 14.5 76.5Z"/>
<path fill="${orman}" d="M53 53H100V64H53ZM53 71H100V82H53ZM53 89H82V100H53Z"/>
</svg>`;
}
