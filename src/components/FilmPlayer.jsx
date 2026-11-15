import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { FILM } from '../december/calendar';
import { markFilmSeen } from '../december/quest';

// Mode cinéma : le prologue de la quête en plein écran, sur fond noir.
// Ouvert depuis un clic (grande annonce du 1er décembre ou carte de la quête) : ce geste autorise
// le plein écran et le son. Échap ou la croix referment ; à la fin, « À toi de jouer ! » ouvre la quête.
export default function FilmPlayer({ onClose, onPlay }) {
    const wrapRef = useRef(null);
    const videoRef = useRef(null);
    const hideTimer = useRef(0);
    const [ended, setEnded] = useState(false);
    const [chrome, setChrome] = useState(true);

    useEffect(() => {
        markFilmSeen();
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
            if (e.code === 'Space' && v) {
                e.preventDefault();
                if (v.paused) v.play();
                else v.pause();
            }
        };
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
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, [onClose]);

    // Les boutons s'effacent pendant la lecture et reviennent quand la souris bouge
    const wake = () => {
        setChrome(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setChrome(false), 2200);
    };

    return (
        <div ref={wrapRef} className={`cinema${chrome || ended ? ' is-chrome' : ''}`} role="dialog" aria-modal="true" aria-label="Le prologue de la quête" onMouseMove={wake} onTouchStart={wake} onWheel={(e) => e.stopPropagation()}>
            <video
                ref={videoRef}
                className="cinema__video"
                controls
                playsInline
                preload="auto"
                poster={FILM.poster}
                onPlay={wake}
                onEnded={() => setEnded(true)}
            >
                {FILM.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
            </video>
            <button type="button" className="cinema__close" onClick={onClose} aria-label="Fermer le film (Échap)">
                <Icon name="close" size={24} />
            </button>
            {ended && (
                <div className="cinema__end">
                    <p className="cinema__eyebrow">La Grande Quête de Flocon</p>
                    <button type="button" className="btn btn--primary btn--icon cinema__go" onClick={onPlay}>
                        <Icon name="play" size={20} />
                        À toi de jouer !
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => { setEnded(false); videoRef.current.currentTime = 0; videoRef.current.play(); }}>
                        Revoir le film
                    </button>
                </div>
            )}
        </div>
    );
}
