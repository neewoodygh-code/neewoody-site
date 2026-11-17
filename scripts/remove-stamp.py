"""Remove the old NW logo stamp from the Dansoman kitchen photos (2026-11-17).
The stamp sits in the bottom-left corner, so each photo is cut off just above it
(cut lines measured by eye per photo; a clone patch over the wood grain left a seam).
usage: python scripts/remove-stamp.py <originals folder> <output folder>
Needs opencv-python-headless (install outside the repo)."""
import sys, os, cv2
src_dir, out_dir = sys.argv[1:3]
for name, cut in [('dansoman-kitchen-island.jpg', 1190), ('dansoman-kitchen-overview.jpg', 1170),
                  ('dansoman-kitchen-layout.jpg', 1215)]:
    im = cv2.imread(os.path.join(src_dir, name))
    cv2.imwrite(os.path.join(out_dir, name), im[:cut], [cv2.IMWRITE_JPEG_QUALITY, 86])
