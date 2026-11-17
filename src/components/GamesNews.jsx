import Icon from './Icons';

// Bandeau d'annonce des deux jeux libres (18-25 novembre 2026), avec un bouton pour chacun
export default function GamesNews({ games, onPlay, onClose }) {
    return (
        <div className="news news--jeux" role="status">
            <span className="news__badge" aria-hidden="true"><Icon name="trophy" size={22} /></span>
            <div className="news__text">
                <span className="news__eyebrow">Nouveau · avec classement</span>
                <span className="news__title">Le Grand Quiz et Où est-ce ?</span>
                <span className="news__actions">
                    {games.map((g) => (
                        <button key={g.id} type="button" className="news__btn" onClick={() => onPlay(g.id)}>
                            <Icon name={g.icon} size={16} />
                            {g.title}
                        </button>
                    ))}
                </span>
            </div>
            <button type="button" className="news__close" onClick={onClose} aria-label="Fermer le message">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
        </div>
    );
}
