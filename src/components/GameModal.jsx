import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { formatScore } from '../games';
import { config, moi } from '../utils/leaderboard';
import { questionPour } from '../utils/avis';
import AvisPopup from './AvisPopup';
import PseudoGate, { pseudoPlusTard } from './PseudoGate';

const Leaderboard = lazy(() => import('./Leaderboard'));

// Fenêtre plein écran qui accueille un mini-jeu (chargé à la demande)
export default function GameModal({ game, best, onScore, onClose, gameProps, now }) {
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
    // Avant le jeu : une question éventuelle (avis), puis le pseudo s'il n'y en a pas encore. null = on vérifie.
    const [etape, setEtape] = useState(null);
    const [question] = useState(() => questionPour(game, now));
    const [suggestion, setSuggestion] = useState('');
    const enLigneRef = useRef(false);
    enLigneRef.current = enLigne;
    const pseudoAvant = () => enLigneRef.current && !moi() && !pseudoPlusTard();
    useEffect(() => {
        let vivant = true;
        // l'API ne répond pas vite : on joue sans attendre
        const t = setTimeout(() => vivant && setEtape((e) => e || 'jeu'), 2500);
        config().then((c) => {
            if (!vivant) return;
            setEnLigne(!!c); enLigneRef.current = !!c;
            setEtape((e) => e || (c && question ? 'avis' : pseudoAvant() ? 'pseudo' : 'jeu'));
        });
        return () => { vivant = false; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const apresAvis = (estLaPersonne) => {
        if (estLaPersonne && question) setSuggestion(question.pour);
        setEtape(pseudoAvant() ? 'pseudo' : 'jeu');
    };

    // Jeu à plusieurs classements (Col du Fuji : un par circuit) : le jeu dit lequel est en cours
    const [sous, setSous] = useState(null);
    const choisirSous = useCallback((id) => { setSous(id === game.id ? null : id); }, [game.id]);
    const jeuBoard = sous ? { ...game, id: sous } : game;

    // Fin de partie : record local comme avant (classement principal seulement), puis le classement s'ouvre avec ce score
    const handleScore = useCallback((score, jeu) => {
        const record = !jeu || jeu === game.id ? onScore(game.id, score) : false;
        if (score > 0 && enLigneRef.current) {
            setFin((f) => ({ score, jeu: jeu || game.id, n: (f?.n || 0) + 1 }));
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
                        {etape === 'jeu' ? (
                            <Suspense fallback={<p className="game-loading">Chargement…</p>}>
                                <Game onScore={handleScore} onBoard={choisirSous} {...gameProps} />
                            </Suspense>
                        ) : etape === 'avis' ? (
                            <AvisPopup question={question} jeu={game.id} onDone={apresAvis} />
                        ) : etape === 'pseudo' ? (
                            <PseudoGate game={game} suggestion={suggestion} onDone={() => setEtape('jeu')} />
                        ) : <p className="game-loading">Chargement…</p>}
                    </div>
                    {boardOpen && (
                        <Suspense fallback={null}>
                            <Leaderboard game={jeuBoard} fin={fin && fin.jeu === jeuBoard.id ? fin : null} onClose={() => setBoardOpen(false)} />
                        </Suspense>
                    )}
                </div>
                <p className="game-help">{game.help}</p>
            </div>
        </div>
    );
}
