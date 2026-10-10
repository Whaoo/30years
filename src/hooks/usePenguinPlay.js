import { useCallback, useEffect, useRef, useState } from 'react';

// Easter eggs des pingouins : bulles, expressions, salut, toupie, chapeau de fête.
const LINES = [
    ['Salut !', 'happy'],
    ['Pas le ventre, merci.', 'surprised'],
    ['Tu as de la glace ?', 'wink'],
    ['Je suis en service, chut.', 'normal']
];

function without(obj, key) {
    const next = { ...obj };
    delete next[key];
    return next;
}

function schedule(timers, key, fn, ms) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
}

export function usePenguinPlay(onParty) {
    const [bubbles, setBubbles] = useState({});
    const [moods, setMoods] = useState({});
    const [party, setParty] = useState({});
    const [waves, setWaves] = useState({});
    const [spinId, setSpinId] = useState(null);
    const clicks = useRef({});
    const timers = useRef({});

    useEffect(() => {
        const all = timers.current;
        return () => Object.values(all).forEach(clearTimeout);
    }, []);

    const say = useCallback((id, text, mood = 'normal', ms = 2600) => {
        setBubbles((b) => ({ ...b, [id]: text }));
        setMoods((m) => ({ ...m, [id]: mood }));
        schedule(timers, `say-${id}`, () => {
            setBubbles((b) => without(b, id));
            setMoods((m) => without(m, id));
        }, ms);
    }, []);

    const wave = useCallback((id, ms = 1900) => {
        setWaves((w) => ({ ...w, [id]: true }));
        schedule(timers, `wave-${id}`, () => setWaves((w) => without(w, id)), ms);
    }, []);

    const click = useCallback((id) => {
        const n = (clicks.current[id] || 0) + 1;
        clicks.current[id] = n;
        if (n % 5 === 0) {
            setParty((p) => ({ ...p, [id]: !p[id] }));
            if (onParty) onParty();
            say(id, 'Fête surprise !', 'happy');
            wave(id);
        } else if (n % 3 === 0) {
            setSpinId(id);
            schedule(timers, 'spin', () => setSpinId(null), 950);
            say(id, 'Wouiii !', 'happy');
        } else {
            const [text, mood] = LINES[(n - 1) % LINES.length];
            say(id, text, mood);
            if (n === 1) wave(id);
        }
    }, [onParty, say, wave]);

    const stateFor = useCallback((id) => ({
        bubble: bubbles[id] || null,
        mood: moods[id] || null,
        party: !!party[id],
        waving: !!waves[id],
        spinning: spinId === id
    }), [bubbles, moods, party, waves, spinId]);

    return { click, say, wave, stateFor };
}
