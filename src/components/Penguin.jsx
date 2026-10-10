// Pingouin maison (personnage original). Props :
// hat: 'none' | 'beanie' | 'shades' | 'party'
// mood: 'normal' | 'happy' | 'surprised' | 'wink'
// wave: lève la nageoire et fait coucou, star: petites étoiles autour (jour d'anniversaire)
// size: hauteur CSS (ex. '240px', 'clamp(160px, 38vh, 360px)')

const STAR_PATH = 'M0 -7L1.8 -1.8L7 0L1.8 1.8L0 7L-1.8 1.8L-7 0L-1.8 -1.8Z';
const SPARKLES = [
    { x: 4, y: 4, s: 1, delay: '0s' },
    { x: 96, y: -2, s: 0.8, delay: '0.5s' },
    { x: 100, y: 58, s: 0.7, delay: '1s' },
    { x: 0, y: 66, s: 0.9, delay: '0.75s' }
];

function Eyes({ kind }) {
    if (kind === 'shades') {
        return (
            <g>
                <rect x="30" y="22" width="19" height="12" rx="5" fill="#101322" />
                <rect x="51" y="22" width="19" height="12" rx="5" fill="#101322" />
                <rect x="47" y="26" width="6" height="2.5" fill="#101322" />
                <path d="M33 25.5L38 25.5" className="peng__line peng__line--glint" />
            </g>
        );
    }
    if (kind === 'happy') {
        return (
            <g>
                <path d="M34 30Q40 22 46 30" className="peng__line" />
                <path d="M54 30Q60 22 66 30" className="peng__line" />
            </g>
        );
    }
    if (kind === 'wink') {
        return (
            <g>
                <g className="peng__eyes">
                    <circle cx="40" cy="28" r="6.5" fill="#fff" />
                    <circle cx="41.5" cy="29" r="3" fill="#111" />
                </g>
                <path d="M54 30Q60 24 66 30" className="peng__line" />
            </g>
        );
    }
    if (kind === 'surprised') {
        return (
            <g>
                <path d="M33 16Q40 11 47 15" className="peng__line peng__line--thin" />
                <path d="M53 15Q60 11 67 16" className="peng__line peng__line--thin" />
                <circle cx="40" cy="28" r="7.5" fill="#fff" />
                <circle cx="60" cy="28" r="7.5" fill="#fff" />
                <circle cx="40" cy="28" r="2.4" fill="#111" />
                <circle cx="60" cy="28" r="2.4" fill="#111" />
            </g>
        );
    }
    return (
        <g className="peng__eyes">
            <circle cx="40" cy="28" r="6.5" fill="#fff" />
            <circle cx="60" cy="28" r="6.5" fill="#fff" />
            <circle cx="41.5" cy="29" r="3" fill="#111" />
            <circle cx="58.5" cy="29" r="3" fill="#111" />
        </g>
    );
}

export default function Penguin({
    hat = 'none',
    scarf = '#ff6b6b',
    hatColor = '#3b82f6',
    mood = 'normal',
    wave = false,
    star = false,
    size = '240px',
    shadow = true
}) {
    let eyes = mood;
    if (hat === 'shades') eyes = 'shades';
    else if (hat === 'party' && mood === 'normal') eyes = 'happy';

    return (
        <svg
            className={`peng${wave ? ' is-waving' : ''}`}
            viewBox="0 -14 100 124"
            aria-hidden="true"
            focusable="false"
            style={{ height: size, width: `calc(${size} * 0.807)` }}
        >
            {shadow && <ellipse cx="50" cy="104" rx="30" ry="4.5" fill="rgba(0,0,0,.28)" />}
            <path d="M20 52C8 60 8 78 17 86C23 80 25 66 25 55Z" fill="#161c36" />
            <g className="peng__flipper-r">
                <path d="M80 52C92 60 92 78 83 86C77 80 75 66 75 55Z" fill="#161c36" />
            </g>
            <path d="M50 8C28 8 18 28 18 54C18 82 28 100 50 100C72 100 82 82 82 54C82 28 72 8 50 8Z" fill="#1d2542" />
            <ellipse cx="50" cy="72" rx="23" ry="27" fill="#f4f7fb" />
            <circle cx="28" cy="38" r="4.5" fill="#ff8fa8" fillOpacity=".55" />
            <circle cx="72" cy="38" r="4.5" fill="#ff8fa8" fillOpacity=".55" />
            <ellipse cx="37" cy="101" rx="10" ry="4.5" fill="#ff9f43" />
            <ellipse cx="63" cy="101" rx="10" ry="4.5" fill="#ff9f43" />
            <Eyes kind={eyes} />
            <path d="M42 36Q50 31 58 36Q56 46 50 47Q44 46 42 36Z" fill="#ff9f43" />
            <path d="M26 50Q50 62 74 50L75 59Q50 71 25 59Z" fill={scarf} />
            <path d="M61 60L70 58L73 78L63 76Z" fill={scarf} />
            <path d="M26 54Q50 66 74 54" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" fill="none" />
            {hat === 'beanie' && (
                <g>
                    <path d="M29 18C29 -2 71 -2 71 18Z" fill={hatColor} />
                    <rect x="27" y="15" width="46" height="8" rx="4" fill="#fff" fillOpacity=".88" />
                    <circle cx="50" cy="-1" r="5.5" fill="#fff" />
                </g>
            )}
            {hat === 'party' && (
                <g>
                    <path d="M36 17L50 -12L64 17Z" fill="#ff5fa2" />
                    <path d="M41 9L59 9L62 14L38 14Z" fill="#ffd84a" />
                    <circle cx="50" cy="-13" r="3.5" fill="#ffd84a" />
                </g>
            )}
            {star && SPARKLES.map((sp, i) => (
                <g key={i} transform={`translate(${sp.x} ${sp.y}) scale(${sp.s})`}>
                    <path className="peng__sparkle" d={STAR_PATH} fill="#ffe27a" style={{ animationDelay: sp.delay }} />
                </g>
            ))}
        </svg>
    );
}
