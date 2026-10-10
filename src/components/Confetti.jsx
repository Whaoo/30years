import { useMemo } from 'react';

const COLORS = ['var(--accent)', '#ff5fa2', '#ffffff', '#6ee7b7', '#a78bfa'];

export default function Confetti() {
    const pieces = useMemo(
        () =>
            Array.from({ length: 48 }, (_, i) => ({
                left: `${(i * 53 + 7) % 100}%`,
                width: 6 + (i % 3) * 3,
                height: 10 + (i % 4) * 3,
                background: COLORS[i % COLORS.length],
                animation: `confetti ${(2.2 + (i % 5) * 0.3).toFixed(1)}s ease-in ${((i % 8) * 0.07).toFixed(2)}s forwards`
            })),
        []
    );

    return (
        <div className="confetti" aria-hidden="true">
            {pieces.map((style, i) => (
                <span key={i} style={style} />
            ))}
        </div>
    );
}
