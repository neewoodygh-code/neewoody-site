"""Lay the real wardrobe cutout over a generated room.
usage: python composite-room.py <generated-room image> <cutout.png (RGBA, same framing as the reference sent)> <out.jpg>
The generated room is scaled to the cutout's size and the cutout's own pixels are pasted on top,
so the piece shown is the real photograph. The cutout edge is pulled in by a pixel and softened
so no light fringe from the old background shows."""
import sys
from PIL import Image, ImageFilter
room, cut, out = sys.argv[1], sys.argv[2], sys.argv[3]
c = Image.open(cut).convert('RGBA')
r = Image.open(room).convert('RGB').resize(c.size, Image.LANCZOS)
a = c.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
r.paste(c.convert('RGB'), (0, 0), a)
r.save(out, quality=92)
print('saved', out, r.size)
