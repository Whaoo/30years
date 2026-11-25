import json, sys, numpy as np, cv2
data = json.load(open(sys.argv[1]))
tiles = []
for t in data:
    X, Z, Y, K = map(np.array, (t['X'], t['Z'], t['Y'], t['K']))
    x0, x1, z0, z1 = X.min() - 60, X.max() + 60, Z.min() - 60, Z.max() + 60
    sc = 440 / max(x1 - x0, z1 - z0)
    img = np.full((480, 480, 3), 245, np.uint8)
    P = lambda x, z: (int(20 + (x - x0) * sc), int(20 + (z - z0) * sc))
    if t.get('lake'):
        lk = t['lake']; cv2.circle(img, P(lk['x'], lk['z']), int(lk['r'] * sc), (230, 200, 160), -1)
    if t.get('pagoda'):
        cv2.circle(img, P(*t['pagoda']), 5, (60, 60, 200), -1)
    w = max(2, int(12 * sc))
    for i in range(len(X)):
        j = (i + 1) % len(X)
        k = min(1.0, abs(K[i]) / 0.05)
        col = (int(80 * (1 - k)), int(170 * (1 - k)), int(60 + 180 * k))
        cv2.line(img, P(X[i], Z[i]), P(X[j], Z[j]), col, w)
    cv2.circle(img, P(X[0], Z[0]), 6, (0, 0, 0), -1)
    cv2.arrowedLine(img, P(X[0], Z[0]), P(X[6], Z[6]), (0, 0, 0), 2, tipLength=0.5)
    cv2.putText(img, f"{t['id']}. {t['name']}"[:34], (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    cv2.putText(img, f"L {t['L']} m  rmin {t['rMin']}  gap {t['ecartMin']}  y {t['y']}", (8, 470), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (40, 40, 40), 1, cv2.LINE_AA)
    tiles.append(img)
while len(tiles) % 4: tiles.append(np.full((480, 480, 3), 255, np.uint8))
rows = [np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]
cv2.imwrite(sys.argv[2], np.vstack(rows))
