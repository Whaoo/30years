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
