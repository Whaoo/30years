import Icon from './Icons';
import { formatScore } from '../games';

// Sous la liste « Ensuite » (grand écran) : les jeux du jour (deux le 20 novembre) ;
// s'il n'y en a qu'un, la deuxième tuile ouvre l'historique des jeux de novembre
export default function GameTiles({ todays, games, bests, onPlay, onHistory }) {
    const tiles = (todays.length ? todays : games).slice(0, 2);
    const autres = games.filter((g) => !tiles.includes(g)).map((g) => g.short || g.title);
    return (
        <div className="tiles">
            {tiles.map((g) => (
                <button key={g.id} type="button" className="tile glass tile--game" onClick={() => onPlay(g.id)} aria-label={`Jouer à ${g.title}`}>
                    <span className="tile__eyebrow">{todays.length ? 'Jeu du jour' : 'À jouer'}</span>
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
            {tiles.length < 2 && (
                <button type="button" className="tile glass tile--game" onClick={onHistory} aria-label="Historique des jeux de novembre">
                    <span className="tile__eyebrow">{autres.length} jeux de novembre</span>
                    <span className="tile__value tile__value--game">
                        <Icon name="history" size={22} />
                        Historique
                    </span>
                    <span className="tile__label">{autres.join(', ')}</span>
                </button>
            )}
        </div>
    );
}
