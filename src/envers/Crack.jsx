// Fissure lumineuse en bas de la page d'accueil (2e coup de molette)
export default function Crack({ stage }) {
    return (
        <div className={`crack crack--${stage}`} aria-hidden="true">
            <div className="crack__glow" />
            {stage >= 2 && (
                <svg className="crack__line" viewBox="0 0 1000 60" preserveAspectRatio="none">
                    <path d="M40 30L110 22L160 36L230 24L300 40L360 26L420 34L470 18L540 38L600 24L660 36L730 20L790 34L850 26L910 38L960 28M300 40l-14 -22M600 24l10 -20M730 20l6 22" fill="none" stroke="#ff3b3b" strokeWidth="9" strokeOpacity="0.5" />
                    <path d="M40 30L110 22L160 36L230 24L300 40L360 26L420 34L470 18L540 38L600 24L660 36L730 20L790 34L850 26L910 38L960 28M300 40l-14 -22M600 24l10 -20M730 20l6 22" fill="none" stroke="#ffe0d6" strokeWidth="2" />
                </svg>
            )}
            {stage >= 2 && <div className="crack__spores" />}
        </div>
    );
}
