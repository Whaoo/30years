import Icon from './Icons';
import { formatScore } from '../games';

// Sous la liste « Ensuite » (grand écran) : le jeu du jour, et la porte vers tous les jeux libres
export default function GameTiles({ today, games, bests, onPlay, onAll }) {
    const first = today || games[0];
    const autres = games.filter((g) => g !== first).map((g) => g.short || g.title);
    return (
        <div className="tiles">
            {first && (
                <button type="button" className="tile glass tile--game" onClick={() => onPlay(first.id)} aria-label={`Jouer à ${first.title}`}>
                    <span className="tile__eyebrow">{today ? 'Jeu du jour' : 'À jouer'}</span>
                    <span className="tile__value tile__value--game">
                        <Icon name={first.icon} size={22} />
                        {first.title}
                    </span>
                    <span className="tile__label">
                        {first.pitch}
                        {bests[first.id] != null && <> · record {formatScore(first, bests[first.id])}</>}
                    </span>
                </button>
            )}
            <button type="button" className="tile glass tile--game" onClick={onAll} aria-label="Tous les jeux">
                <span className="tile__eyebrow">{games.length} jeux à jouer</span>
                <span className="tile__value tile__value--game">
                    <Icon name="grid" size={22} />
                    Tous les jeux
                </span>
                <span className="tile__label">{autres.join(', ')}</span>
            </button>
        </div>
    );
}
