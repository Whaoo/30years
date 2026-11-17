import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { formatScore } from '../games';
import { config } from '../utils/leaderboard';

const Leaderboard = lazy(() => import('./Leaderboard'));

// Fenêtre plein écran qui accueille un mini-jeu (chargé à la demande)
export default function GameModal({ game, best, onScore, onClose, gameProps }) {
    const closeRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Classement en ligne : affiché seulement si l'API répond (Cloudflare Pages Functions + D1)
    const [enLigne, setEnLigne] = useState(false);
    const [boardOpen, setBoardOpen] = useState(false);
    const [fin, setFin] = useState(null);
    useEffect(() => {
        let vivant = true;
        config().then((c) => vivant && setEnLigne(!!c));
        return () => { vivant = false; };
    }, []);
    const enLigneRef = useRef(false);
    enLigneRef.current = enLigne;

    // Fin de partie : record local comme avant, puis le classement s'ouvre avec ce score
    const handleScore = useCallback((score) => {
        const record = onScore(game.id, score);
        if (score > 0 && enLigneRef.current) {
            setFin((f) => ({ score, n: (f?.n || 0) + 1 }));
            setBoardOpen(true);
        }
        return record;
    }, [game.id, onScore]);
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
                        <span className="eyebrow">{game.eyebrow || `Mini-jeu · porte ${game.door}`}</span>
                        <h2 id="game-title" className="game-title">{game.title}</h2>
                    </div>
                    <span className="game-best">
                        <Icon name="trophy" size={18} />
                        <span>Record : {formatScore(game, best)}</span>
                    </span>
                    {enLigne && (
                        <button type="button" className={`game-board-btn${boardOpen ? ' is-on' : ''}`} onClick={() => setBoardOpen((o) => !o)} aria-pressed={boardOpen}>
                            Classement
                        </button>
                    )}
                    <button ref={closeRef} type="button" className="game-close" onClick={onClose} aria-label="Fermer le jeu (Échap)">
                        <Icon name="close" size={22} />
                    </button>
                </header>
                <div className={`game-body${boardOpen ? ' has-board' : ''}`}>
                    <div className="game-stage">
                        <Suspense fallback={<p className="game-loading">Chargement…</p>}>
                            <Game onScore={handleScore} {...gameProps} />
                        </Suspense>
                    </div>
                    {boardOpen && (
                        <Suspense fallback={null}>
                            <Leaderboard game={game} fin={fin} onClose={() => setBoardOpen(false)} />
                        </Suspense>
                    )}
                </div>
                <p className="game-help">{game.help}</p>
            </div>
        </div>
    );
}
