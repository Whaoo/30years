import { Suspense, lazy, useEffect } from 'react';

const Leaderboard = lazy(() => import('./Leaderboard'));

// Les classements hors fenêtre de jeu : bouton « Classements » de l'en-tête (tous les jeux ouverts),
// et classement de la cave à la remontée (fin = le temps qui vient d'être fait).
// games : les jeux proposés (pastilles en haut) ; jeu : celui affiché ; onPick(id) pour changer.
export default function BoardModal({ games, jeu, fin, onPick, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const game = games.find((g) => g.id === jeu) || games[0];
    if (!game) return null;
    return (
        <div className="game-modal board-modal" role="dialog" aria-modal="true" aria-label={`Classement : ${game.title}`} onWheel={(e) => e.stopPropagation()}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="board-box">
                {games.length > 1 && (
                    <div className="board-jeux" role="group" aria-label="Choix du jeu">
                        {games.map((g) => (
                            <button key={g.id} type="button" aria-pressed={g.id === game.id} title={g.title} onClick={() => onPick(g.id)}>
                                {g.short || g.title}
                            </button>
                        ))}
                    </div>
                )}
                <Suspense fallback={null}>
                    {/* key : un panneau neuf à chaque jeu (onglet, pseudo, place) */}
                    <Leaderboard key={game.id} game={game} fin={fin && fin.jeu === game.id ? fin : null} onClose={onClose} />
                </Suspense>
            </div>
        </div>
    );
}
