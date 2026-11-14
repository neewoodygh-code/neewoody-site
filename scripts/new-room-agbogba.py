"""Trial: the Agbogba wardrobe in a different room.
The wardrobe is Adobe's cutout (unchanged pixels). The room behind it is redrawn on the photo's
own geometry: side walls in a new colour with no windows, a plank floor laid out to the photo's
vanishing point, a contact shadow under the plinth. The ceiling and the strip above the wardrobe
are the original photo."""
import sys, numpy as np, cv2
photo, cutout, out = sys.argv[1], sys.argv[2], sys.argv[3]
WALL = np.array(sys.argv[4].split(','), np.float32) if len(sys.argv) > 4 else np.array([138, 158, 150], np.float32)  # BGR
img = cv2.imread(photo).astype(np.float32)
cut = cv2.imread(cutout, cv2.IMREAD_UNCHANGED).astype(np.float32)
h, w = img.shape[:2]
rng = np.random.default_rng(11)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
bg = img.copy()

def poly_mask(pts, feather=1.2):
    m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather)

def noise(sigma, blur):
    return cv2.GaussianBlur(rng.normal(0, sigma, (h, w)).astype(np.float32), (0, 0), blur)

# ---- walls: flat paint with a gentle light falloff, darker toward the corners
def wall(pts, base, corner_x, light):
    m = poly_mask(pts)
    shade = light + 0.10 * (1 - yy / h) - 0.16 * np.exp(-np.abs(xx - corner_x) / 140.0)
    col = base[None, None, :] * (1 + shade)[..., None] + noise(2.2, 0.9)[..., None]
    return m, np.clip(col, 0, 255)
LEFT = [(0, 132), (338, 322), (338, 1722), (0, 1840)]
RIGHT = [(1390, 160), (1500, 146), (1500, 1908), (1390, 1902)]
for pts, corner, light in ((LEFT, 338, 0.02), (RIGHT, 1390, -0.07)):
    m, col = wall(pts, WALL, corner, light)
    bg = bg * (1 - m[..., None]) + col * m[..., None]

# ---- floor: planks running along the back wall, converging on the photo's left vanishing point
VP = np.array([-3492.0, 905.0])
FLOOR = [(0, 1840), (338, 1722), (1390, 1902), (1500, 1908), (1500, 2000), (0, 2000)]
fm = poly_mask(FLOOR)
# every floor pixel lies on a line through VP; identify that line by its height at x = 750
t = (750 - VP[0]) / np.maximum(xx - VP[0], 1.0)
y750 = VP[1] + (yy - VP[1]) * t
# plank index: boards get wider toward the camera (perspective), starting at the back wall
y0 = 1755.0
u = np.log1p(np.maximum(y750 - y0, 0) / 55.0) * 10.5
idx = np.floor(u).astype(np.int32)
frac = u - idx
tones = rng.normal(0, 1, 400).astype(np.float32)
plank_tone = tones[np.clip(idx, 0, 399)]
base_floor = np.array([150, 170, 186], np.float32)            # pale oak, BGR
grainv = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=38, sigmaY=1.1)
floor = base_floor[None, None, :] * (1 + 0.028 * plank_tone + 0.035 * grainv)[..., None]
seam = np.exp(-(np.minimum(frac, 1 - frac) / 0.035) ** 2)    # thin dark line between boards
floor *= (1 - 0.15 * seam)[..., None]
# end joints: each board is cut at its own random places
offs = rng.uniform(0, 900, 400).astype(np.float32)[np.clip(idx, 0, 399)]
period = 620.0 + 260.0 * tones[np.clip(idx + 7, 0, 399)] ** 2
joint = (np.mod(xx + offs, period) < 2.2).astype(np.float32)
floor *= (1 - 0.14 * cv2.GaussianBlur(joint, (0, 0), 0.7))[..., None]
floor *= (0.86 + 0.20 * np.clip((yy - 1700) / 300, 0, 1))[..., None]   # brighter toward the camera
floor += noise(1.6, 0.8)[..., None]
bg = bg * (1 - fm[..., None]) + np.clip(floor, 0, 255) * fm[..., None]

# ---- skirting along the foot of each side wall
for a, b in (((0, 1840), (338, 1722)), ((1390, 1902), (1500, 1908))):
    sk = np.zeros((h, w), np.uint8)
    cv2.fillPoly(sk, [np.array([a, b, (b[0], b[1] - 44), (a[0], a[1] - 52)], np.int32)], 255)
    skm = cv2.GaussianBlur(sk.astype(np.float32) / 255, (0, 0), 1.0)[..., None]
    bg = bg * (1 - skm) + np.array([226, 232, 234], np.float32) * skm

# ---- the wardrobe on top, with a soft shadow where it meets the floor and the left wall
alpha = cut[..., 3] / 255.0
shadow = cv2.GaussianBlur(alpha, (0, 0), 26)
shadow = np.roll(shadow, 14, axis=0) * 0.42 * np.clip(fm + poly_mask(LEFT) * 0.55, 0, 1)
bg *= (1 - shadow)[..., None]
res = bg * (1 - alpha[..., None]) + cut[..., :3] * alpha[..., None]
cv2.imwrite(out, np.clip(res, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
print('done', out)
