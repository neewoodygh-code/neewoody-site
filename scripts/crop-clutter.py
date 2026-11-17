"""Crop clutter off the edge of two photos (2026-11-17, owner: "fix any bad photos").
zoe-front-closed: clothes rail beside the Cantonments wardrobe (left edge).
golf-hills-installed-1: broom and dish rack at the right edge.
Crops are fractions of width/height, measured by eye. usage: python scripts/crop-clutter.py <originals> <out>"""
import sys, os
from PIL import Image, ImageOps
src, out = sys.argv[1:3]
for name, (l, t, r, b) in {
    'zoe-front-closed.jpg': (.211, .03, .83, .955),
    'golf-hills-installed-1.jpg': (.0, .0, .735, .932),
}.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(src, name))).convert('RGB')
    w, h = im.size
    im.crop((round(l * w), round(t * h), round(r * w), round(b * h))).save(
        os.path.join(out, name), quality=86, optimize=True)

# zoe-front-closed: after the crop a 10 px sliver of rug remained at the bottom-left
# (x 0-10, y 1512-1618); it was covered with the plain floor from directly below it.
import numpy as np
p = os.path.join(out, 'zoe-front-closed.jpg')
a = np.array(Image.open(p)); a[1512:1618, :11] = a[1640:1746, :11]
Image.fromarray(a).save(p, quality=86, optimize=True)
