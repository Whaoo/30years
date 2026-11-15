# Bandes-son des trois cinématiques d'épisode (chapitres 2, 3 et 4), synthétisées en numpy avec les
# instruments du prologue (st3_head.py). Usage : python3 soundtrack_eps.py <2|3|4> sortie.wav
import sys, re
EP = int(sys.argv[1]); OUT = sys.argv[2]
DURS = {2: 62.0, 3: 62.0, 4: 64.0}
import os
src = open('st3_head.py' if os.path.exists('st3_head.py') else 'soundtrack3.py').read()
src = src.split('# ================================================================ INTRO v3')[0]
src = re.sub(r'DUR = [0-9.]+', f'DUR = {DURS[EP]}', src)
exec(src)

def reverb(x, d=2.4, seed=3, wet=0.22):
    r = np.random.RandomState(seed); n = int(d * SR); tir = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.randn(n) * np.exp(-tir * 3.0 / d * 2.3)
        ir = filt(ir, 'lowpass', 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[c] = x[c] + wet * fftconvolve(x[c], ir)[:x.shape[1]]
    return out

THEME = [('F#5', 2), ('A5', 1), ('D6', 2), ('C#6', 1), ('B5', 1), ('A5', 1), ('G5', 1), ('E5', 3)]
VOICES = {'yeti': (95, (420, 800)), 'maire': (150, (600, 1100)), 'flocon': (250, (700, 1500)), 'cheffe': (330, (800, 1700)),
          'mamie': (205, (650, 1250)), 'bonhomme': (115, (500, 900))}
def babble(a, b, who, amp=0.07, pan=0.0):
    """Babillage pendant un sous-titre (le texte s'écrit pendant ~60 % du temps)."""
    f0, (F1, F2) = VOICES[who]; r = np.random.RandomState(int(a * 100))
    t = a + 0.1; end = a + (b - a) * 0.62
    while t < end:
        vow = (F1 * (0.8 + r.rand() * 0.5), F2 * (0.8 + r.rand() * 0.5))
        place(sfx, t, blip(f0 * (0.9 + r.rand() * 0.25), vow, 0.06 + r.rand() * 0.04), amp, pan)
        t += 0.075 + r.rand() * 0.05
        if r.rand() < 0.12: t += 0.16

def chapter(t0=0.0):  # la page du livre : boîte à musique et nappe
    place(sfx, t0 + 0.2, filt(noise(1.2), 'bandpass', [1200, 5000]) * env_ar(int(1.2 * SR), 0.1, 0.8), 0.05)
    chord(['D3', 'A3', 'F#4'], t0, 6.0, pad, 0.03, a=1.5)
    seq(THEME, t0 + 0.6, 0.6, musicbox, 0.07, 0.2)

def shard_get(t0, t1):  # l'éclat s'envole et rejoint l'écharpe
    place(sfx, t0, whoosh(t1 - t0 + 0.2, 500, 3200, 0.6), 0.16)
    for j, n in enumerate(['A5', 'D6', 'F#6', 'A6', 'D7']): place(music, t1 + j * 0.06, bell(hz(n), 2.2), 0.06, (j - 2) * 0.25)
    place(sfx, t1, cymbal(1.8), 0.04)

def victory(t0, d):  # musique de victoire, chaleureuse
    chord(['D3', 'A3', 'D4', 'F#4'], t0, 4.2, strings, 0.05, a=0.6)
    chord(['G2', 'D3', 'B3', 'G4'], t0 + 4.0, 4.2, strings, 0.05)
    chord(['A2', 'E3', 'C#4', 'A4'], t0 + 8.0, d - 8.0, strings, 0.05)
    seq([('D4', 1), ('F#4', 1), ('A4', 2), ('D5', 3)], t0 + 3.2, 0.32, brass, 0.05)
    seq(THEME, t0 + 5.0, 0.42, flute, 0.04, -0.15)

def map_leg(t0, d):  # le voyage sur la carte : arpèges, flûte, petits pas
    place(sfx, t0 + 0.1, filt(noise(1.0), 'bandpass', [1200, 5000]) * env_ar(int(1.0 * SR), 0.1, 0.7), 0.05)
    chord(['D3', 'A3', 'C#4', 'F#4'], t0, d / 2 + 0.3, strings, 0.04, a=0.8)
    chord(['B2', 'F#3', 'A3', 'D4'], t0 + d / 2, d / 2, strings, 0.04)
    i = 0
    while t0 + 0.3 + i * 0.36 < t0 + d - 0.6:
        base = ['D5', 'F#5', 'A5', 'C#6', 'E6', 'C#6', 'A5', 'F#5']
        place(music, t0 + 0.3 + i * 0.36, pluck(hz(base[i % 8]), 1.0, bright=1.3, decay=3.2), 0.045, (i % 4 - 1.5) * 0.3); i += 1
    for k in range(9): place(sfx, t0 + 1.4 + k * 0.5, pop(700 + (k % 2) * 120, 0.08), 0.03)
    place(music, t0 + 6.0, bell(hz('A6'), 2.0), 0.06, 0.2)

def tension(t0, d, key=('D2', 'A2', 'D3', 'F3')):  # le dérèglement : mineur, graves, pizzicati
    chord(list(key), t0, d, strings, 0.055, a=1.2)
    place(music, t0 + 0.4, timpani(hz('D2'), 2.0), 0.14)
    i = 0
    while t0 + 0.6 + i * 0.5 < t0 + d - 0.5:
        place(music, t0 + 0.6 + i * 0.5, pluck(hz(['D3', 'F3', 'A3', 'C#4'][i % 4]) / 2, 0.35, bright=0.8, decay=7), 0.06, (i % 2 - 0.5) * 0.4); i += 1

def arrival(t0, d):  # l'arrivée : l'espoir revient
    chord(['B2', 'F#3', 'D4'], t0, 4.4, strings, 0.045, a=1.0)
    chord(['G2', 'D3', 'B3'], t0 + 4.2, 4.4, strings, 0.045)
    chord(['A2', 'E3', 'C#4', 'E4'], t0 + 8.4, d - 8.4, strings, 0.05)
    for i in range(int(d / 0.42)): place(music, t0 + 0.4 + i * 0.42, pluck(hz(['B4', 'D5', 'F#5', 'D5'][i % 4]), 0.8, bright=1.0, decay=3.5), 0.035, 0.3)

def title(t0, d, heroic=False):  # le titre doré
    place(sfx, t0 + 0.2, cymbal(2.5, swell=True), 0.07)
    chord(['D3', 'A3', 'D4', 'F#4', 'A4'], t0 + 0.8, d - 0.8, strings, 0.055, a=0.3)
    chord(['D3', 'F#3', 'A3', 'D4'], t0 + 0.8, 2.6, brass, 0.06)
    if heroic: place(music, t0 + 0.8, timpani(hz('D2'), 2.4), 0.25)
    for j, n in enumerate(['D6', 'F#6', 'A6', 'D7']): place(music, t0 + 0.85 + j * 0.07, bell(hz(n), 2.4), 0.05, (j - 1.5) * 0.3)
    seq([('A4', 1), ('D5', 1), ('F#5', 1), ('A5', 3)], t0 + 2.4, 0.3, brass, 0.05)
    for i in range(10): place(sfx, t0 + 2.4 + i * 0.42, jingle(0.3), 0.05, (i % 2 - 0.5) * 0.6)
    seq(THEME[:4], t0 + 4.4, 0.5, musicbox, 0.06, 0.2)

# ================================================================ les trois films
if EP == 2:
    chapter(0.0)
    victory(5.0, 12.4)
    place(sfx, 5.2, wind(5.0, 0.3), 0.03)
    for i in range(3): place(sfx, 6.0 + i * 0.6, blip(85, (380, 700), 0.4), 0.06)       # le yéti soupire
    shard_get(8.0, 9.4)
    place(sfx, 9.6, boing(320, 0.35), 0.08)                                              # Flocon saute de joie
    babble(16.4, 21.6, 'yeti', 0.075, 0.3)
    map_leg(17.0, 8.4)
    tension(25.0, 16.4)
    place(sfx, 25.0, wind(16.0, 0.4), 0.05)
    for i in range(28): place(sfx, 26.0 + i * 0.5, crunch(0.12), 0.05, 0.4 - i * 0.02)  # la marche des bonshommes
    for k in range(6): place(sfx, 27.0 + k * 0.9, crackle(0.3), 0.04, -0.2)             # les guirlandes grésillent
    place(music, 30.5, timpani(hz('D2'), 2.0), 0.3); chord(['D2', 'G#2', 'D3'], 30.6, 2.6, brass, 0.05)
    for i in range(3): place(sfx, 33.1 + i * 0.34, blip(110 + i * 6, (500, 900), 0.24), 0.13, 0.3)   # « Ho ho ho… »
    babble(33.0, 37.0, 'bonhomme', 0.06, 0.3)
    arrival(41.0, 12.4)
    for k in range(5): place(sfx, 41.2 + k * 0.42, crunch(0.1), 0.04, -0.4)
    babble(43.0, 47.2, 'maire', 0.075, 0.25)
    babble(47.6, 51.6, 'flocon', 0.07, -0.2)
    title(53.0, 9.0)
elif EP == 3:
    chapter(0.0)
    place(sfx, 5.2, wind(3.0, 0.3), 0.03)
    for i in range(5): place(sfx, 6.2 + i * 0.25, crunch(0.1), 0.06, 0.4)              # le Gros Bonhomme vacille
    for i in range(3): place(sfx, 7.4 + i * 0.12, pop(500 + i * 200, 0.15), 0.12, 0.4)  # pouf ! en trois petits bonshommes
    for i in range(14): place(sfx, 7.8 + i * 0.22, pop(900 + (i % 3) * 200, 0.05), 0.04, 0.5)  # ils détalent
    victory(5.0, 12.4)
    shard_get(9.2, 10.6)
    for j in range(12): place(music, 11.2 + j * 0.08, bell(hz(['D6', 'F#6', 'A6', 'C#7'][j % 4]), 1.2), 0.03, (j % 4 - 1.5) * 0.4)  # le sapin se rallume
    for k in range(18): place(sfx, 11.4 + k * 0.12, blip(220 + (k % 5) * 40, (700, 1500), 0.08), 0.04, (k % 3 - 1) * 0.6)  # hourra
    babble(17.2, 21.6, 'maire', 0.075, 0.2)
    map_leg(17.0, 8.4)
    tension(25.0, 16.4, ('E2', 'B2', 'E3', 'G3'))
    place(sfx, 25.0, filt(noise(8.5), 'lowpass', 700) * 0.6, 0.05)                      # la mer
    for k in range(30): place(sfx, 25.4 + k * 0.26, pop(800 + (k * 137) % 900, 0.07), 0.035, ((k * 7) % 11) / 5.5 - 1)  # colis en vrac
    for k in range(6): place(sfx, 26.5 + k * 1.1, blip(240 + k * 20, (750, 1500), 0.18), 0.05, ((k % 3) - 1) * 0.6)  # « Mon colis ! »
    place(music, 33.4, timpani(hz('E2'), 2.0), 0.3); chord(['E2', 'A#2', 'E3'], 33.5, 2.6, brass, 0.05)
    for i in range(14): place(sfx, 33.6 + i * 0.36, thump(200 + (i % 2) * 90, 0.08), 0.1)   # la machine claque
    place(sfx, 34.0, filt(noise(7.0), 'bandpass', [180, 900]) * env_ar(int(7.0 * SR), 0.3, 1.0), 0.08)
    arrival(41.0, 12.4)
    place(sfx, 41.0, filt(noise(12.0), 'lowpass', 600) * 0.6, 0.05)
    place(music, 41.6, brass(hz('A2'), 1.4), 0.08); place(music, 43.2, brass(hz('A2'), 0.8), 0.06)  # la corne du bateau
    place(sfx, 42.3, squawk(0.45), 0.1, 0.4)
    place(sfx, 44.2, boing(300, 0.3), 0.07)
    babble(42.8, 47.4, 'cheffe', 0.07, 0.35)
    babble(47.8, 51.6, 'flocon', 0.07, -0.2)
    title(53.0, 9.0)
else:
    chapter(0.0)
    place(sfx, 5.0, filt(noise(4.0), 'bandpass', [180, 900]) * env_ar(int(4.0 * SR), 0.1, 2.5), 0.06)   # la machine ralentit
    seq([('A4', 1), ('F#4', 1), ('D4', 1), ('A3', 2)], 5.4, 0.4, pluck, 0.06)
    for i in range(3): place(sfx, 8.2 + i * 0.27, thump(160, 0.12), 0.12)              # hoquet
    victory(5.0, 12.4)
    shard_get(8.9, 10.2)
    place(sfx, 11.1, squawk(0.45), 0.09, 0.3)
    babble(17.0, 21.6, 'cheffe', 0.07, 0.3)
    # la carte : les éclats chantent, puis le givre gagne
    chord(['D4', 'F#4', 'A4', 'D5'], 17.0, 6.0, pad, 0.035, a=1.0, vib=0.006)
    place(sfx, 18.4, whoosh(1.4, 600, 3500, 0.5), 0.1)
    chord(['D2', 'A2', 'D3', 'F3'], 22.0, 7.4, strings, 0.055, a=2.0)
    place(sfx, 20.0, filt(noise(9.0), 'highpass', 5000) * env_ar(int(9.0 * SR), 3.0, 1.0), 0.04)   # le givre crisse
    place(sfx, 23.0, filt(noise(6.0), 'lowpass', 120) * env_ar(int(6.0 * SR), 2.0, 1.0), 0.12)     # grondement
    tension(29.0, 12.4)
    place(sfx, 29.0, wind(12.4, 0.6), 0.09)
    place(music, 36.4, timpani(hz('D2'), 2.0), 0.35); chord(['D2', 'G#2', 'D3'], 36.5, 3.0, brass, 0.06)
    place(sfx, 37.4, filt(noise(1.2), 'lowpass', 400) * env_ar(int(1.2 * SR), 0.3, 0.8), 0.2)       # les mains de glace
    place(sfx, 38.6, roar(2.0), 0.3); place(sfx, 38.6, cymbal(2.0), 0.05)
    # l'arrivée dans la tempête : souvenir de Mamie (le thème à la boîte à musique)
    place(sfx, 41.0, wind(14.4, 0.7), 0.1)
    chord(['D2', 'A2', 'F3'], 41.0, 5.0, strings, 0.045, a=1.4)
    chord(['B2', 'F#3', 'D4'], 46.0, 4.4, pad, 0.04, a=1.0)
    seq(THEME, 46.0, 0.55, musicbox, 0.08, 0.1)
    for k in range(13): place(sfx, 41.2 + k * 0.52, crunch(0.1), 0.04, -0.3 + k * 0.03)
    babble(46.0, 50.4, 'mamie', 0.065, -0.2)
    place(music, 50.4, timpani(hz('D2'), 2.2), 0.3); chord(['D2', 'A2', 'D3', 'F3'], 50.5, 5.0, brass, 0.05)
    for i in range(6): place(music, 51.4 + i * 0.6, tom(hz('D2'), 0.5), 0.12)
    title(55.0, 9.0, heroic=True)

mix = reverb(music, 2.6, 3, 0.35) + reverb(sfx, 1.2, 5, 0.15)
w = wave.open('soundtrack2.wav'); v2 = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).T / 32768.0
ref = np.sqrt(np.mean(v2[:, int(7 * SR):int(27 * SR)] ** 2)); cur = np.sqrt(np.mean(mix ** 2))
mix = np.tanh(mix * (ref / cur) * 0.85) * 0.92
fi, fo = int(0.3 * SR), int(1.5 * SR); mix[:, :fi] *= np.linspace(0, 1, fi); mix[:, -fo:] *= np.linspace(1, 0, fo)
pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
with wave.open(OUT, 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
print('ok', EP, mix.shape[1] / SR, 'rms', 20 * np.log10(np.sqrt(np.mean(mix ** 2))))
