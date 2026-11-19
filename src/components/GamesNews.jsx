import Icon from './Icons';

// Bandeau d'annonce : les deux premiers jeux libres (18-19 novembre), puis les jeux du jour (deux le 20, ensuite un par jour ouvré),
// avec un bouton par jeu, l'historique et les classements (il cache le bouton « Classements » de l'en-tête tant qu'il est affiché)
export default function GamesNews({ games, daily, onPlay, onAll, onBoards, onClose }) {
    const titre = daily ? games.map((g) => g.title).join(' et ') : 'Le Grand Quiz et Où est-ce ?';
    return (
        <div className="news news--jeux" role="status">
            <span className="news__badge" aria-hidden="true"><Icon name={daily ? games[0].icon : 'trophy'} size={22} /></span>
            <div className="news__text">
                <span className="news__eyebrow">{daily ? (games.length > 1 ? 'Jeux du jour · avec classement' : 'Jeu du jour · avec classement') : 'Nouveau · avec classement'}</span>
                <span className="news__title">{titre}</span>
                <span className="news__actions">
                    {games.map((g) => (
                        <button key={g.id} type="button" className="news__btn" onClick={() => onPlay(g.id)}>
                            <Icon name={g.icon} size={16} />
                            {daily && games.length === 1 ? 'Jouer' : g.short || g.title}
                        </button>
                    ))}
                    {daily && onAll && (
                        <button type="button" className="news__btn news__btn--soft" onClick={onAll}>
                            <Icon name="history" size={16} />
                            Historique
                        </button>
                    )}
                    {onBoards && (
                        <button type="button" className="news__btn news__btn--soft" onClick={onBoards}>
                            <Icon name="trophy" size={16} />
                            Classements
                        </button>
                    )}
                </span>
            </div>
            <button type="button" className="news__close" onClick={onClose} aria-label="Fermer le message">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
        </div>
    );
}
