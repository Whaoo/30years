import Penguin from './Penguin';
import Icon from './Icons';
import { formatDay, whenLabel } from '../utils/birthdayLogic';

export default function UpcomingList({ title, items, highlightFirst = false, restLabel, play, onQuiz, onAgenda, agendaNew = 0, extraGames = [] }) {
    return (
        <section className="list-card glass" aria-label="Prochains anniversaires">
            <div className="list-card__head">
                <h2 className="card-title">{title}</h2>
                {/* les anniversaires dans l'agenda du téléphone (AgendaModal.jsx) ; agendaNew : nouveaux venus pas encore ajoutés */}
                {onAgenda && (
                    <button type="button" className={`agenda-chip${agendaNew ? ' agenda-chip--new' : ''}`} onClick={onAgenda} title="Ajouter les anniversaires à l’agenda de ton téléphone">
                        <Icon name="calendar" size={15} />
                        {agendaNew ? `${agendaNew} nouvel${agendaNew > 1 ? 's' : ''} anniversaire${agendaNew > 1 ? 's' : ''}` : 'Dans mon agenda'}
                    </button>
                )}
            </div>
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
            {(restLabel || onQuiz || extraGames.length > 0) && (
                <div className="rest">
                    {restLabel && <span>{restLabel}</span>}
                    {(onQuiz || extraGames.length > 0) && (
                        <span className="quiz-links">
                            {onQuiz && (
                                <button type="button" className="quiz-link" onClick={onQuiz}>
                                    Qui fête quand ? Teste-toi
                                </button>
                            )}
                            {extraGames.map((g) => (
                                <button key={g.id} type="button" className="quiz-link quiz-link--free" onClick={g.onPlay} aria-label={`Jouer à ${g.title}`} title={g.title}>
                                    {g.label}
                                </button>
                            ))}
                        </span>
                    )}
                </div>
            )}
        </section>
    );
}
