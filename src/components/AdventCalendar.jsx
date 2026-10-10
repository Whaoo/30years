import { useEffect, useRef, useState } from 'react';
import Penguin from './Penguin';
import Icon from './Icons';
import { ADVENT_TEASERS, DOOR_ORDER, adventState } from '../utils/advent';

const GUARD_LINES = [
    'Joyeux Avent !',
    'Chaque porte a son secret.',
    'Tu veux voir mon écharpe ?',
    'Ne dis rien au père Noël.',
    'Cinq clics : te voilà ami officiel.'
];

export default function AdventCalendar({ now }) {
    const { openCount, todayDoor } = adventState(now);
    const [selected, setSelected] = useState(null);
    const [guard, setGuard] = useState(null);
    const [cheat, setCheat] = useState(0);
    const [waving, setWaving] = useState(false);
    const guardClicks = useRef(0);
    const waveTimer = useRef();

    useEffect(() => () => clearTimeout(waveTimer.current), []);

    const current = selected || todayDoor || 25;
    const teaser = ADVENT_TEASERS[current - 1];
    const unlocked = current <= openCount;
    const wait = current - openCount;

    const cheer = () => {
        setWaving(true);
        clearTimeout(waveTimer.current);
        waveTimer.current = setTimeout(() => setWaving(false), 1900);
    };

    const pick = (n) => {
        setSelected(n);
        setGuard(null);
        if (n > openCount) setCheat((c) => c + 1);
        else cheer();
    };

    const talk = () => {
        guardClicks.current += 1;
        setGuard(GUARD_LINES[(guardClicks.current - 1) % GUARD_LINES.length]);
        cheer();
    };

    let bubble = guard;
    if (!bubble) {
        if (unlocked) bubble = 'Joyeux Avent !';
        else bubble = cheat >= 3 ? 'Je t’ai vu cliquer partout.' : 'Chut… pas avant le jour J.';
    }

    let kindClass = 'chip-tag chip-tag--kind';
    if (!unlocked) kindClass = 'chip-tag chip-tag--locked';
    else if (current >= 24) kindClass = 'chip-tag chip-tag--gold';

    return (
        <article className="advent glass" aria-label="Calendrier de l'Avent">
            <section className="advent__feature" aria-label="Porte sélectionnée">
                <div className="chips">
                    <span className={kindClass}>{unlocked ? teaser.kind : 'Fermée'}</span>
                    <span className="chip-tag">Porte {current}</span>
                </div>
                <h2 className="advent__title">{unlocked ? teaser.title : 'Patience…'}</h2>
                <p className="advent__text">
                    {unlocked
                        ? teaser.text
                        : 'Cette porte est verrouillée. Le pingouin garde la clé et ne se laisse pas amadouer.'}
                </p>
                <div className="guard-zone">
                    <div className="bubble" key={bubble}>{bubble}</div>
                    <button
                        type="button"
                        className="pbtn"
                        onClick={talk}
                        aria-label="Le pingouin gardien, cliquer pour lui parler"
                    >
                        <Penguin
                            hat={unlocked ? 'beanie' : 'shades'}
                            scarf="#ffd36e"
                            hatColor="#d63a3a"
                            mood={waving && unlocked ? 'happy' : 'normal'}
                            wave={waving}
                            size="clamp(96px, 22vh, 220px)"
                        />
                    </button>
                </div>
                {!unlocked && (
                    <p className="advent__wait">{wait === 1 ? 'Ouverture demain' : `Ouverture dans ${wait} jours`}</p>
                )}
                <div className="advent__nav">
                    <button type="button" className="btn btn--ghost" disabled={current <= 1} onClick={() => pick(current - 1)}>
                        ← Précédente
                    </button>
                    <button type="button" className="btn btn--primary" disabled={current >= 25} onClick={() => pick(current + 1)}>
                        Suivante →
                    </button>
                </div>
            </section>

            <div className="doors" role="group" aria-label="Les 25 portes">
                {DOOR_ORDER.map((n) => {
                    const open = n <= openCount;
                    const cls = [
                        'door',
                        open ? 'door--open' : '',
                        n >= 24 ? 'door--special' : '',
                        n === todayDoor ? 'door--today' : ''
                    ].filter(Boolean).join(' ');
                    return (
                        <button
                            key={n}
                            type="button"
                            className={cls}
                            aria-pressed={n === current}
                            aria-label={`Porte ${n}, ${open ? 'ouverte' : 'fermée'}`}
                            onClick={() => pick(n)}
                        >
                            <span className="door__n">{n}</span>
                            {open ? <span className="door__kind">{ADVENT_TEASERS[n - 1].kind}</span> : <Icon name="lock" size={14} />}
                        </button>
                    );
                })}
            </div>
        </article>
    );
}
