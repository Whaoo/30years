import { useEffect, useState } from 'react';
import Icon from './Icons';
import Penguin from './Penguin';
import { FILM, QUEST } from '../december/calendar';
import { SKIP_AFTER_FAILS, episodeState, loadQuest, markFilmSeen, markSkipped, redeemCode, shardCount } from '../december/quest';

// La carte de la Grande Quête de Flocon : le film d'introduction, les 4 épisodes (débloqués par date
// ET par la réussite du précédent), les éclats de givre récupérés et la saisie d'un code de passage
// (pour continuer la quête dans un autre navigateur ou sur son téléphone).

const MONTHS_SHORT = 'janv. févr. mars avr. mai juin juil. août sept. oct. nov. déc.'.split(' ');
const fmtDay = (d) => `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

// Décor de la carte (étiré à la taille de la carte ; les étapes sont placées en % par-dessus)
function MapArt() {
    return (
        <svg className="quest__art" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="qsky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7fb2e5" />
                    <stop offset="0.6" stopColor="#c7def4" />
                    <stop offset="1" stopColor="#eef5fc" />
                </linearGradient>
            </defs>
            <rect width="1000" height="600" fill="url(#qsky)" />
            <path d="M0 250 L90 170 L170 230 L260 120 L360 220 L450 150 L560 230 L650 160 L760 230 L860 140 L1000 230 V600 H0Z" fill="#a9c3e4" />
            <path d="M260 120 L290 150 L275 148 L260 165 L245 148 L232 152Z M650 160 L676 186 L650 196 L628 184Z M860 140 L890 170 L860 180 L834 168Z" fill="#f4f9ff" />
            <path d="M0 330 Q250 280 500 320 T1000 300 V600 H0Z" fill="#dbe8f6" />
            <path d="M0 430 Q300 380 600 430 T1000 420 V600 H0Z" fill="#f4f9ff" />
            {/* Les Monts Givrés */}
            <path d="M110 420 L190 300 L230 350 L280 260 L360 420Z" fill="#7f9fcf" />
            <path d="M280 260 L305 300 L290 296 L280 312 L268 296 L255 300Z M190 300 L208 328 L190 322 L176 330Z" fill="#ffffff" />
            <g transform="translate(0 -85)">
            {/* le village et son grand sapin */}
            <path d="M420 200 L452 250 L436 250 L462 290 L378 290 L404 250 L388 250Z" fill="#1f6b48" />
            <path d="M420 186 l5 10 11 1 -8 7 3 11 -11 -6 -11 6 3 -11 -8 -7 11 -1Z" fill="#ffd36e" />
            <path d="M470 270 h34 v22 h-34Z M466 272 l21 -16 21 16Z" fill="#c2182a" />
            <path d="M350 274 h28 v18 h-28Z M346 276 l18 -13 18 13Z" fill="#3b82f6" />
            </g>
            <g transform="translate(0 -75)">
            {/* le centre de tri */}
            <path d="M610 230 h110 v50 h-110Z" fill="#d7263d" />
            <path d="M602 232 L665 200 L728 232Z" fill="#a5121f" />
            <path d="M628 252 h24 v28 h-24Z M670 248 h30 v16 h-30Z" fill="#f4e6c8" />
            <path d="M720 268 h60 v8 h-60Z" fill="#5c6f8f" />
            </g>
            {/* le fort du Golem : un bloc de glace brut, trois encoches vides pour les éclats */}
            <path d="M790 400 L800 330 L826 300 L842 318 L868 270 L900 305 L918 292 L940 340 L950 400Z" fill="#8fc6ef" />
            <path d="M868 270 L900 305 L918 292 L940 340 L950 400 L880 400Z" fill="#6aaee0" />
            <path d="M840 352 l8 -14 8 14 -8 14Z M868 340 l8 -14 8 14 -8 14Z M896 352 l8 -14 8 14 -8 14Z" fill="#244a7a" />
            {/* l'igloo de Mamie */}
            <path d="M40 520 a42 42 0 0 1 84 0Z" fill="#f4f9ff" stroke="#c9d4e6" strokeWidth="2" />
            <path d="M92 520 a12 12 0 0 1 24 0Z" fill="#ffb15e" />
            {[[150, 470], [560, 470], [740, 500], [330, 520], [980, 480]].map(([x, y]) => (
                <path key={x} d={`M${x} ${y - 40} L${x + 14} ${y - 14} L${x + 7} ${y - 14} L${x + 18} ${y} L${x - 18} ${y} L${x - 7} ${y - 14} L${x - 14} ${y - 14}Z`} fill="#2b6b5a" />
            ))}
        </svg>
    );
}

export default function QuestModal({ now, onPlay, onClose, available = () => true }) {
    const [q, setQ] = useState(loadQuest);
    const [film, setFilm] = useState(false);
    const [code, setCode] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (film) setFilm(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [film, onClose]);

    const filmOpen = now >= FILM.from;
    const shards = shardCount(q);

    const openFilm = () => {
        setFilm(true);
        setQ(markFilmSeen());
    };

    const submitCode = (e) => {
        e.preventDefault();
        const ep = redeemCode(code);
        if (ep) {
            setQ(loadQuest());
            setMsg(`Épisode ${ep.ep} validé : ${ep.title}.`);
            setCode('');
        } else setMsg('Ce code ne correspond à aucun épisode. Vérifie les 4 lettres.');
    };

    // tracé de la carte (pourcentages de la carte, comme QUEST.place)
    const pts = [[8, 84], ...QUEST.map((e) => e.place)];
    const pathD = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

    return (
        <div className="game-modal" role="dialog" aria-modal="true" aria-labelledby="quest-title" onWheel={(e) => e.stopPropagation()}>
            <div className="game-panel quest">
                <header className="game-head">
                    <div className="game-head__title">
                        <span className="eyebrow">Décembre · la grande quête</span>
                        <h2 id="quest-title" className="game-title">La Grande Quête de Flocon</h2>
                    </div>
                    <span className="game-best quest__shards" title="Éclats de givre récupérés">
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={`quest__shard${i < shards ? ' is-on' : ''}`}>
                                <Icon name="shard" size={16} />
                            </span>
                        ))}
                        <span>{shards} / 3 éclats</span>
                    </span>
                    <button type="button" className="game-close" onClick={onClose} aria-label="Fermer la quête (Échap)">
                        <Icon name="close" size={22} />
                    </button>
                </header>

                {film ? (
                    <div className="quest__film">
                        {/* La vidéo démarre au clic (geste de l'utilisateur) : le son est autorisé par le navigateur */}
                        <video controls autoPlay playsInline preload="metadata" poster={FILM.poster}>
                            {FILM.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
                        </video>
                        <button type="button" className="btn btn--ghost" onClick={() => setFilm(false)}>← Retour à la carte</button>
                    </div>
                ) : (
                    <div className="quest__body">
                        <div className="quest__map" aria-label="Carte de la quête">
                            <MapArt />
                            <svg className="quest__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                <path d={pathD} />
                            </svg>
                            <span className="quest__home" style={{ left: '8%', top: '84%' }}>Igloo de Mamie</span>
                            {QUEST.map((ep) => {
                                const st = episodeState(ep.id, now, q);
                                const fails = q.fails[ep.id] || 0;
                                const done = st === 'done' || q.skipped[ep.id];
                                const canPlay = (st === 'open' || st === 'done') && available(ep.id);
                                let note = '';
                                if (st === 'done') note = q.done[ep.id].score ? `${q.done[ep.id].score.toLocaleString('fr-FR')} pts` : 'Réussi';
                                else if (q.skipped[ep.id]) note = 'Passé';
                                else if (st === 'locked-date') note = `Le ${fmtDay(ep.from)}`;
                                else if (st === 'locked-prev') note = `Après l’épisode ${ep.ep - 1}`;
                                else if (!available(ep.id)) note = 'Bientôt';
                                else note = 'Ouvert !';
                                return (
                                    <div key={ep.id} className={`quest__stop is-${done ? 'done' : st}`} style={{ left: `${ep.place[0]}%`, top: `${ep.place[1]}%` }}>
                                        <button
                                            type="button"
                                            className="quest__pin"
                                            disabled={!canPlay}
                                            onClick={() => onPlay(ep.id)}
                                            aria-label={`Épisode ${ep.ep}, ${ep.title} : ${note}`}
                                        >
                                            {done ? '✓' : ep.ep}
                                        </button>
                                        <span className="quest__label">
                                            <strong>{ep.title}</strong>
                                            <span>{ep.kind} · {note}</span>
                                        </span>
                                        {st === 'open' && !done && fails >= SKIP_AFTER_FAILS && (
                                            <button type="button" className="quest__skip" onClick={() => setQ(markSkipped(ep.id))}>
                                                Passer l’épisode
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <aside className="quest__side">
                            <div className="quest__card">
                                <Penguin hat="beanie" scarf="#e94b4b" mood="happy" size="72px" />
                                <div>
                                    <strong>Le prologue</strong>
                                    <p>Deux minutes pour savoir pourquoi Flocon quitte l’igloo de Mamie.</p>
                                    <button type="button" className="btn btn--primary btn--icon" disabled={!filmOpen} onClick={openFilm}>
                                        <Icon name="film" size={18} />
                                        {filmOpen ? (q.film ? 'Revoir le film' : 'Regarder le film') : `Le ${fmtDay(FILM.from)}`}
                                    </button>
                                </div>
                            </div>
                            <p className="quest__rules">
                                Chaque épisode s’ouvre à sa date, une fois le précédent réussi. Pas de panique :
                                il s’ouvre de toute façon deux jours plus tard. Le grand final est ouvert à tous.
                            </p>
                            <form className="quest__code" onSubmit={submitCode}>
                                <label htmlFor="quest-code">Déjà joué ailleurs ? Code de passage</label>
                                <div>
                                    <input id="quest-code" value={code} maxLength={4} autoComplete="off" spellCheck="false" placeholder="ABCD" onChange={(e) => setCode(e.target.value.toUpperCase())} />
                                    <button type="submit" className="btn btn--ghost">Valider</button>
                                </div>
                                {msg && <p className="quest__msg" role="status">{msg}</p>}
                            </form>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
