import Penguin from './Penguin';

// Pingouin cliquable avec sa bulle au-dessus (utilisé dans la carte principale)
export default function PenguinButton({ person, play, size, star = false, shadow = true }) {
    const s = play.stateFor(person.id);
    const hat = star || s.party ? 'party' : person.hat;

    return (
        <div className="peng-slot">
            <div className="bubble-slot">
                {s.bubble && <div className="bubble" key={s.bubble}>{s.bubble}</div>}
            </div>
            <button
                type="button"
                className="pbtn"
                onClick={() => play.click(person.id)}
                aria-label={`Pingouin de ${person.name}, cliquer pour le saluer`}
            >
                <span className={s.spinning ? 'spin' : 'pwrap'}>
                    <Penguin
                        hat={hat}
                        scarf={person.scarf}
                        hatColor={person.hatColor}
                        mood={s.mood || 'normal'}
                        wave={s.waving}
                        star={star}
                        size={size}
                        shadow={shadow}
                    />
                </span>
            </button>
        </div>
    );
}
