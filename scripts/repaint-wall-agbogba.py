"""Trial: repaint the unfinished wall areas in the Agbogba wardrobe photo.
Only pixels inside two hand-drawn wall regions are touched; the wardrobe, windows, switch,
socket, floor and ceiling are outside them. Inside a region, anything darker or more coloured
than the clean painted wall is replaced with the wall's own colour and shading, plus fine grain."""
import sys, numpy as np, cv2
src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src).astype(np.float32)
h, w = img.shape[:2]
rng = np.random.default_rng(7)

REGIONS = {
    'left':  dict(poly=[(0, 150), (328, 332), (328, 512), (248, 512), (248, 1742), (0, 1832)],
                  keep=[(0, 628, 118, 1352),      # window glass and bars
                        (172, 980, 250, 1048),     # light switch
                        (14, 1592, 70, 1688),      # socket
                        (88, 540, 150, 612)],      # curtain hook
                  cmax=14, linear=False),
    'right': dict(poly=[(1394, 205), (1500, 195), (1500, 1898), (1394, 1898)],
                  keep=[(1462, 632, 1500, 1345)],  # window
                  cmax=26, linear=True),
}
result = img.copy(); total = np.zeros((h, w), np.float32)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
for name, r in REGIONS.items():
    region = np.zeros((h, w), np.uint8); cv2.fillPoly(region, [np.array(r['poly'], np.int32)], 255)
    for x0, y0, x1, y1 in r['keep']: region[y0:y1, x0:x1] = 0
    reg = region > 0
    lum = img.mean(axis=2); chroma = img.max(axis=2) - img.min(axis=2)
    # clean painted wall = bright and nearly colourless
    clean = reg & (lum > 150) & (chroma < r['cmax'])
    clean = cv2.erode(clean.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    # the wall's shading: a smooth surface fitted to the clean pixels (per colour channel)
    terms = [np.ones_like(xx), xx / w, yy / h] + ([] if r['linear'] else [(yy / h) ** 2, (xx / w) * (yy / h)])
    X = np.stack(terms, axis=-1)
    A = X[clean]; fit = np.zeros_like(img)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, img[..., c][clean], rcond=None)
        fit[..., c] = X @ coef
    fit_l = fit.mean(axis=2)
    bad = reg & ((lum < fit_l - 10) | (chroma > r['cmax'] + 10))
    bad = cv2.morphologyEx(bad.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    bad = cv2.dilate(bad, np.ones((13, 13), np.uint8)) & region.astype(bool).astype(np.uint8)
    alpha = np.clip(cv2.GaussianBlur(bad.astype(np.float32), (0, 0), 9) * 1.25, 0, 1)
    alpha = np.minimum(alpha, cv2.GaussianBlur(reg.astype(np.float32), (0, 0), 2))  # never bleed outside the region
    # fine grain matched to the clean wall so the repaint is not perfectly flat
    resid = (img - fit)[clean]; sigma = float(np.clip(resid.std(), 1.0, 4.0))
    grain = cv2.GaussianBlur(rng.normal(0, sigma * 0.85, (h, w, 1)).astype(np.float32), (0, 0), 0.8)[..., None]
    paint = np.clip(fit + grain, 0, 255)
    a = alpha[..., None]
    result = result * (1 - a) + paint * a
    total = np.maximum(total, alpha)
    print(name, 'clean px', int(clean.sum()), 'repainted px', int((alpha > 0.5).sum()), 'grain sigma', round(sigma, 2))
cv2.imwrite(out, np.clip(result, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite(out.replace('.jpg', '-mask.png'), (total * 255).astype(np.uint8))
