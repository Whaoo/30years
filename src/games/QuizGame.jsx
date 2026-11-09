import { useCallback, useEffect, useRef, useState } from 'react';
import Penguin from '../components/Penguin';
import { MONTHS, getSortedBirthdays } from '../utils/birthdayLogic';

// Qui fête quand ? Un quiz de 10 questions tiré de la vraie liste des anniversaires.
// Bonne réponse : 100 points + jusqu'à 50 points de rapidité. Une erreur ne coûte rien.
const QUESTIONS = 10;
const PLAN = ['date', 'when', 'date', 'month', 'when', 'next', 'date', 'when', 'month', 'next'];

function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const monthOf = (p) => Number(p.date.split('-')[1]) - 1;
function dayLabel(date) {
    const [d, m] = date.split('-').map(Number);
    return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;
}

function team() {
    return getSortedBirthdays(new Date()).filter((p) => p.name !== 'Noël');
}

// Prend jusqu'à n personnes qui respectent ok(), sans doublon
function pickPeople(pool, n, ok) {
    const out = [];
    for (const p of shuffle(pool)) {
        if (out.length >= n) break;
        if (ok(p, out)) out.push(p);
    }
    return out;
}

function makeQuestion(kind, people, used) {
    const fresh = people.filter((p) => !used.has(p.id));
    const pool = fresh.length >= 4 ? fresh : people;
    if (kind === 'date' || kind === 'when') {
        const target = pool[Math.floor(Math.random() * pool.length)];
        used.add(target.id);
        const others = pickPeople(people, 3, (p, acc) => p.date !== target.date && acc.every((q) => q.date !== p.date));
        if (kind === 'date') {
            return {
                prompt: `Qui fête son anniversaire le ${dayLabel(target.date)} ?`,
                options: shuffle([target, ...others]).map((p) => ({ key: p.id, person: p, label: p.name })),
                answer: target.id
            };
        }
        return {
            prompt: `Quand est l’anniversaire de ${target.name} ?`,
            person: target,
            options: shuffle([target, ...others]).map((p) => ({ key: p.date, label: dayLabel(p.date) })),
            answer: target.date
        };
    }
    if (kind === 'month') {
        const target = pool[Math.floor(Math.random() * pool.length)];
        used.add(target.id);
        const m = monthOf(target);
        const others = pickPeople(people, 3, (p) => monthOf(p) !== m);
        return {
            prompt: `Qui fête son anniversaire en ${MONTHS[m]} ?`,
            options: shuffle([target, ...others]).map((p) => ({ key: p.id, person: p, label: p.name })),
            answer: target.id
        };
    }
    // next : lequel arrive en premier à partir d'aujourd'hui
    const four = pickPeople(pool.length >= 4 ? pool : people, 4, (p, acc) => acc.every((q) => q.days !== p.days));
    four.forEach((p) => used.add(p.id));
    const first = four.reduce((a, b) => (b.days < a.days ? b : a));
    return {
        prompt: 'Lequel de ces anniversaires arrive en premier ?',
        options: four.map((p) => ({ key: p.id, person: p, label: p.name })),
        answer: first.id,
        reveal: (key) => {
            const p = four.find((q) => q.id === key);
            return p ? dayLabel(p.date) : '';
        }
    };
}

function makeQuiz() {
    const people = team();
    const used = new Set();
    return shuffle(PLAN).slice(0, QUESTIONS).map((kind) => makeQuestion(kind, people, used));
}

const pointsFor = (secs) => 100 + Math.round(50 * Math.max(0, Math.min(1, 1 - (secs - 2) / 8)));

export default function QuizGame({ onScore }) {
    const [phase, setPhase] = useState('ready');
    const [quiz, setQuiz] = useState([]);
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState(null);
    const [score, setScore] = useState(0);
    const [good, setGood] = useState(0);
    const [gain, setGain] = useState(0);
    const [record, setRecord] = useState(false);
    const shownAt = useRef(0);
    const timer = useRef();
    const totals = useRef({ score: 0, good: 0 });

    useEffect(() => () => clearTimeout(timer.current), []);

    const start = useCallback(() => {
        clearTimeout(timer.current);
        setQuiz(makeQuiz());
        setIndex(0);
        setPicked(null);
        setScore(0);
        setGood(0);
        setGain(0);
        setRecord(false);
        totals.current = { score: 0, good: 0 };
        shownAt.current = performance.now();
        setPhase('play');
    }, []);

    const q = quiz[index];

    const choose = useCallback((key) => {
        if (phase !== 'play' || picked || !q) return;
        const secs = (performance.now() - shownAt.current) / 1000;
        const ok = key === q.answer;
        const pts = ok ? pointsFor(secs) : 0;
        totals.current.score += pts;
        if (ok) totals.current.good += 1;
        setPicked(key);
        setGain(pts);
        setScore(totals.current.score);
        setGood(totals.current.good);
        timer.current = setTimeout(() => {
            if (index + 1 >= quiz.length) {
                setRecord(onScore ? onScore(totals.current.score) : false);
                setPhase('done');
            } else {
                setIndex(index + 1);
                setPicked(null);
                setGain(0);
                shownAt.current = performance.now();
            }
        }, ok ? 1100 : 1700);
    }, [phase, picked, q, index, quiz.length, onScore]);

    useEffect(() => {
        const onKey = (e) => {
            if (phase === 'play' && q) {
                const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
                if (n != null && q.options[n]) choose(q.options[n].key);
            } else if ((e.code === 'Enter' || e.code === 'Space') && phase !== 'play') {
                e.preventDefault();
                start();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, q, choose, start]);

    if (phase === 'ready') {
        return (
            <div className="quiz">
                <div className="quiz__card quiz__intro">
                    <p className="quiz__title">Qui fête quand ?</p>
                    <p>10 questions sur les anniversaires de l’équipe. Plus tu réponds vite, plus tu marques.</p>
                    <p className="quiz__hint">Clic ou touches 1 à 4. Une erreur ne coûte rien.</p>
                    <button type="button" className="btn btn--primary" onClick={start}>C’est parti</button>
                </div>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="quiz">
                <div className="quiz__card quiz__intro" role="status">
                    <p className="quiz__title">{good >= 8 ? 'Mémoire d’éléphant !' : good >= 5 ? 'Pas mal du tout' : 'Il est temps de réviser'}</p>
                    <p className="quiz__score">{score} points</p>
                    <p>{good} bonne{good > 1 ? 's' : ''} réponse{good > 1 ? 's' : ''} sur {QUESTIONS}</p>
                    {record && <p className="memory__record">Nouveau record !</p>}
                    <button type="button" className="btn btn--primary" onClick={start}>Rejouer</button>
                </div>
            </div>
        );
    }

    return (
        <div className="quiz">
            <div className="memory__hud">
                <span>Question {index + 1} / {QUESTIONS}</span>
                <span>Bonnes réponses : {good}</span>
                <span>Score : {score}</span>
            </div>
            <div className="quiz__card">
                <p className="quiz__prompt">{q.prompt}</p>
                {q.person && (
                    <div className="quiz__who">
                        <Penguin hat={q.person.hat} scarf={q.person.scarf} hatColor={q.person.hatColor} size="min(9vh, 80px)" shadow={false} />
                    </div>
                )}
            </div>
            <div className={`quiz__grid${q.options[0]?.person ? '' : ' quiz__grid--dates'}`}>
                {q.options.map((o, i) => {
                    let cls = 'quiz__opt';
                    if (picked) {
                        if (o.key === q.answer) cls += ' is-right';
                        else if (o.key === picked) cls += ' is-wrong';
                        else cls += ' is-dim';
                    }
                    return (
                        <button key={o.key} type="button" className={cls} onClick={() => choose(o.key)} disabled={!!picked}>
                            <span className="quiz__num">{i + 1}</span>
                            {o.person && (
                                <Penguin
                                    hat={o.person.hat}
                                    scarf={o.person.scarf}
                                    hatColor={o.person.hatColor}
                                    mood={picked && o.key === q.answer ? 'happy' : 'normal'}
                                    size="min(8vh, 72px)"
                                    shadow={false}
                                />
                            )}
                            <span className="quiz__label">{o.label}</span>
                            {picked && q.reveal && <span className="quiz__reveal">{q.reveal(o.key)}</span>}
                        </button>
                    );
                })}
            </div>
            <p className="quiz__feedback" aria-live="polite">
                {picked && (gain > 0 ? `Bonne réponse ! +${gain}` : 'Raté, la bonne réponse est en vert.')}
            </p>
        </div>
    );
}
