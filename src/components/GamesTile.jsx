import Icon from './Icons';
import { GAMES, formatScore } from '../games';

// Tuile « Mini-jeux » de la vue Avent : un bouton par jeu, verrouillé jusqu'à sa porte
export default function GamesTile({ openCount, bests, onPlay }) {
    return (
        <div className="tile glass games-tile">
            <div className="games-tile__head">
                <span className="games-tile__title">Mini-jeux</span>
                <span className="games-tile__meta">{openCount}/25 portes ouvertes</span>
            </div>
            <div className="games-tile__grid">
                {GAMES.map((g) => {
                    const open = openCount >= g.door;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            className={`gbtn${open ? '' : ' gbtn--locked'}`}
                            aria-disabled={!open}
                            aria-label={open ? `Jouer à ${g.title}` : `${g.title}, disponible le ${g.door} décembre`}
                            title={g.title}
                            onClick={() => onPlay(g.id)}
                        >
                            <Icon name={open ? g.icon : 'lock'} size={20} />
                            <span className="gbtn__name">{g.short}</span>
                            <span className="gbtn__meta">{open ? formatScore(g, bests[g.id]) : `${g.door} déc.`}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
