import Icon from './Icons';
import WeatherWidget from './WeatherWidget';

function LogoMark() {
    return (
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
            <circle cx="17" cy="17" r="16" style={{ fill: 'var(--accent)' }} />
            <path d="M17 6C12 6 9 10 9 16C9 22 12 27 17 27C22 27 25 22 25 16C25 10 22 6 17 6Z" fill="#1d2542" />
            <ellipse cx="17" cy="21" rx="5.5" ry="6" fill="#f4f7fb" />
            <circle cx="14" cy="14" r="1.8" fill="#fff" />
            <circle cx="20" cy="14" r="1.8" fill="#fff" />
            <path d="M15 16.5Q17 15.5 19 16.5Q18.5 18.5 17 18.7Q15.5 18.5 15 16.5Z" fill="#ff9f43" />
        </svg>
    );
}

export default function Header({ theme, weather, isAvent, isDecember, daysToStart, onHome, onAvent, onLogo }) {
    return (
        <header className="header">
            <div className="header__left">
                <button type="button" className="logo glass" onClick={onLogo} aria-label="30years">
                    <LogoMark />
                    <span>30years</span>
                </button>
                <span className="chip glass-soft hide-sm">
                    <span className="chip__dot" />
                    <span>{theme.label} · {theme.timeLabel}</span>
                </span>
                <WeatherWidget weather={weather} night={theme.timeOfDay === 'night'} />
            </div>
            <nav className="segs glass" aria-label="Choix de la vue">
                <button type="button" className="seg" aria-pressed={!isAvent} onClick={onHome}>
                    Anniversaires
                </button>
                <button
                    type="button"
                    className="seg"
                    aria-pressed={isAvent}
                    aria-disabled={!isDecember}
                    onClick={onAvent}
                >
                    <span className="seg__long">Calendrier de l&apos;Avent</span>
                    <span className="seg__short">Avent</span>
                    {!isDecember && (
                        <span className="seg__lock">
                            <Icon name="lock" size={13} />
                            <span>J-{daysToStart}</span>
                        </span>
                    )}
                </button>
            </nav>
        </header>
    );
}
