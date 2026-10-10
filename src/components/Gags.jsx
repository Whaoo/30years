import Penguin from './Penguin';

// Running gags déclenchés par la molette (la page ne défile jamais)
const TEXTS = {
    slide: ['Wiiiiii !', 'Pente glissante !', 'Pas de freins !'],
    peek: ['Il n’y a rien en bas, promis.', 'Toujours rien en bas.', 'Tu insistes, hein ?'],
    drop: ['Tu m’as appelé ?', 'Rien là-haut non plus.', 'Bon, je remonte.']
};

export default function Gags({ gag, people }) {
    if (!gag || people.length === 0) return null;

    const p = people[gag.n % people.length];
    const text = TEXTS[gag.kind][gag.n % 3];
    const outfit = { hat: p.hat, scarf: p.scarf, hatColor: p.hatColor, shadow: false };

    return (
        <div className="gags" aria-hidden="true">
            {gag.kind === 'slide' && (
                <div className="gag gag--slide" key={gag.n}>
                    <div className="gag__lines">
                        <span style={{ width: 90 }} />
                        <span style={{ width: 60, marginLeft: 30 }} />
                        <span style={{ width: 80, marginLeft: 10 }} />
                    </div>
                    <div className="gag__rot">
                        <Penguin {...outfit} mood="happy" size="14vh" />
                    </div>
                    <span className="gag-bubble">{text}</span>
                </div>
            )}
            {gag.kind === 'peek' && (
                <div className="gag gag--peek" key={gag.n}>
                    <span className="gag-bubble">{text}</span>
                    <Penguin {...outfit} mood="wink" size="24vh" />
                </div>
            )}
            {gag.kind === 'drop' && (
                <div className="gag gag--drop" key={gag.n}>
                    <span className="gag__rope" />
                    <div className="gag__hang">
                        <Penguin {...outfit} mood="surprised" size="16vh" />
                        <span className="gag-bubble gag-bubble--side">{text}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
