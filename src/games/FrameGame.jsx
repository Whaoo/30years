import { useEffect, useRef } from 'react';
import { proposerFantome, retenirFantome } from '../utils/leaderboard';

// Jeu autonome (une page HTML de public/jeux/) affiché dans un cadre de la fenêtre de jeu.
// La page renvoie son score par postMessage : { type: '30years:score', game, score }.
// Un jeu à plusieurs classements (Col du Fuji : un par circuit) envoie aussi { type: '30years:circuit', board, label }
// et ses scores sous « <jeu>-<n> » ; un record peut venir avec son fantôme ({ type: '30years:fantome', game, score, data }),
// gardé jusqu'à l'envoi du score (src/utils/leaderboard.js). On n'écoute que notre propre cadre, sur la même origine.
export default function FrameGame({ src, title, gameId, onScore, onBoard }) {
    const frame = useRef(null);

    useEffect(() => {
        const onMessage = (e) => {
            if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
            const d = e.data;
            const ok = (g) => g === gameId || (typeof g === 'string' && g.startsWith(gameId + '-') && g.length <= gameId.length + 4);
            if (!d) return;
            if (d.type === '30years:circuit' && ok(d.board)) { if (onBoard) onBoard(d.board, String(d.label || '').slice(0, 40)); return; }
            if (d.type === '30years:fantome' && ok(d.game)) {
                // existant : le fantôme d'un record déjà au classement (gardé sur cet appareil), proposé à l'ouverture du jeu
                (d.existant ? proposerFantome : retenirFantome)(d.game, Math.round(Number(d.score)), d.data);
                return;
            }
            if (d.type !== '30years:score' || !ok(d.game)) return;
            const score = Math.round(Number(d.score));
            if (Number.isFinite(score) && score > 0) onScore(score, d.game);
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [gameId, onScore, onBoard]);

    // le cadre prend le focus pour que le clavier serve tout de suite au jeu
    return <iframe ref={frame} className="frame-game" src={src} title={title} allow="fullscreen" allowFullScreen onLoad={() => frame.current?.focus()} />;
}
