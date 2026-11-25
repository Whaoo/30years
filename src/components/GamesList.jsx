import { useEffect } from 'react';
import Icon from './Icons';
import { dayLabel, formatScore } from '../games';

// Historique : tous les jeux de novembre déjà sortis, jouables même après leur jour (ceux du jour en tête),
// avec la date de sortie et le record de ce navigateur (et, pour le Col du Fuji, le circuit du jour : game.note)
export default function GamesList({ games, todays, bests, now, onPlay, onBoards, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const autres = games.filter((g) => !todays.includes(g)).sort((a, b) => (b.from || 0) - (a.from || 0));
    const liste = [...todays, ...autres];
    return (
        <div className="game-modal board-modal" role="dialog" aria-modal="true" aria-label="Historique des jeux" onWheel={(e) => e.stopPropagation()}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="glist">
                <div className="glist__head">
                    <h3 className="glist__title"><Icon name="history" size={18} /> Historique · les jeux de novembre</h3>
                    <button type="button" className="lb__close" onClick={onClose} aria-label="Fermer"><Icon name="close" size={18} /></button>
                </div>
                <ul className="glist__list">
                    {liste.map((g) => (
                        <li key={g.id}>
                            <button type="button" className="glist__item" onClick={() => onPlay(g.id)}>
                                <span className="glist__icon"><Icon name={g.icon} size={22} /></span>
                                <span className="glist__txt">
                                    <b>{g.title}{todays.includes(g) ? <em>Jeu du jour</em> : <i>{dayLabel(g)}</i>}</b>
                                    <span>{g.pitch}</span>
                                    {g.note && g.note(now) && <span className="glist__note">{g.note(now)}</span>}
                                </span>
                                <span className="glist__rec">{bests[g.id] != null ? formatScore(g, bests[g.id]) : 'à toi'}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                {onBoards && <button type="button" className="glist__boards" onClick={onBoards}><Icon name="trophy" size={16} /> Classements et podiums</button>}
                <p className="glist__pied">Un nouveau jeu chaque jour de semaine à 9 h jusqu’au 30 novembre ; les anciens restent jouables ici.</p>
            </div>
        </div>
    );
}
