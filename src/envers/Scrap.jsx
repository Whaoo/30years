import { scrapPath } from './engine';

// Morceau de parchemin avec une lettre (même forme que dans la cave)
export default function Scrap({ ch, dot, seed, size = 40, lifted = false }) {
    const w = size * 0.84;
    const h = size;
    const pts = scrapPath(w, h, seed).map(([x, y]) => `${(x + w / 2 + 3).toFixed(1)},${(y + h / 2 + 3).toFixed(1)}`).join(' ');
    return (
        <svg className="envers-scrap" width={w + 8} height={h + 10} viewBox={`0 0 ${w + 8} ${h + 10}`} aria-hidden="true" style={{ transform: `rotate(${((seed * 37) % 13 - 6) * 1.2}deg)` }}>
            <polygon points={pts} fill="#000" opacity={lifted ? 0.45 : 0.3} transform={`translate(${lifted ? 3 : 1.5} ${lifted ? 6 : 3})`} />
            <polygon points={pts} fill="#f1e3c2" stroke="#b99a66" strokeWidth="1" />
            <path d={`M${w * 0.12} ${h * 0.72}Q${w * 0.5} ${h * 0.3} ${w * 0.9} ${h * 0.6}`} stroke="#c0392b" strokeOpacity="0.3" strokeWidth="1.3" strokeDasharray="3 3" fill="none" />
            <text x={w / 2 + 3} y={h / 2 + 4 + h * 0.21} textAnchor="middle" fontFamily="Bricolage Grotesque, DM Sans, sans-serif" fontWeight="800" fontSize={h * 0.6} fill="#5a3d22">{ch}</text>
            {dot && <circle cx={10} cy={10} r={Math.max(3.5, w * 0.11)} fill="#d7263d" stroke="#fff" strokeWidth="1.5" />}
        </svg>
    );
}
