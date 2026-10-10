export default function StatTiles({ tiles }) {
    return (
        <div className="tiles">
            {tiles.map((t) => (
                <div key={t.label} className="tile glass">
                    <span className="tile__value">{t.value}</span>
                    <span className="tile__label">{t.label}</span>
                </div>
            ))}
        </div>
    );
}

export function AdventProgress({ openCount }) {
    return (
        <div className="tile glass tile--progress">
            <div className="tile__row">
                <span className="tile__value">{openCount}/25</span>
                <span className="tile__label">portes ouvertes</span>
            </div>
            <div className="progress">
                <div className="progress__bar" style={{ width: `${(openCount / 25) * 100}%` }} />
            </div>
        </div>
    );
}
