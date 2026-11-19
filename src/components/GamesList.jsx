import { useEffect } from 'react';
import Icon from './Icons';
import { formatScore } from '../games';

// Fenêtre « Tous les jeux » : les jeux libres déjà sortis (le jeu du jour en tête), avec le record de ce navigateur
export default function GamesList({ games, today, bests, onPlay, onBoards, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const liste = today ? [today, ...games.filter((g) => g !== today)] : games;
    return (
        <div className="game-modal board-modal" role="dialog" aria-modal="true" aria-label="Tous les jeux" onWheel={(e) => e.stopPropagation()}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="glist">
                <div className="glist__head">
                    <h3 className="glist__title"><Icon name="grid" size={18} /> Tous les jeux</h3>
                    <button type="button" className="lb__close" onClick={onClose} aria-label="Fermer"><Icon name="close" size={18} /></button>
                </div>
                <ul className="glist__list">
                    {liste.map((g) => (
                        <li key={g.id}>
                            <button type="button" className="glist__item" onClick={() => onPlay(g.id)}>
                                <span className="glist__icon"><Icon name={g.icon} size={22} /></span>
                                <span className="glist__txt">
                                    <b>{g.title}{g === today && <em>Jeu du jour</em>}</b>
                                    <span>{g.pitch}</span>
                                </span>
                                <span className="glist__rec">{bests[g.id] != null ? formatScore(g, bests[g.id]) : 'à toi'}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                {onBoards && <button type="button" className="glist__boards" onClick={onBoards}><Icon name="trophy" size={16} /> Classements et podiums</button>}
                <p className="glist__pied">Un nouveau jeu chaque jour de semaine à 9 h, jusqu’au 30 novembre.</p>
            </div>
        </div>
    );
}
