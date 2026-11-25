import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PenguinButton from './PenguinButton';
import { MONTHS, WEEKDAYS, capitalize, formatDay, joinNames } from '../utils/birthdayLogic';

// Texte du bouton tant que ce n'est pas le jour J
function waitLabel(days, date) {
    if (days === 1) return 'Plus qu’une nuit avant les bougies';
    if (days < 7) return `Les confettis attendent ${WEEKDAYS[date.getDay()]}`;
    return `On garde les bougies pour le ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function waitHint(days, date) {
    if (days === 1) return 'Encore un peu de patience : on fête ça demain !';
    return `Encore un peu de patience : on fête ça le ${formatDay(date)}.`;
}

// Carte principale : prochain anniversaire (ou plusieurs s'ils tombent le même jour)
export default function Countdown({ group, now, play, onWish, onCandles }) {
    const first = group[0];
    const { days } = first;
    const many = group.length > 1;

    let big;
    let unit;
    let bigClass = 'hero__big';
    if (days === 0) {
        big = 'Aujourd’hui';
        unit = many
            ? (group.length === 2 ? 'joyeux anniversaire à tous les deux !' : 'joyeux anniversaire à tous !')
            : 'joyeux anniversaire !';
        bigClass += ' hero__big--word';
    } else if (days === 1) {
        const hours = Math.max(1, Math.ceil((first.nextBirthday - now) / 3600000));
        big = 'Demain';
        unit = `dans ${hours} h`;
        bigClass += ' hero__big--word';
    } else {
        big = String(days);
        unit = 'jours restants';
    }

    const penguins = group.slice(0, 2);

    // Sur un téléphone peu haut, la carte ne tenait pas : le bouton « Souffle les bougies » du jour J était coupé.
    // On mesure : si un bouton ou la bulle du pingouin dépasse de la carte, on passe en version plus compacte
    // (1 : pingouin et marges plus petits ; 2 : sans pingouin), et on remesure à chaque changement de taille.
    const card = useRef(null);
    const [fit, setFit] = useState(0);
    const shape = `${group.map((p) => p.id).join(',')}|${days}|${onCandles ? 1 : 0}`;
    useLayoutEffect(() => { setFit(0); }, [shape]);
    useEffect(() => {
        let t;
        const again = () => { clearTimeout(t); t = setTimeout(() => setFit(0), 150); };
        window.addEventListener('resize', again);
        return () => { clearTimeout(t); window.removeEventListener('resize', again); };
    }, []);
    useLayoutEffect(() => {
        const el = card.current;
        if (!el || fit >= 2) return;
        const box = el.getBoundingClientRect();
        const parts = [...el.querySelectorAll('.hero__actions, .bubble-slot, .hero__name')].map((n) => n.getBoundingClientRect());
        if (parts.some((r) => r.bottom > box.bottom - 6 || r.top < box.top + 2)) setFit(fit + 1);
    });
    const size = penguins.length > 1 ? 'clamp(100px, 24vh, 230px)' : 'clamp(160px, 38vh, 360px)';

    return (
        <article ref={card} className={`hero glass${fit ? ` is-fit${fit}` : ''}`} aria-label="Prochain anniversaire">
            <div className="hero__text">
                <span className="eyebrow">{many ? 'Prochains anniversaires' : 'Prochain anniversaire'}</span>
                <h1 className={`hero__name${many ? ' hero__name--long' : ''}`}>
                    {joinNames(group.map((p) => p.name))}
                </h1>
                <p className="hero__date">{capitalize(formatDay(first.nextBirthday))}</p>
                <div className="hero__count">
                    <span className={bigClass}>{big}</span>
                    <span className="hero__unit">{unit}</span>
                </div>
                {/* Les vœux ne s'envoient que le jour J : avant, un petit mot d'attente */}
                <div className="hero__actions">
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={onWish}
                        disabled={days !== 0}
                        title={days !== 0 ? waitHint(days, first.nextBirthday) : undefined}
                    >
                        {days === 0 ? 'Souhaiter un joyeux anniversaire' : waitLabel(days, first.nextBirthday)}
                    </button>
                    {days === 0 && onCandles && (
                        <button type="button" className="btn btn--ghost" onClick={onCandles}>
                            Souffle les bougies
                        </button>
                    )}
                </div>
            </div>
            <div className="hero__pengs">
                {penguins.map((p) => (
                    <PenguinButton key={p.id} person={p} play={play} size={size} star={days === 0} />
                ))}
            </div>
        </article>
    );
}
