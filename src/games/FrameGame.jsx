import { useEffect, useRef } from 'react';

// Jeu autonome (une page HTML de public/jeux/) affiché dans un cadre de la fenêtre de jeu.
// La page renvoie son score par postMessage : { type: '30years:score', game, score }.
// On n'écoute que notre propre cadre, sur la même origine.
export default function FrameGame({ src, title, gameId, onScore }) {
    const frame = useRef(null);

    useEffect(() => {
        const onMessage = (e) => {
            if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
            const d = e.data;
            if (!d || d.type !== '30years:score' || d.game !== gameId) return;
            const score = Math.round(Number(d.score));
            if (Number.isFinite(score) && score > 0) onScore(score);
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [gameId, onScore]);

    // le cadre prend le focus pour que le clavier serve tout de suite au jeu
    return <iframe ref={frame} className="frame-game" src={src} title={title} onLoad={() => frame.current?.focus()} />;
}
