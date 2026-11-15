# Bande-son originale de « La Grande Quête de Flocon » (120 s), synthétisée entièrement en numpy.
# Musique (thème composé pour le film) + bruitages + babillage des personnages pendant les sous-titres.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 44100
DUR = 108.0
N = int(SR * DUR)
music = np.zeros((2, N))
sfx = np.zeros((2, N))
rs = np.random.RandomState(7)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def hz(n):
    name, octv = n[:-1], int(n[-1])
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octv + 1) - 69) / 12)

def tt(d): return np.arange(int(d * SR)) / SR

def place(bus, t0, sig, amp=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N or len(sig) == 0: return
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    sig = sig[:N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[0, i0:i0 + len(sig)] += sig * amp * l * 1.414
    bus[1, i0:i0 + len(sig)] += sig * amp * r * 1.414

def env_ar(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na) ** 1.5
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

def filt(x, kind, f):
    sos = butter(2, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)

def noise(d): return rs.randn(int(d * SR))

# ---------------------------------------------------------------- instruments
def bell(f, d=2.5):
    t = tt(d)
    mod = np.sin(2 * np.pi * f * 4 * t) * 1.6 * np.exp(-t * 7)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.6) + 0.25 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 5)
    return s * env_ar(len(t), 0.004, 0.2)

def musicbox(f, d=2.0):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 6)) * np.exp(-t * 2.2) * env_ar(len(t), 0.002, 0.2)

def pluck(f, d=1.2, bright=1.0, decay=2.4):
    t = tt(d); s = np.zeros_like(t)
    for k in range(1, 12):
        if f * k > 9000: break
        s += np.sin(2 * np.pi * f * k * t + k) / k ** (1.3 / bright) * np.exp(-t * (decay + k * 1.4))
    return s * env_ar(len(t), 0.003, 0.08)

def pad(f, d, a=0.9, r=1.2, roll=0.42, vib=0.0, det=0.004):
    t = tt(d); s = np.zeros_like(t)
    v = 1 + vib * np.sin(2 * np.pi * 5.3 * t) * np.clip((t - 0.3) / 0.5, 0, 1)
    for dv in (-det, 0, det):
        ph = 2 * np.pi * f * (1 + dv) * np.cumsum(v) / SR
        for k in range(1, 11):
            if f * k > 7000: break
            s += np.sin(ph * k + dv * 900 * k) / k * np.exp(-k * roll)
    return s / 3 * env_ar(len(t), a, r)

def strings(f, d, a=0.6, r=1.0): return pad(f, d, a, r, roll=0.3, vib=0.004, det=0.003)

def brass(f, d, a=0.06, r=0.25):
    t = tt(d); s = np.zeros_like(t)
    att = np.clip(t / 0.12, 0, 1)
    b = 0.75 - 0.4 * att + 0.12 * np.clip((t - 0.2) / 1.0, 0, 1)
    ph = 2 * np.pi * f * t * (1 + 0.002 * np.sin(2 * np.pi * 5 * t))
    for k in range(1, 15):
        if f * k > 8000: break
        s += np.sin(ph * k) / k * np.exp(-k * b)
    return s * env_ar(len(t), a, r)

def flute(f, d, a=0.08, r=0.2):
    t = tt(d)
    v = 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.4, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(v) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    s += filt(rs.randn(len(t)), 'bandpass', [f * 0.8, f * 2.5]) * 0.06
    return s * env_ar(len(t), a, r)

def timpani(f, d=2.0):
    t = tt(d)
    ph = 2 * np.pi * f * np.cumsum(1 + 0.12 * np.exp(-t * 25)) / SR
    s = (np.sin(ph) + 0.4 * np.sin(1.5 * ph) * np.exp(-t * 4)) * np.exp(-t * 2.2)
    s += filt(rs.randn(len(t)), 'lowpass', 900) * np.exp(-t * 30) * 0.8
    return s

def tom(f, d=0.6):
    t = tt(d)
    ph = 2 * np.pi * f * np.cumsum(1 + 0.6 * np.exp(-t * 30)) / SR
    return np.sin(ph) * np.exp(-t * 7) + filt(rs.randn(len(t)), 'lowpass', 2000) * np.exp(-t * 40) * 0.5

def jingle(d=0.35):
    t = tt(d); s = np.zeros_like(t)
    for _ in range(4):
        o = int(rs.rand() * 0.03 * SR); f = 5000 + rs.rand() * 4000
        tt2 = t[:len(t) - o]
        s[o:] += np.sin(2 * np.pi * f * tt2 + rs.rand() * 6) * np.exp(-tt2 * (18 + rs.rand() * 10))
    s += filt(rs.randn(len(t)), 'highpass', 6000) * np.exp(-t * 30) * 0.5
    return s

def shaker(d=0.12):
    t = tt(d); return filt(rs.randn(len(t)), 'highpass', 5000) * np.exp(-t * 40)

def cymbal(d=2.5, swell=False):
    t = tt(d); s = filt(rs.randn(len(t)), 'highpass', 4500)
    e = (t / d) ** 2.5 if swell else np.exp(-t * 2.2)
    return s * e

def whoosh(d, f0=400, f1=2500, q=0.5):
    n = int(d * SR); x = rs.randn(n); out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        k = i / max(1, n - 1); fc = f0 * (f1 / f0) ** k
        seg_ = x[max(0, i - 2048):i + blk]
        y = filt(seg_, 'bandpass', [fc * (1 - q / 2), min(fc * (1 + q), SR / 2 - 100)])
        out[i:i + blk] = y[-len(out[i:i + blk]):]
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return out * e

def thump(f=110, d=0.25):
    t = tt(d)
    return np.sin(2 * np.pi * f * np.cumsum(1 + 1.5 * np.exp(-t * 60)) / SR) * np.exp(-t * 22) + filt(rs.randn(len(t)), 'lowpass', 1500) * np.exp(-t * 80) * 0.6

def pop(f=600, d=0.18):
    t = tt(d); return np.sin(2 * np.pi * f * np.cumsum(1 + 1.2 * t / d) / SR) * np.exp(-t * 22)

def boing(f=300, d=0.35):
    t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * np.sin(np.pi * t / d))) / SR) * np.exp(-t * 9)

def crunch(d=0.13):
    t = tt(d); x = rs.randn(len(t)) * (rs.rand(len(t)) < 0.35)
    return filt(x, 'bandpass', [900, 5000]) * np.exp(-t * 28)

def squawk(d=0.45):
    t = tt(d); f = 900 + 500 * np.sin(np.pi * t / d) - 300 * t / d
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph + 2.5 * np.sin(ph * 2)) * env_ar(len(t), 0.02, 0.12)
    return filt(s, 'bandpass', [600, 4000])

def roar(d=2.2):
    t = tt(d); f = 72 * (1 + 0.25 * np.exp(-t * 2)) * (1 + 0.04 * np.sin(2 * np.pi * 9 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(ph * k) / k for k in range(1, 30))
    g = filt(rs.randn(len(t)), 'bandpass', [150, 1600]) * 1.8
    s = np.tanh((saw * 0.8 + g) * 1.6) * env_ar(len(t), 0.08, 0.9)
    return filt(s, 'lowpass', 2600)

def crackle(d):
    n = int(d * SR); s = np.zeros(n)
    for _ in range(int(d * 14)):
        i = rs.randint(0, n - 600); L = rs.randint(60, 400)
        s[i:i + L] += rs.randn(L) * np.exp(-np.arange(L) / (L / 5)) * (0.3 + rs.rand())
    return filt(s, 'highpass', 1200) + filt(rs.randn(n), 'lowpass', 300) * 0.08

def wind(d, gust=0.3):
    t = tt(d); x = filt(rs.randn(len(t)), 'bandpass', [250, 1300])
    m = 0.6 + gust * np.sin(2 * np.pi * 0.17 * t) + 0.2 * np.sin(2 * np.pi * 0.43 * t + 1)
    return x * m * env_ar(len(t), 1.0, 1.0)

def blip(f0, vowel, d=0.07):
    t = tt(d); s = np.zeros_like(t)
    F1, F2 = vowel
    for k in range(1, 30):
        fk = f0 * k
        if fk > 5000: break
        w = np.exp(-((fk - F1) / 220) ** 2) + 0.6 * np.exp(-((fk - F2) / 380) ** 2) + 0.15 / k
        s += np.sin(2 * np.pi * fk * t) * w
    return s * np.hanning(len(t))

# ---------------------------------------------------------------- outils de composition
def chord(names, t0, d, inst, amp, pan_spread=0.5, **kw):
    for i, n in enumerate(names):
        pan = (i / max(1, len(names) - 1) - 0.5) * pan_spread * 2
        place(music, t0, inst(hz(n), d, **kw), amp, pan)

def seq(notes, t0, beat, inst, amp, pan=0.0, legato=1.0, **kw):
    t = t0
    for n, b in notes:
        if n: place(music, t, inst(hz(n), b * beat * legato + 0.25, **kw), amp, pan)
        t += b * beat
    return t

# ================================================================ MUSIQUE (v2, 108 s)
# A. 0-7.5 : la banquise la nuit
for (c, a, b) in [(['D3', 'A3', 'C#4', 'F#4'], 0.0, 3.0), (['B2', 'F#3', 'A3', 'D4', 'C#5'], 2.6, 2.8), (['G2', 'D3', 'B3', 'F#4'], 5.0, 2.8)]:
    chord(c, a, b, pad, 0.05)
for i in range(16):
    t0 = 0.8 + i * 0.4
    if t0 > 7.0: break
    base = ['D5', 'F#5', 'A5', 'C#6', 'E6', 'C#6', 'A5', 'F#5'] if t0 < 2.6 else (['B4', 'D5', 'F#5', 'A5', 'C#6', 'A5', 'F#5', 'D5'] if t0 < 5 else ['G4', 'B4', 'D5', 'F#5', 'A5', 'F#5', 'D5', 'B4'])
    place(music, t0, bell(hz(base[i % 8]), 2.0), 0.06 * min(1, t0 / 2), (i % 4 - 1.5) * 0.3)
place(music, 5.4, flute(hz('A5'), 0.8), 0.05, 0.2); place(music, 6.2, flute(hz('F#5'), 0.6), 0.05, 0.2); place(music, 6.8, flute(hz('E5'), 1.2), 0.05, 0.2)

# B. 7-17 : le Golem de givre se réveille
for (c, a, b) in [(['D2', 'A2', 'D3', 'F3'], 6.8, 4.4), (['Bb1', 'F2', 'D3', 'F3'], 11.0, 2.4), (['A1', 'E2', 'C#3', 'G3', 'A3'], 13.2, 4.2)]:
    chord(c, a, b, strings, 0.055, a=1.0)
for i in range(6):
    t0 = 7.4 + i * 0.9
    if t0 > 10.9: break
    place(music, t0, timpani(hz('D2'), 1.2), 0.18); place(music, t0 + 0.22, timpani(hz('D2'), 1.0), 0.1)
for i in range(40):
    t0 = 11.0 + i * 0.07
    if t0 > 13.15: break
    place(music, t0, timpani(hz('A1'), 0.6), 0.02 + 0.07 * (i / 30) ** 1.5, (i % 2 - 0.5) * 0.3)
place(music, 13.2, timpani(hz('D2'), 3.0), 0.32); place(music, 13.2, cymbal(3.0), 0.12)
for i, n in enumerate(['A5', 'C#6', 'E6', 'G6', 'A6', 'C#7', 'E7']):
    place(music, 13.25 + i * 0.06, bell(hz(n), 2.5), 0.07, (i - 3) * 0.25)

# B2. 17-21 : trois éclats, trois lieux
chord(['D2', 'A2', 'F3', 'A3'], 16.9, 4.6, strings, 0.045)
for i, (tl, n) in enumerate([(17.7, 'A5'), (18.5, 'F5'), (19.3, 'D5')]):
    place(music, tl, timpani(hz(['D2', 'A1', 'F2'][i]), 1.4), 0.22, (i - 1) * 0.6)
    place(music, tl, bell(hz(n), 2.2), 0.08, (i - 1) * 0.6)
    place(music, tl + 0.05, bell(hz(n) * 2, 1.6), 0.04, (i - 1) * 0.6)

# C. 21-25 : l'igloo, une étoile filante
chord(['G2', 'D3', 'B3', 'D4', 'G4'], 20.8, 2.6, strings, 0.05)
chord(['A2', 'E3', 'C#4', 'E4', 'G4'], 23.0, 2.4, strings, 0.05)
for i, n in enumerate(['D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'F#7']):
    place(music, 21.0 + i * 0.16, bell(hz(n), 1.8), 0.04, 0.8 - i * 0.25)

# D. 25-48 : la valse de l'igloo (3/4, 132 bpm)
BEAT = 60 / 132; BAR = 3 * BEAT; W0 = 25.0
prog = [('D', ['D2'], ['F#3', 'A3', 'D4']), ('D', ['A1'], ['F#3', 'A3', 'D4']), ('G', ['G1'], ['G3', 'B3', 'D4']), ('A', ['A1'], ['G3', 'C#4', 'E4']),
        ('D', ['D2'], ['F#3', 'A3', 'D4']), ('Bm', ['B1'], ['F#3', 'B3', 'D4']), ('G', ['G1'], ['G3', 'B3', 'D4']), ('A7', ['A1'], ['G3', 'C#4', 'E4'])]
nbars = int((48.2 - W0) / BAR) + 1
for b in range(nbars):
    t0 = W0 + b * BAR
    name, bass, ch = prog[b % 8]
    letter = 37.4 < t0 < 47.2
    va = 0.55 if letter else 1.0
    place(music, t0, pluck(hz(bass[0]), 1.4, bright=0.7, decay=3), 0.16 * va)
    for k in (1, 2):
        for i, n in enumerate(ch): place(music, t0 + k * BEAT, pluck(hz(n), 0.6, decay=5), 0.045 * va, (i - 1) * 0.4)
    if not letter: place(music, t0 + 2 * BEAT, shaker(), 0.02)
mel = [('F#5', 2), ('A5', 1), ('D6', 2), ('C#6', 1), ('B5', 1), ('A5', 1), ('G5', 1), ('E5', 3),
       ('F#5', 2), ('A5', 1), ('D6', 1), ('E6', 1), ('F#6', 1), ('D6', 2), ('B5', 1), ('A5', 2), ('C#6', 1)]
seq(mel, W0, BEAT, bell, 0.065, 0.25)
for i in range(22):
    t0 = 38.3 + i * BEAT
    if t0 > 46.8: break
    place(music, t0, musicbox(hz(['D6', 'A5', 'F#5', 'A5', 'B5', 'F#5', 'G5', 'D6', 'E6', 'C#6', 'A5'][i % 11]), 1.8), 0.05, 0.3)
chord(['D3', 'F#3', 'A3', 'D4'], 38.0, 3.8, pad, 0.035); chord(['G2', 'B3', 'D4', 'G4'], 41.6, 3.0, pad, 0.035); chord(['A2', 'C#4', 'E4', 'A4'], 44.4, 3.8, pad, 0.035)

# E. 48-64 : la mission et l'écharpe
for (c, a, b) in [(['B1', 'F#2', 'D3', 'F#3', 'B3'], 47.8, 4.0), (['G1', 'D2', 'B2', 'G3', 'D4'], 51.7, 3.5), (['F#1', 'D2', 'A2', 'F#3', 'D4'], 55.2, 3.2),
                  (['E2', 'B2', 'G3', 'D4', 'F#4'], 58.4, 3.0), (['A1', 'E2', 'D3', 'A3', 'E4'], 61.4, 1.4), (['A1', 'E2', 'C#3', 'G3', 'C#4', 'E4'], 62.6, 2.0)]:
    chord(c, a, b, strings, 0.05 + 0.025 * max(0, (a - 55) / 8), a=0.7)
seq([('F#5', 1.5), ('E5', 0.5), ('D5', 1), ('B4', 3)], 48.6, 0.6, flute, 0.05, 0.2)
place(music, 51.75, pluck(hz('G4'), 0.6), 0.12); place(music, 51.9, pluck(hz('B4'), 0.6), 0.12); place(music, 52.05, pluck(hz('D5'), 0.8), 0.12)
seq([('D5', 1), ('E5', 1), ('F#5', 1), ('A5', 2), ('G5', 1), ('F#5', 1), ('E5', 2)], 55.3, 0.4, bell, 0.05, -0.25)
seq([('A5', 1.5), ('G5', 0.5), ('F#5', 1), ('E5', 1), ('D5', 2)], 58.6, 0.55, flute, 0.05, 0.2)
for i, n in enumerate(['A5', 'D6', 'E6', 'F#6', 'A6', 'D7']): place(music, 60.0 + i * 0.07, bell(hz(n), 2.0), 0.06, (i - 2.5) * 0.3)
seq([('A4', 1), ('C#5', 1), ('E5', 1), ('A5', 1.5)], 62.6, 0.34, brass, 0.05)

# F. 64-76 : le départ (96 bpm, croches = pas de Flocon)
B2 = 60 / 96; F0 = 64.0
progF = [['D2', 'D3', 'F#3', 'A3', 'D4'], ['G1', 'G2', 'B3', 'D4', 'G4'], ['B1', 'B2', 'D3', 'F#3', 'B3'], ['A1', 'A2', 'C#4', 'E4', 'A4'], ['D2', 'D3', 'F#3', 'A3', 'D4']]
for b in range(5):
    t0 = F0 + b * 4 * B2
    if t0 > 76.2: break
    ch = progF[b]
    chord(ch[2:], t0, 4 * B2 + 0.4, strings, 0.035, a=0.3, r=0.5)
    for k in range(8):
        tk = t0 + k * B2 / 2
        if tk < 66.8 or tk > 76.2: continue
        place(music, tk, pluck(hz(ch[1]) * (2 if k % 2 else 1), 0.4, decay=6), 0.09)
        place(music, tk, jingle(), 0.035 if k % 2 else 0.05, 0.4)
    if t0 >= 66.6:
        place(music, t0, tom(hz('D2')), 0.25); place(music, t0 + 2 * B2, tom(hz('D2')), 0.2); place(music, t0 + 3.5 * B2, tom(hz('A2')), 0.12)
seq([('D5', 1), ('F#5', 1), ('A5', 2)], 64.4, B2, bell, 0.06, 0.3)
themeF = [('A4', 1), ('D5', 1), ('F#5', 1.5), ('E5', 0.5), ('D5', 1), ('E5', 0.5), ('F#5', 0.5), ('G5', 2),
          ('F#5', 1), ('D5', 1), ('B4', 2), ('C#5', 1), ('E5', 1), ('A5', 2)]
seq(themeF, 67.2, B2, brass, 0.055, -0.1, legato=0.95)
seq(themeF, 67.2, B2, flute, 0.03, 0.25, legato=0.95)
for i, n in enumerate(['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7']): place(music, 72.25 + i * 0.05, bell(hz(n), 1.6), 0.05, (i - 3) * 0.25)

# G. 76-86 : la carte
M0 = 76.0
progG = [['G2', 'D3', 'G3', 'B3', 'D4'], ['F#2', 'D3', 'F#3', 'A3', 'D4'], ['E2', 'B2', 'E3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C#4', 'E4'], ['B2', 'F#3', 'B3', 'D4', 'F#4']]
for b in range(5):
    t0 = M0 + b * 2.1
    ch = progG[b]
    chord(ch[1:], t0, 2.4, pad, 0.03)
    for k in range(8):
        n = ch[[0, 1, 2, 3, 4, 3, 2, 1][k]]
        place(music, t0 + k * 2.1 / 8, pluck(hz(n) * 2, 0.9, bright=1.4, decay=3.2), 0.05, ((k % 4) - 1.5) * 0.3)
seq([('D5', 1), ('E5', 0.5), ('F#5', 0.5), ('A5', 2), ('G5', 1), ('F#5', 1), ('E5', 2), ('A5', 3)], 77.6, 0.55, flute, 0.045, -0.15)

# H. 86-98 : les Monts Givrés, le yéti
for (c, a, b) in [(['D2', 'A2', 'D3', 'F3'], 85.9, 2.8), (['Bb1', 'F2', 'D3', 'F3'], 88.6, 2.2), (['A1', 'E2', 'C#3', 'E3', 'A3'], 90.8, 2.6), (['D2', 'A2', 'D3', 'F#3', 'A3'], 95.6, 3.0)]:
    chord(c, a, b, strings, 0.055)
for i in range(64):
    t0 = 86.2 + i * 0.15
    if t0 > 90.6: break
    n = ['D3', 'D3', 'A2', 'D3', 'F3', 'D3', 'A2', 'D3'][i % 8] if t0 < 88.6 else ['D3', 'D3', 'Bb2', 'D3', 'F3', 'D3', 'Bb2', 'D3'][i % 8]
    place(music, t0, pluck(hz(n), 0.25, bright=0.9, decay=8), 0.08 + 0.05 * (t0 - 86) / 5)
for i in range(10):
    t0 = 88.6 + i * 0.25
    if t0 > 90.7: break
    place(music, t0, tom(hz('A1') * (1 + 0.1 * (i % 2))), 0.12 + 0.12 * i / 10)
place(music, 91.3, timpani(hz('A1'), 2.5), 0.45); place(music, 91.3, cymbal(2.0), 0.06)
place(music, 93.6, pluck(hz('A3'), 0.3), 0.08); place(music, 93.8, pluck(hz('F3'), 0.5), 0.06)
seq([('D5', 0.5), ('F#5', 0.5), ('A5', 1)], 95.2, 0.3, flute, 0.05, 0.2)
place(music, 97.2, cymbal(1.3, swell=True), 0.16)

# I. 98-108 : le titre, à toi de jouer
chord(['D3', 'A3', 'D4', 'F#4', 'A4'], 98.0, 1.4, brass, 0.06)
place(music, 98.0, timpani(hz('D2'), 2.0), 0.4); place(music, 98.0, cymbal(2.5), 0.1)
title1, title2 = 'LA GRANDE QUÊTE', 'DE FLOCON'
scale = ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7']
k = 0
for i, ch in enumerate(title1):
    if ch != ' ': place(music, 98.6 + i * 0.045, bell(hz(scale[k % 6]), 1.4), 0.025, (i / 15 - 0.5)); k += 1
for i, ch in enumerate(title2):
    if ch != ' ': place(music, 99.2 + i * 0.045, bell(hz(scale[k % 6]), 1.4), 0.025, (i / 9 - 0.5)); k += 1
chord(['G2', 'D3', 'B3', 'D4', 'G4'], 99.6, 1.0, brass, 0.05)
chord(['A2', 'E3', 'C#4', 'E4', 'A4'], 100.3, 0.8, brass, 0.05)
chord(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4'], 100.9, 3.0, brass, 0.06, r=1.6)
chord(['D4', 'A4', 'D5', 'F#5'], 100.9, 4.0, strings, 0.04)
place(music, 100.9, timpani(hz('D2'), 2.0), 0.4)
for i in range(14): place(music, 100.9 + i * 0.15, jingle(), 0.05 * (1 - i / 14), 0.3)
seq([('A5', 0.5), ('B5', 0.5), ('A5', 0.5), ('F#5', 0.5), ('D6', 2)], 103.0, 0.4, bell, 0.05, 0.2)
chord(['D3', 'F#3', 'A3', 'D4'], 104.0, 4.0, pad, 0.04)

# ================================================================ BRUITAGES
place(sfx, 0, wind(17.5, 0.4), 0.05)
place(sfx, 9.2, filt(noise(2.0), 'lowpass', 200) * np.exp(-tt(2.0) * 1.5), 0.25)
for i, n in enumerate(['E6', 'A6']): place(sfx, 9.3 + i * 0.1, bell(hz(n), 2.0), 0.04)
place(sfx, 11.0, filt(noise(2.4), 'lowpass', 120) * env_ar(int(2.4 * SR), 0.5, 1.0), 0.3)
for i, p in enumerate([-0.8, 0.0, 0.8]): place(sfx, 13.4 + i * 0.12, whoosh(1.6, 600, 3500), 0.32, p)
for i, tl in enumerate([17.7, 18.5, 19.3]):
    place(sfx, tl - 0.5, whoosh(0.5, 2000, 5000, 0.6), 0.1, (i - 1) * 0.6)
    place(sfx, tl, thump(90, 0.3), 0.3, (i - 1) * 0.6)
place(sfx, 21.0, whoosh(1.4, 3000, 6000, 0.5), 0.05, 0.6)
place(sfx, 21.0, wind(4.6, 0.2), 0.04)
place(sfx, 22.6, whoosh(3.0, 200, 900, 0.8), 0.12)
place(sfx, 25.0, crackle(39.0), 0.11, -0.5)
place(sfx, 29.4, thump(120), 0.6, 0.6); place(sfx, 29.72, thump(115), 0.6, 0.6)
place(sfx, 30.7, wind(1.6, 0.0), 0.09, 0.7)
for i in range(6): place(sfx, 30.85 + i * 0.45, whoosh(0.28, 500, 1400, 0.7), 0.1, 0.6 - i * 0.1)
place(sfx, 32.1, squawk(), 0.08, 0.4)
place(sfx, 33.4, whoosh(1.0, 1500, 3000, 0.6), 0.06, 0.2)
place(sfx, 33.3, boing(220, 0.2), 0.08)
place(sfx, 33.8, boing(260), 0.12); place(sfx, 34.25, pop(700), 0.12)
place(sfx, 34.8, thump(160, 0.2), 0.45, 0.6); place(sfx, 34.85, boing(500, 0.5), 0.1, 0.6)
place(sfx, 35.0, squawk(0.3), 0.07, 0.6)
for i in range(3): place(sfx, 35.5 + i * 0.5, thump(200, 0.12), 0.18)
place(sfx, 37.6, filt(noise(0.5), 'bandpass', [1500, 6000]) * np.exp(-tt(0.5) * 8), 0.05)
for i in range(70):
    t0 = 38.4 + i * 0.1
    if t0 > 44.6: break
    place(sfx, t0, filt(noise(0.06), 'bandpass', [2500, 7000]) * np.hanning(int(0.06 * SR)), 0.008)
place(sfx, 45.0, thump(90, 0.3), 0.35); place(sfx, 45.05, pop(320), 0.06)
place(sfx, 51.7, pop(500, 0.12), 0.1)
place(sfx, 57.4, thump(140, 0.15), 0.12)
place(sfx, 58.4, filt(noise(0.12), 'bandpass', [3000, 8000]) * np.exp(-tt(0.12) * 30), 0.12)
place(sfx, 58.6, whoosh(1.4, 600, 1800, 0.6), 0.12)
place(sfx, 64.0, wind(12.4, 0.3), 0.045)
for i in range(30):
    t0 = 66.8 + i / 3.2
    if t0 > 72.0: break
    place(sfx, t0, crunch(), 0.22, 0.1)
place(sfx, 72.0, boing(180, 0.25), 0.06)
place(sfx, 72.25, whoosh(4.0, 800, 2000, 1.2), 0.13)
place(sfx, 72.3, filt(noise(3.9), 'highpass', 3000) * env_ar(int(3.9 * SR), 0.3, 1.2), 0.04)
place(sfx, 76.2, whoosh(1.2, 300, 1200, 0.9), 0.1)
pts = [(200, 540), (310, 470), (520, 290), (790, 300), (960, 470)]
lens = [np.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) for i in range(1, 5)]
acc = 0
for i, L in enumerate(lens):
    acc += L; at = acc / sum(lens)
    place(sfx, 77.6 + 5.4 * at, pop(520 + i * 120), 0.13); place(music, 77.6 + 5.4 * at, bell(hz(['D6', 'F#6', 'A6', 'D7'][i]), 1.5), 0.05)
for i in range(3): place(sfx, 83.2 + i * 0.53, boing(320 + i * 40), 0.1)
place(sfx, 86.0, wind(12.4, 0.5), 0.07)
place(sfx, 87.5, filt(noise(4.0), 'bandpass', [400, 2400]) * env_ar(int(4 * SR), 1.5, 0.5), 0.06)
place(sfx, 90.8, whoosh(0.5, 300, 1200, 0.8), 0.15, 0.6)
place(sfx, 91.3, thump(60, 0.6), 0.9, 0.4); place(sfx, 91.3, filt(noise(1.0), 'lowpass', 150) * np.exp(-tt(1.0) * 3), 0.5)
place(sfx, 91.7, roar(1.8), 0.3, 0.3)
place(sfx, 93.9, boing(140, 0.3), 0.12)
place(sfx, 93.6, whoosh(2.2, 1200, 2600, 1.0), 0.08, 0.3)
place(sfx, 94.6, filt(noise(0.2), 'bandpass', [800, 3000]) * np.exp(-tt(0.2) * 15), 0.08)
place(sfx, 95.2, pop(800, 0.15), 0.08)
place(sfx, 97.3, whoosh(1.0, 2000, 6000, 1.0), 0.08)

# ---------------------------------------------------------------- babillage des sous-titres
SUBS = [(25.7, 'Encore un peu de chocolat chaud, Flocon ?', 'm'), (35.1, 'Une lettre ! Elle est pour toi, Mamie.', 'f'),
        (48.4, 'Quelqu’un de courageux… Toi, Flocon.', 'm'), (51.7, 'Moi ?! Je ne suis jamais allé plus loin que le lac !', 'f'),
        (55.2, 'Tu es le meilleur glisseur de la banquise.', 'm'), (58.4, 'Je l’ai tricotée pour ton premier grand voyage.', 'm'),
        (61.5, 'Pingouin qui glisse n’amasse pas de bleus. File !', 'm')]
VOW = [(700, 1200), (400, 2000), (300, 2300), (500, 900), (350, 800), (600, 1700)]
for t0, txt, who in SUBS:
    base = 210 if who == 'm' else 380
    for i, ch in enumerate(txt):
        if i % 3 or ch in ' ,.!?…’': continue
        f = base * (1 + 0.25 * rs.rand()) * (1.25 if txt.rstrip().endswith('?') and i > len(txt) - 8 else 1)
        place(sfx, t0 + i * 0.028, blip(f, VOW[rs.randint(len(VOW))], 0.075), 0.05, -0.25 if who == 'm' else 0.25)

# ================================================================ mixage
def reverb(x, d=2.4, seed=3, wet=0.22):
    r = np.random.RandomState(seed); n = int(d * SR); tir = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.randn(n) * np.exp(-tir * 3.0 / d * 2.3)
        ir = filt(ir, 'lowpass', 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[c] = x[c] + wet * fftconvolve(x[c], ir)[:x.shape[1]]
    return out

mix = reverb(music, 2.6, 3, 0.35) + reverb(sfx, 1.2, 5, 0.15)
fade = np.ones(N); fi = int(0.8 * SR); fade[-fi:] = np.linspace(1, 0, fi); mix *= fade
peak = np.percentile(np.abs(mix), 99.97); mix = np.tanh(mix / peak * 0.9) * 0.92
out = (mix.T * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok', peak)
