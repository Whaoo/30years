import { useEffect } from 'react';
import Icon from './Icons';
import { FILM } from '../december/calendar';

// La grande annonce d'un film de la quête (le prologue le 1er décembre, puis chaque cinématique le jour de son épisode) :
// tant que le film n'a pas été vu, une fenêtre propose de le lancer
// (une fois par jour au plus : « Plus tard » la fait disparaître jusqu'au lendemain).
export default function FilmPromo({ film = FILM, onWatch, onLater }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onLater();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onLater]);

    return (
        <div className="promo" role="dialog" aria-modal="true" aria-labelledby="promo-title" onWheel={(e) => e.stopPropagation()}>
            <div className="promo__card glass">
                <button type="button" className="promo__poster" onClick={onWatch} aria-label="Regarder le film">
                    <img src={film.poster} alt="" />
                    <span className="promo__play"><Icon name="play" size={34} /></span>
                    <span className="promo__time">{film.length}</span>
                </button>
                <div className="promo__text">
                    <span className="eyebrow">{film.promo.eyebrow}</span>
                    <h2 id="promo-title" className="promo__title">{film.promo.title}</h2>
                    <p>{film.promo.text}</p>
                    <div className="promo__actions">
                        <button type="button" className="btn btn--primary btn--icon" onClick={onWatch}>
                            <Icon name="film" size={18} />
                            Regarder le film
                        </button>
                        <button type="button" className="btn btn--ghost" onClick={onLater}>Plus tard</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
