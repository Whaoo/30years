import { useState } from 'react';
import { envoyerAvis } from '../utils/leaderboard';
import { marquerAvis } from '../utils/avis';

// Question posée avant un jeu (src/utils/avis.js) : 5 étoiles, un commentaire facultatif, et « Je ne suis pas … »
const Star = ({ on }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={on ? '#ffd23f' : 'none'} stroke={on ? '#ffd23f' : 'rgba(255,255,255,0.55)'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
);
const MOTS = ['', 'Bof', 'Moyen', 'Pas mal', 'Très bien', 'Génial !'];

export default function AvisPopup({ question, jeu, onDone }) {
    const [note, setNote] = useState(0);
    const [survol, setSurvol] = useState(0);
    const [com, setCom] = useState('');
    const [envoi, setEnvoi] = useState(false);
    const [err, setErr] = useState('');
    const [merci, setMerci] = useState(false);
    const envoyer = async () => {
        if (!note || envoi) return;
        setEnvoi(true); setErr('');
        try {
            await envoyerAvis({ question: question.id, note, commentaire: com, jeu });
            marquerAvis(question.id, 'repondu');
            setMerci(true);
            setTimeout(() => onDone(true), 1500);
        } catch (e) {
            setErr(e.message || 'Envoi impossible pour le moment.');
        } finally {
            setEnvoi(false);
        }
    };
    if (merci) {
        return (
            <div className="gate" role="status">
                <p className="gate__eyebrow">Merci {question.pour} !</p>
                <h3 className="gate__title">Réponse bien reçue. Bon jeu !</h3>
            </div>
        );
    }
    const vue = survol || note;
    return (
        <div className="gate avis" role="dialog" aria-label={question.texte}>
            <p className="gate__eyebrow">Petite question avant de jouer</p>
            <h3 className="gate__title">{question.texte}</h3>
            <div className="avis__stars" role="radiogroup" aria-label="Ta note" onMouseLeave={() => setSurvol(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={note === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                        onClick={() => setNote(n)} onMouseEnter={() => setSurvol(n)}>
                        <Star on={n <= vue} />
                    </button>
                ))}
                <span className="avis__mot">{MOTS[vue]}</span>
            </div>
            <textarea className="avis__com" value={com} maxLength={600} rows={3} placeholder="Un commentaire ? (facultatif)" onChange={(e) => setCom(e.target.value)} />
            {err && <p className="lb__err" role="alert">{err}</p>}
            <div className="avis__actions">
                <button type="button" className="lb__btn" disabled={!note || envoi} onClick={envoyer}>{envoi ? '…' : 'Envoyer'}</button>
                <button type="button" className="avis__pas" onClick={() => { marquerAvis(question.id, 'pas-moi'); onDone(false); }}>Je ne suis pas {question.pour}</button>
            </div>
        </div>
    );
}
