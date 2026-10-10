import Penguin from './Penguin';
import { formatDay, whenLabel } from '../utils/birthdayLogic';

export default function UpcomingList({ title, items, highlightFirst = false, restLabel, play }) {
    return (
        <section className="list-card glass" aria-label="Prochains anniversaires">
            <h2 className="card-title">{title}</h2>
            <ul className="list">
                {items.map((p, i) => {
                    const s = play.stateFor(p.id);
                    const today = p.days === 0;
                    const hat = today || s.party ? 'party' : p.hat;
                    return (
                        <li key={p.id} className={`row${highlightFirst && i === 0 ? ' row--hl' : ''}`}>
                            <button
                                type="button"
                                className="pbtn"
                                onClick={() => play.click(p.id)}
                                aria-label={`Pingouin de ${p.name}, cliquer pour le saluer`}
                            >
                                <span className={s.spinning ? 'spin' : 'pwrap'}>
                                    <Penguin
                                        hat={hat}
                                        scarf={p.scarf}
                                        hatColor={p.hatColor}
                                        mood={s.mood || 'normal'}
                                        wave={s.waving}
                                        star={today}
                                        size="clamp(42px, 7.4vh, 70px)"
                                        shadow={false}
                                    />
                                </span>
                            </button>
                            <div className="row__text">
                                <span className="row__name">{p.name}</span>
                                <span className="row__date">{formatDay(p.nextBirthday)}</span>
                            </div>
                            <span className={`when${p.days <= 7 ? ' when--soon' : ''}`}>{whenLabel(p.days)}</span>
                            {s.bubble && <span className="bubble bubble--row" key={s.bubble}>{s.bubble}</span>}
                        </li>
                    );
                })}
            </ul>
            {restLabel && <p className="rest">{restLabel}</p>}
        </section>
    );
}
