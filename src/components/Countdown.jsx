import PenguinButton from './PenguinButton';
import { capitalize, formatDay, joinNames } from '../utils/birthdayLogic';

// Carte principale : prochain anniversaire (ou plusieurs s'ils tombent le même jour)
export default function Countdown({ group, now, play, onWish }) {
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
    const size = penguins.length > 1 ? 'clamp(100px, 24vh, 230px)' : 'clamp(160px, 38vh, 360px)';

    return (
        <article className="hero glass" aria-label="Prochain anniversaire">
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
                {/* Les vœux ne s'envoient que le jour J */}
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={onWish}
                    disabled={days !== 0}
                    title={days !== 0 ? `Disponible le ${formatDay(first.nextBirthday)}` : undefined}
                >
                    {days === 0 ? 'Souhaiter un joyeux anniversaire' : 'Vœux possibles le jour J'}
                </button>
            </div>
            <div className="hero__pengs">
                {penguins.map((p) => (
                    <PenguinButton key={p.id} person={p} play={play} size={size} star={days === 0} />
                ))}
            </div>
        </article>
    );
}
