import { useMemo } from 'react';

// Décor illustré : ciel de saison, soleil (ou lune), collines, particules,
// voiles selon le moment de la journée et la météo.
function makeParticles(shape, anim, count, compact) {
    const list = [];
    for (let i = 0; i < count; i++) {
        const size = compact ? 4 + (i % 3) * 2 : 7 + (i % 4) * 3;
        const duration = (compact ? 8 : 9) + (i % 5) * 2.5;
        const delay = -((i * 1.9) % 14);
        list.push({
            left: `${(i * 37 + 11) % 100}%`,
            width: size,
            height: size,
            borderRadius: shape,
            animation: `${anim} ${duration}s linear ${delay.toFixed(1)}s infinite`
        });
    }
    return list;
}

export default function Background({ theme, disco = false, compact = false }) {
    const { particleShape, particleAnim } = theme;
    const particles = useMemo(
        () => makeParticles(particleShape, particleAnim, compact ? 8 : 16, compact),
        [particleShape, particleAnim, compact]
    );

    return (
        <div className={`scene${compact ? ' scene--compact' : ''}${disco ? ' is-disco' : ''}`} aria-hidden="true">
            <div className="scene__sun" />
            <svg className="scene__hills" viewBox="0 0 1440 280" preserveAspectRatio="none">
                <path
                    d="M0 120C240 40 420 40 640 100C860 160 1060 150 1240 80C1330 45 1400 60 1440 80L1440 280L0 280Z"
                    style={{ fill: 'var(--hill1)' }}
                />
                <path
                    d="M0 190C200 130 420 140 620 190C860 250 1100 210 1440 150L1440 280L0 280Z"
                    style={{ fill: 'var(--hill2)' }}
                />
            </svg>
            {particles.map((style, i) => (
                <span key={i} className="particle" style={style} />
            ))}
            {theme.overlays.map((color, i) => (
                <div key={i} className="scene__overlay" style={{ background: color }} />
            ))}
        </div>
    );
}
