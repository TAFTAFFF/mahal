# Uygulama ikonlarını üretir: python uret.py  (PIL gerekir)
from PIL import Image, ImageDraw
import math
ORMAN=(0x24,0x35,0x2B); KETEN=(0xE7,0xE3,0xD6); BRONZ=(0xCD,0xB2,0x87)
S=4  # süper örnekleme
def ikon(boyut, maske=False):
    N=boyut*S
    im=Image.new('RGB',(N,N),ORMAN); d=ImageDraw.Draw(im)
    # işaret kutusu: ikonun %56'sı (maskeli ikonda güvenli alan)
    k=N*0.56; ox=oy=(N-k)/2; u=k/100
    P=lambda x,y:(ox+x*u,oy+y*u)
    def poly(pts,c): d.polygon([P(*p) for p in pts],fill=c)
    def arc_pts(cx,cy,r,a0,a1,n=60):
        return [(cx+r*math.cos(math.radians(a0+(a1-a0)*i/n)),cy+r*math.sin(math.radians(a0+(a1-a0)*i/n))) for i in range(n+1)]
    # kapı: dikdörtgen 0..47, içinde kemerli boşluk
    kapi=[(0,0),(47,0),(47,47),(35,47),(35,23.5)]+arc_pts(23.5,23.5,11.5,0,-180)[::1]+[(12,47),(0,47)]
    poly(kapi,KETEN)
    # çeyrek daire
    poly([(53,47),(53,0)]+arc_pts(53,47,47,-90,0)+[(100,47)],KETEN)
    # halka
    for r,c in ((23.5,BRONZ),(9,ORMAN)):
        x,y=P(23.5,76.5); d.ellipse([x-r*u,y-r*u,x+r*u,y+r*u],fill=c)
    for r in (53,71,89):
        pass
    for (x0,y0,x1,y1) in ((53,53,100,64),(53,71,100,82),(53,89,82,100)):
        a=P(x0,y0); b=P(x1,y1); d.rectangle([a,b],fill=KETEN)
    return im.resize((boyut,boyut),Image.LANCZOS)
for b in (192,512): ikon(b).save(f'ikon-{b}.png')
ikon(180).save('apple-touch-icon.png')
print('tamam')
