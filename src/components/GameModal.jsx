import { Suspense, useCallback, useEffect, useRef } from 'react';
import Icon from './Icons';
import { formatScore } from '../games';

// Fenêtre plein écran qui accueille un mini-jeu (chargé à la demande)
export default function GameModal({ game, best, onScore, onClose }) {
    const closeRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleScore = useCallback((score) => onScore(game.id, score), [game.id, onScore]);
    const Game = game.component;

    return (
        <div
            className="game-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-title"
            onWheel={(e) => e.stopPropagation()}
        >
            <div className="game-panel glass">
                <header className="game-head">
                    <div className="game-head__title">
                        <span className="eyebrow">Mini-jeu · porte {game.door}</span>
                        <h2 id="game-title" className="game-title">{game.title}</h2>
                    </div>
                    <span className="game-best">
                        <Icon name="trophy" size={18} />
                        <span>Record : {formatScore(game, best)}</span>
                    </span>
                    <button ref={closeRef} type="button" className="game-close" onClick={onClose} aria-label="Fermer le jeu (Échap)">
                        <Icon name="close" size={22} />
                    </button>
                </header>
                <div className="game-stage">
                    <Suspense fallback={<p className="game-loading">Chargement…</p>}>
                        <Game onScore={handleScore} />
                    </Suspense>
                </div>
                <p className="game-help">{game.help}</p>
            </div>
        </div>
    );
}
