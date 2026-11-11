// Bandeau « il y a du nouveau » (12-18 novembre 2026) : un indice, sans rien dévoiler
export default function NewsBanner({ onClose }) {
    return (
        <div className="news" role="status">
            <svg className="news__icon" width="38" height="38" viewBox="-50 -120 100 124" aria-hidden="true">
                <ellipse cx="-22" cy="-36" rx="26" ry="34" fill="#e8741c" />
                <ellipse cx="22" cy="-36" rx="26" ry="34" fill="#e8741c" />
                <ellipse cx="0" cy="-36" rx="28" ry="36" fill="#ff8a2a" />
                <path d="M-24 -42L-12 -54L-2 -42Z M24 -42L12 -54L2 -42Z M-26 -24Q0 -6 26 -24Q20 -16 12 -14L8 -20L2 -13L-4 -20L-10 -13L-16 -18Q-22 -19 -26 -24Z" fill="#3a1a05" />
                <path d="M-30 -66C-26 -100 18 -112 40 -96C30 -92 22 -86 26 -70Z" fill="#d7263d" />
                <rect x="-36" y="-74" width="68" height="14" rx="7" fill="#fff" />
                <circle cx="44" cy="-96" r="9" fill="#fff" />
            </svg>
            <div className="news__text">
                <span className="news__eyebrow">Nouveau · jeudi 12 novembre</span>
                <span className="news__title">Quelque chose s’est réveillé sous la page…</span>
                <span className="news__sub">Descends tout en bas, et insiste.</span>
            </div>
            <button type="button" className="news__close" onClick={onClose} aria-label="Fermer le message">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
        </div>
    );
}
