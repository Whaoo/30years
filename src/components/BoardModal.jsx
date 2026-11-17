import { Suspense, lazy, useEffect } from 'react';

const Leaderboard = lazy(() => import('./Leaderboard'));

// Classement seul, hors fenêtre de jeu (la cave) : le même panneau, en fenêtre
export default function BoardModal({ game, fin, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="game-modal board-modal" role="dialog" aria-modal="true" aria-label={`Classement : ${game.title}`} onWheel={(e) => e.stopPropagation()}>
            <Suspense fallback={null}>
                <Leaderboard game={game} fin={fin} onClose={onClose} />
            </Suspense>
        </div>
    );
}
