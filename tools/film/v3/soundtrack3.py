# Bande-son originale de « La Grande Quête de Flocon » (120 s), synthétisée entièrement en numpy.
# Musique (thème composé pour le film) + bruitages + babillage des personnages pendant les sous-titres.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 44100
DUR = 31.0
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

# ================================================================ INTRO v3 (0-30 s) : le livre puis la carte
BEAT = 60 / 84
# A. le livre à la bougie : boîte à musique seule, nappe douce
chord(['D3', 'A3', 'F#4'], 0.0, 7.4, pad, 0.03, a=2.0)
chord(['G2', 'D3', 'B3'], 7.0, 4.4, pad, 0.03, a=1.2)
chord(['A2', 'E3', 'C#4'], 11.0, 3.6, pad, 0.03)
theme = [('F#5', 2), ('A5', 1), ('D6', 2), ('C#6', 1), ('B5', 1), ('A5', 1), ('G5', 1), ('E5', 3), ('F#5', 2), ('G5', 1), ('A5', 2), ('F#5', 1), ('E5', 3)]
seq(theme, 1.4, BEAT, musicbox, 0.07, 0.2)
place(sfx, 0.0, crackle(14.5), 0.05, 0.5)
place(sfx, 10.6, whoosh(4.0, 200, 1400, 0.9), 0.1)
# B. la carte du royaume : émerveillement
place(sfx, 13.9, filt(noise(1.2), 'bandpass', [1200, 5000]) * env_ar(int(1.2 * SR), 0.1, 0.8), 0.06)  # parchemin
for (c, a, b) in [(['D3', 'A3', 'C#4', 'F#4'], 14.0, 4.4), (['B2', 'F#3', 'A3', 'D4', 'C#5'], 18.2, 4.6), (['G2', 'D3', 'B3', 'F#4'], 22.6, 4.4)]:
    chord(c, a, b, strings, 0.045, a=1.0)
for i in range(30):
    t0 = 14.2 + i * 0.42
    if t0 > 26.6: break
    base = ['D5', 'F#5', 'A5', 'C#6', 'E6', 'C#6', 'A5', 'F#5'] if t0 < 18.2 else (['B4', 'D5', 'F#5', 'A5', 'C#6', 'A5', 'F#5', 'D5'] if t0 < 22.6 else ['G4', 'B4', 'D5', 'F#5', 'A5', 'F#5', 'D5', 'B4'])
    place(music, t0, pluck(hz(base[i % 8]), 1.2, bright=1.4, decay=3.0), 0.05, (i % 4 - 1.5) * 0.3)
seq([('A4', 1), ('D5', 1), ('F#5', 2), ('E5', 1), ('D5', 1), ('A5', 3)], 15.0, 0.62, flute, 0.045, -0.15)
seq([('B5', 1.5), ('A5', 0.5), ('F#5', 1), ('D5', 2)], 20.0, 0.62, flute, 0.045, -0.15)
for tl, n in [(18.6, 'A6'), (20.4, 'F#6'), (23.6, 'D6'), (27.0, 'A5')]:
    place(music, tl, bell(hz(n), 2.0), 0.06, 0.2); place(music, tl + 0.08, bell(hz(n) * 1.5, 1.6), 0.03, -0.2)
# « Et tout au nord… » : on bascule en ré mineur, les cordes graves montent
chord(['D2', 'A2', 'D3', 'F3'], 26.6, 4.4, strings, 0.06, a=1.6)
place(music, 27.4, timpani(hz('D2'), 2.0), 0.12)
place(sfx, 26.8, wind(4.2, 0.4), 0.05)
place(sfx, 28.6, whoosh(2.0, 300, 1600, 0.8), 0.08)
# ================================================================ mixage de l'intro, puis raccord avec la bande v2
def reverb(x, d=2.4, seed=3, wet=0.22):
    r = np.random.RandomState(seed); n = int(d * SR); tir = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = r.randn(n) * np.exp(-tir * 3.0 / d * 2.3)
        ir = filt(ir, 'lowpass', 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out[c] = x[c] + wet * fftconvolve(x[c], ir)[:x.shape[1]]
    return out
intro = reverb(music, 2.6, 3, 0.35) + reverb(sfx, 1.2, 5, 0.15)
w = wave.open('soundtrack2.wav'); v2 = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).T / 32768.0
# niveau de l'intro aligné sur la v2 (RMS de ses 20 premières secondes)
ref = np.sqrt(np.mean(v2[:, int(7 * SR):int(27 * SR)] ** 2)); cur = np.sqrt(np.mean(intro[:, int(1 * SR):int(29 * SR)] ** 2))
intro = np.tanh(intro * (ref / cur) * 0.8) * 0.92
TOTAL = int(131.0 * SR)
out = np.zeros((2, TOTAL))
xf = int(0.6 * SR); start = int(30.0 * SR)
out[:, :min(intro.shape[1], start + xf)] += intro[:, :min(intro.shape[1], start + xf)]
fo = np.linspace(1, 0, xf); out[:, start:start + xf] *= fo
seg_v2 = v2[:, int(7.0 * SR):]
n = min(seg_v2.shape[1], TOTAL - start)
fi = np.ones(n); fi[:xf] = np.linspace(0, 1, xf)
out[:, start:start + n] += seg_v2[:, :n] * fi
fade = int(1.2 * SR); out[:, -fade:] *= np.linspace(1, 0, fade)
pcm = (np.clip(out, -1, 1).T * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'soundtrack3.wav', 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
print('ok', TOTAL / SR)
