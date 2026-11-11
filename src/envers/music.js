// Petite musique originale de la cave : une boîte à musique d'Halloween,
// à laquelle s'ajoutent des grelots de Noël à mesure qu'on trouve des lettres. Coupée par défaut.
const MELODY = [0, 3, 7, 10, 7, 3, 5, 8, 12, 8, 5, 3, 2, 5, 9, 5]; // demi-tons au-dessus de la note de base
const BASE = 220 * 2 ** (3 / 12); // do

export function createMusic() {
    let ac = null;
    let timer = 0;
    let step = 0;
    let level = 0;
    let master = null;

    function note(freq, time, dur, type = 'triangle', vol = 0.12) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
        o.connect(g).connect(master);
        o.start(time);
        o.stop(time + dur + 0.05);
    }

    function bells(time) {
        const len = 0.12;
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 6000;
        const g = ac.createGain();
        g.gain.value = 0.05 + 0.08 * level;
        src.connect(f).connect(g).connect(master);
        src.start(time);
    }

    function tick() {
        const beat = 60 / 112 / 2;
        const now = ac.currentTime + 0.05;
        for (let i = 0; i < 4; i++) {
            const tt = now + i * beat;
            const semi = MELODY[step % MELODY.length];
            note(BASE * 2 ** (semi / 12), tt, 0.9, 'triangle', 0.09);
            if (step % 4 === 0) note(BASE / 2 * 2 ** (MELODY[(step / 4) % 4 * 4 % MELODY.length] / 12), tt, 1.6, 'sine', 0.07);
            // plus on avance, plus Noël s'invite : grelots et une note de cloche
            if (level > 0.15 && step % 2 === 0) bells(tt);
            if (level > 0.5 && step % 8 === 4) note(BASE * 4 * 2 ** (semi / 12), tt, 1.2, 'sine', 0.04 * level);
            step += 1;
        }
    }

    return {
        start() {
            if (!ac) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return false;
                ac = new AC();
                master = ac.createGain();
                master.gain.value = 0.8;
                master.connect(ac.destination);
            }
            ac.resume();
            clearInterval(timer);
            tick();
            timer = setInterval(tick, (60 / 112 / 2) * 4 * 1000);
            return true;
        },
        stop() {
            clearInterval(timer);
            if (ac) ac.suspend();
        },
        setLevel(v) {
            level = v;
        },
        destroy() {
            clearInterval(timer);
            if (ac) ac.close();
            ac = null;
        }
    };
}
