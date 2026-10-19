import { useEffect, useRef, useState } from 'react';
import Penguin from '../components/Penguin';
import { getSortedBirthdays } from '../utils/birthdayLogic';

// Memory des pingouins : 8 paires tirées au hasard parmi l'équipe.
const PAIRS = 8;

function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function deal() {
    const people = shuffle(getSortedBirthdays(new Date())).slice(0, PAIRS);
    return shuffle(people.flatMap((p) => [
        { key: `${p.id}-a`, pid: p.id, person: p },
        { key: `${p.id}-b`, pid: p.id, person: p }
    ]));
}

function Snowflake() {
    return (
        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
            <path d="M9.5 4 12 6l2.5-2M9.5 20l2.5-2 2.5 2M4 10.2l3 .8-.8 3M20 13.8l-3-.8.8-3M4 13.8l3-.8-.8-3M20 10.2l-3 .8.8 3" />
        </svg>
    );
}

export default function MemoryGame({ onScore }) {
    const [cards, setCards] = useState(deal);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState(() => new Set());
    const [moves, setMoves] = useState(0);
    const [startedAt, setStartedAt] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [done, setDone] = useState(null);
    const busy = useRef(false);
    const timer = useRef();

    useEffect(() => () => clearTimeout(timer.current), []);

    useEffect(() => {
        if (!startedAt || done) return undefined;
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [startedAt, done]);

    const seconds = startedAt ? Math.floor(((done ? done.end : now) - startedAt) / 1000) : 0;

    const flip = (i) => {
        if (busy.current || done || flipped.includes(i) || matched.has(cards[i].pid)) return;
        const begin = startedAt || Date.now();
        if (!startedAt) setStartedAt(begin);
        const next = [...flipped, i];
        setFlipped(next);
        if (next.length < 2) return;

        const total = moves + 1;
        setMoves(total);
        const [a, b] = next;
        if (cards[a].pid === cards[b].pid) {
            const found = new Set(matched);
            found.add(cards[a].pid);
            setMatched(found);
            setFlipped([]);
            if (found.size === PAIRS) {
                const end = Date.now();
                const record = onScore ? onScore(total) : false;
                setDone({ moves: total, end, record, secs: Math.round((end - begin) / 1000) });
            }
        } else {
            busy.current = true;
            timer.current = setTimeout(() => {
                setFlipped([]);
                busy.current = false;
            }, 850);
        }
    };

    const restart = () => {
        clearTimeout(timer.current);
        busy.current = false;
        setCards(deal());
        setFlipped([]);
        setMatched(new Set());
        setMoves(0);
        setStartedAt(null);
        setDone(null);
    };

    return (
        <div className="memory">
            <div className="memory__hud">
                <span>Coups : {moves}</span>
                <span>Paires : {matched.size}/{PAIRS}</span>
                <span>Temps : {seconds} s</span>
            </div>
            <div className="memory__grid">
                {cards.map((c, i) => {
                    const isMatched = matched.has(c.pid);
                    const shown = isMatched || flipped.includes(i);
                    return (
                        <button
                            key={c.key}
                            type="button"
                            className={`mcard${shown ? ' is-shown' : ''}${isMatched ? ' is-matched' : ''}`}
                            onClick={() => flip(i)}
                            aria-label={shown ? `Pingouin de ${c.person.name}` : 'Carte cachée'}
                        >
                            <span className="mcard__inner">
                                <span className="mcard__face mcard__back"><Snowflake /></span>
                                <span className="mcard__face mcard__front">
                                    <Penguin
                                        hat={c.person.hat}
                                        scarf={c.person.scarf}
                                        hatColor={c.person.hatColor}
                                        mood={isMatched ? 'happy' : 'normal'}
                                        size="min(8.5vh, 74px)"
                                        shadow={false}
                                    />
                                    <span className="mcard__name">{c.person.name}</span>
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {done && (
                <div className="memory__done" role="status">
                    <div className="memory__done-card">
                        <p className="memory__done-title">Bravo !</p>
                        <p>{done.moves} coups en {done.secs} s</p>
                        {done.record && <p className="memory__record">Nouveau record !</p>}
                        <button type="button" className="btn btn--primary" onClick={restart}>Rejouer</button>
                    </div>
                </div>
            )}
        </div>
    );
}
