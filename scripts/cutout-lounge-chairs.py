"""Lounge chair cut-outs on bone (2026-11-23, redo after the first pass lost legs and a cushion end).
Mask: rembg birefnet-general (isnet-general-use dropped thin far legs). fix() removes two things the model kept:
a dark strap on the table under chair 1, and the pink fabric roll behind the seat of chair 3 (pixel boxes measured
on the 1500x2000 originals 1-4.jpg in the order the owner sent them: corner, side, other corner, pair).
Writes chairs/lounge-chair-N.jpg (site names) at 1600x2000, bone #efe9df, soft shadow from the feet. usage: python scripts/cutout-lounge-chairs.py <dir with 1-4.jpg>
Needs rembg, opencv-python-headless, Pillow, numpy (install outside the repo)."""
import sys, os, shutil
SITE = {"1": "1", "3": "2", "4": "3", "2": "4"}   # owner photo order -> site file number (3 = pair, 4 = side)
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
D = sys.argv[1]; os.chdir(D); os.makedirs("chairs", exist_ok=True)
sess = new_session("birefnet-general")
for k in "1234":
    shutil.copy(f"{k}.jpg", f"chairs/{k}.jpg"); im = Image.open(f"{k}.jpg").convert("RGB")
    remove(im, session=sess, only_mask=True).save(f"chairs/{k}-birefnet-general.png")
import numpy as np
from PIL import Image, ImageFilter
BONE=(239,233,223)
def fix(k,a):
    H,W=a.shape
    if k=='1':   # dark strap on the table under the seat (not part of the chair)
        for x in range(600,822):
            y0=int(1150+(248+(x-600)*2*85/445)/2)+2
            a[y0:1500,x]=0
        a[1365:1460,924:1080]=0
    if k=='3':   # pink fabric roll seen behind the seat cushion
        for x in range(780+65,780+430):
            if 780+298<=x<=780+360: continue
            yl=int(1050+75+(x-780-40)*25/390)-1
            a[1050+15:yl,x]=0
    return a
for k in '1234':
    im=np.array(Image.open(f'chairs/{k}.jpg').convert('RGB')).astype(np.float32)
    a=np.array(Image.open(f'chairs/{k}-birefnet-general.png').convert('L')).astype(np.float32)/255
    a=fix(k,a)
    a[a<0.06]=0
    ys,xs=np.where(a>0.5); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    im,a=im[y0:y1+1,x0:x1+1],a[y0:y1+1,x0:x1+1]
    h,w=a.shape; CW,CH=1600,2000
    s=min(CW*0.88/w, CH*0.70/h)
    nw,nh=int(w*s),int(h*s)
    cimg=Image.fromarray(im.astype(np.uint8)).resize((nw,nh),Image.LANCZOS)
    cal=Image.fromarray((a*255).astype(np.uint8)).resize((nw,nh),Image.LANCZOS)
    left=(CW-nw)//2; top=int(min(CH*0.86,(CH+nh)/2+CH*0.05))-nh   # tall chairs stand low, a wide pair sits near the middle
    bg=Image.new('RGB',(CW,CH),BONE)
    # floor shadow: soft patch over the area between the feet, plus a darker spot under each foot
    import cv2
    al=np.array(cal).astype(np.float32)/255
    feet=[]
    for x in range(nw):
        col=np.where(al[:,x]>0.5)[0]
        if len(col) and col.max()>nh*0.68 and (len(col)<3 or al[min(col.max()+3,nh-1),x]<0.5):
            feet.append((left+x, top+col.max()))
    sh=np.zeros((CH,CW),np.float32); con=np.zeros((CH,CW),np.float32)
    if feet:
        pts=np.array(feet,np.int32)
        hull=cv2.convexHull(pts)
        cv2.fillPoly(sh,[hull],0.16)
        for x,y in feet: con[y-3:y+5,x]=0.5
    sh=cv2.GaussianBlur(sh,(0,0),26)
    sh=np.maximum(sh,cv2.GaussianBlur(con,(0,0),6))
    b=np.array(bg).astype(np.float32)*(1-sh[...,None]*0.6)
    bg=Image.fromarray(b.clip(0,255).astype(np.uint8))
    bg.paste(cimg,(left,top),cal)
    bg.save(f'chairs/lounge-chair-{SITE[k]}.jpg',quality=84,optimize=True,progressive=True)
