import Background from './Background';
import Penguin from './Penguin';
import { SHORT_MONTHS, formatDay, joinNames } from '../utils/birthdayLogic';
import { ADVENT_TEASERS } from '../utils/advent';
import { themeStyle } from '../utils/theme';

// Vue compacte pour le Speed Dial de Vivaldi (petit carré). Tout est en vmin.
export default function Dial({ theme, sorted, advent }) {
    const first = sorted[0];
    const group = sorted.filter((p) => p.days === first.days);
    const next = sorted[group.length];
    const today = first.days === 0;
    const names = joinNames(group.map((p) => p.name));
    const door = advent.isDecember ? Math.min(25, advent.day) : 0;

    let footer = '';
    if (advent.isDecember) {
        if (today) footer = `Anniv : ${names} aujourd’hui !`;
        else footer = `Anniv : ${names} · ${first.days === 1 ? 'demain' : `J-${first.days}`}`;
    } else if (next) {
        footer = `Puis ${next.name} · ${next.nextBirthday.getDate()} ${SHORT_MONTHS[next.nextBirthday.getMonth()]}`;
    }

    let big = `J-${first.days}`;
    if (today) big = 'Aujourd’hui';
    else if (first.days === 1) big = 'Demain';

    return (
        <div className="dial" style={themeStyle(theme)}>
            <Background theme={theme} compact />
            <div className="dial__content">
                <div className="dial__top">
                    <span className="dial__logo">30years</span>
                    <span className="dial__chip">{advent.isDecember ? 'Avent' : theme.label}</span>
                </div>
                <div className="dial__card">
                    {advent.isDecember ? (
                        <>
                            <div className="dial__door" aria-hidden="true">{door}</div>
                            <div className="dial__text">
                                <span className="dial__label dial__label--gold">{ADVENT_TEASERS[door - 1].kind}</span>
                                <span className="dial__title">{ADVENT_TEASERS[door - 1].title}</span>
                                <span className="dial__date">Porte {door} sur 25</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <Penguin
                                hat={today ? 'party' : first.hat}
                                scarf={first.scarf}
                                hatColor={first.hatColor}
                                star={today}
                                size="38vmin"
                                shadow={false}
                            />
                            <div className="dial__text">
                                <span className="dial__label">{today ? 'C’est le jour !' : 'Prochain anniv'}</span>
                                <span className="dial__name">{names}</span>
                                <span className={`dial__big${first.days <= 1 ? ' dial__big--word' : ''}`}>{big}</span>
                                <span className="dial__date">{formatDay(first.nextBirthday)}</span>
                            </div>
                        </>
                    )}
                </div>
                {footer && <div className="dial__foot">{footer}</div>}
            </div>
        </div>
    );
}
