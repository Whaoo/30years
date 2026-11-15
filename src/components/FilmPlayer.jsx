import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { FILM } from '../december/calendar';
import { markFilmSeen } from '../december/quest';

// Mode cinéma : un film de la quête (prologue ou cinématique d'épisode) en plein écran, sur fond noir.
// Ouvert depuis un clic (grande annonce du 1er décembre ou carte de la quête) : ce geste autorise
// le plein écran et le son. Échap ou la croix referment ; à la fin, « À toi de jouer ! » ouvre la quête.
const clampTime = (v, t) => Math.max(0, Math.min((v.duration || t) - 0.1, t));

export default function FilmPlayer({ film = FILM, onClose, onPlay }) {
    const wrapRef = useRef(null);
    const videoRef = useRef(null);
    const hideTimer = useRef(0);
    const [ended, setEnded] = useState(false);
    const [chrome, setChrome] = useState(true);

    useEffect(() => {
        markFilmSeen(film.id);
        const wrap = wrapRef.current;
        try {
            const p = wrap.requestFullscreen ? wrap.requestFullscreen({ navigationUI: 'hide' }) : null;
            if (p && p.catch) p.catch(() => {});
        } catch {
            /* plein écran refusé (téléphone, iframe) : la fenêtre noire couvre déjà toute la page */
        }
        const v = videoRef.current;
        const play = v && v.play();
        if (play && play.catch) play.catch(() => {});
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (!v) return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (v.paused) v.play();
                else v.pause();
            }
            // ← → : reculer / avancer de 5 secondes
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
                v.currentTime = clampTime(v, v.currentTime + (e.code === 'ArrowLeft' ? -5 : 5));
            }
        };
        // Avancer et reculer dans la vidéo demande que le serveur sache envoyer un morceau du fichier
        // (requêtes « Range »). Si ce n'est pas le cas, on télécharge le film entier en arrière-plan,
        // puis on bascule sur cette copie locale à l'endroit exact où on en est : la barre de lecture marche partout.
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let blobUrl = '';
        const fullySeekable = () => v.seekable.length > 0 && v.seekable.start(0) <= 0.5 && v.seekable.end(0) >= (v.duration || 0) - 1;
        fetch(film.sources[0].src, ctrl ? { signal: ctrl.signal } : undefined)
            .then((r) => (r.ok ? r.blob() : null))
            .then((blob) => {
                if (!blob || !videoRef.current || fullySeekable()) return;
                blobUrl = URL.createObjectURL(blob);
                const at = v.currentTime;
                const wasPlaying = !v.paused;
                v.addEventListener('loadedmetadata', () => {
                    v.currentTime = at;
                    if (wasPlaying) v.play().catch(() => {});
                }, { once: true });
                v.src = blobUrl;
            })
            .catch(() => { /* hors ligne ou fenêtre fermée : on garde la lecture en continu */ });
        // Sortie du plein écran par le navigateur (Échap natif) : on referme aussi le mode cinéma
        let entered = false;
        const onFs = () => {
            if (document.fullscreenElement) entered = true;
            else if (entered) onClose();
        };
        window.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFs);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('fullscreenchange', onFs);
            clearTimeout(hideTimer.current);
            if (ctrl) ctrl.abort();
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, [onClose, film]);

    // Les boutons s'effacent pendant la lecture et reviennent quand la souris bouge
    const wake = () => {
        setChrome(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setChrome(false), 2200);
    };

    return (
        <div ref={wrapRef} className={`cinema${chrome || ended ? ' is-chrome' : ''}`} role="dialog" aria-modal="true" aria-label={film.title} onMouseMove={wake} onTouchStart={wake} onWheel={(e) => e.stopPropagation()}>
            <video
                ref={videoRef}
                className="cinema__video"
                controls
                playsInline
                preload="auto"
                poster={film.poster}
                onPlay={wake}
                onEnded={() => setEnded(true)}
            >
                {film.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
            </video>
            <button type="button" className="cinema__close" onClick={onClose} aria-label="Fermer le film (Échap)">
                <Icon name="close" size={24} />
            </button>
            {ended && (
                <div className="cinema__end">
                    <p className="cinema__eyebrow">{film.final ? 'Joyeux Noël à toute l’équipe !' : film.ep ? `Épisode ${film.ep} · la suite de la quête` : 'La Grande Quête de Flocon'}</p>
                    {film.final ? (
                        <button type="button" className="btn btn--primary btn--icon cinema__go" onClick={onClose}>
                            <Icon name="close" size={20} />
                            Fermer
                        </button>
                    ) : (
                        <button type="button" className="btn btn--primary btn--icon cinema__go" onClick={onPlay}>
                            <Icon name="play" size={20} />
                            À toi de jouer !
                        </button>
                    )}
                    <button type="button" className="btn btn--ghost" onClick={() => { setEnded(false); videoRef.current.currentTime = 0; videoRef.current.play(); }}>
                        Revoir le film
                    </button>
                </div>
            )}
        </div>
    );
}
