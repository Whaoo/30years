import Icon from './Icons';
import { formatScore } from '../games';

// Les deux jeux de toute l'année, à la place des chiffres sous la liste « Ensuite » (grand écran)
export default function GameTiles({ games, bests, onPlay }) {
    return (
        <div className="tiles">
            {games.map((g) => (
                <button key={g.id} type="button" className="tile glass tile--game" onClick={() => onPlay(g.id)} aria-label={`Jouer à ${g.title}`}>
                    <span className="tile__value tile__value--game">
                        <Icon name={g.icon} size={22} />
                        {g.title}
                    </span>
                    <span className="tile__label">
                        {g.pitch}
                        {bests[g.id] != null && <> · record {formatScore(g, bests[g.id])}</>}
                    </span>
                </button>
            ))}
        </div>
    );
}
