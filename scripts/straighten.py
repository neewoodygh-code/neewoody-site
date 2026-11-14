"""Measure and correct lean in a photo from its own vertical lines.
measure(img) -> (roll, keystone, n): roll = average lean of verticals (dx/dy), keystone = how fast
that lean changes across the frame (converging walls). correct() removes the roll and part of the
keystone, then crops back to the original shape. Nothing else in the picture is altered."""
import sys, math
import numpy as np, cv2

def measure(bgr):
    h, w = bgr.shape[:2]
    s = 1200 / max(h, w)
    g = cv2.cvtColor(cv2.resize(bgr, None, fx=s, fy=s), cv2.COLOR_BGR2GRAY)
    g = cv2.GaussianBlur(g, (3, 3), 0)
    lines = cv2.createLineSegmentDetector().detect(g)[0]
    if lines is None: return 0, 0, 0
    H, W = g.shape
    xs, sl, wt = [], [], []
    for x1, y1, x2, y2 in np.asarray(lines).reshape(-1, 4):
        dy = y2 - y1; dx = x2 - x1
        L = math.hypot(dx, dy)
        if L < 0.07 * H or abs(dy) < 1e-3: continue
        slope = dx / dy                       # 0 = perfectly vertical
        if abs(slope) > math.tan(math.radians(14)): continue
        xs.append(((x1 + x2) / 2 - W / 2) / s); sl.append(slope); wt.append(L)
    if len(xs) < 12: return 0, 0, len(xs)
    xs, sl, wt = map(np.array, (xs, sl, wt))
    a, c = 0.0, 0.0
    for _ in range(6):                        # robust weighted line fit: slope = a + c*x
        r = sl - (a + c * xs)
        k = wt / (1 + (r / 0.02) ** 2)
        A = np.vstack([np.ones_like(xs), xs]).T * k[:, None]
        a, c = np.linalg.lstsq(A, sl * k, rcond=None)[0]
    return float(a), float(c), len(xs)

def warp_matrix(w, h, roll, key):
    cx, cy = w / 2, h / 2
    T = np.array([[1, 0, -cx], [0, 1, -cy], [0, 0, 1]], float)
    Ti = np.array([[1, 0, cx], [0, 1, cy], [0, 0, 1]], float)
    th = math.atan(roll)
    R = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
    P = np.array([[1, 0, 0], [0, 1, 0], [0, key, 1]], float)
    return Ti @ P @ R @ T

def correct(bgr, key_strength=0.75, max_roll_deg=4.0, max_loss=0.14):
    h, w = bgr.shape[:2]
    roll, key, n = measure(bgr)
    if n < 12: return bgr, dict(n=n, note='too few lines, left alone')
    roll = max(-math.tan(math.radians(max_roll_deg)), min(math.tan(math.radians(max_roll_deg)), roll))
    best = None
    for sr in (1, -1):                        # try both sign conventions, keep whichever truly straightens
        for sk in (1, -1):
            M = warp_matrix(w, h, sr * roll, sk * key * key_strength)
            out = cv2.warpPerspective(bgr, M, (w, h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
            r2, k2, _ = measure(out)
            score = abs(r2) + abs(k2) * w / 2
            if best is None or score < best[0]: best = (score, M, r2, k2)
    before = abs(roll) + abs(key) * w / 2
    score, M, r2, k2 = best
    info = dict(n=n, roll_deg=round(math.degrees(math.atan(roll)), 2), edge_lean_deg=round(math.degrees(math.atan(key * w / 2)), 2),
                after_roll_deg=round(math.degrees(math.atan(r2)), 2), after_edge_deg=round(math.degrees(math.atan(k2 * w / 2)), 2))
    if before < math.tan(math.radians(0.35)): return bgr, dict(info, note='already straight')
    if score > before * 0.75: return bgr, dict(info, note='no clear improvement, left alone')
    # crop to the largest same-shape rectangle that holds no stretched border
    pts = cv2.perspectiveTransform(np.float32([[[0, 0]], [[w, 0]], [[w, h]], [[0, h]]]), M)[:, 0]
    left = max(pts[0][0], pts[3][0], 0); right = min(pts[1][0], pts[2][0], w)
    top = max(pts[0][1], pts[1][1], 0); bot = min(pts[2][1], pts[3][1], h)
    cw, ch = right - left, bot - top
    sc = min(cw / w, ch / h)
    if sc < 1 - max_loss: return bgr, dict(info, note='would crop too much, left alone')
    nw, nh = w * sc, h * sc
    x0 = left + (cw - nw) / 2; y0 = top + (ch - nh) / 2
    out = cv2.warpPerspective(bgr, M, (w, h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    crop = out[int(round(y0)):int(round(y0 + nh)), int(round(x0)):int(round(x0 + nw))]
    return cv2.resize(crop, (w, h), interpolation=cv2.INTER_LANCZOS4), dict(info, kept=round(sc, 3), note='straightened')

def tone(bgr, wb=0.0, lift=0.0):
    """Optional: partial neutral white balance and a shadow lift. Wood colour is left alone unless wb > 0."""
    a = bgr[:, :, ::-1].astype(np.float32) / 255
    if wb:
        lum = a.mean(axis=2); chroma = a.max(axis=2) - a.min(axis=2)
        m = (lum > np.percentile(lum, 60)) & (chroma < np.percentile(chroma, 40))
        ref = a[m].mean(axis=0); a = a * (1 + wb * (ref.mean() / ref - 1))
    if lift: a = a + lift * a * (1 - a) ** 2 * 2
    return (np.clip(a, 0, 1)[:, :, ::-1] * 255 + 0.5).astype(np.uint8)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        img = cv2.imread(p)
        out, info = correct(img)
        print(p.split('/')[-1], info)
