import { useEffect, useRef, useState } from 'react';
import { chargerTurnstile, choisirPseudo, config, importerRecords, moi, retrouverPseudo } from '../utils/leaderboard';

// Avant le premier jeu : le pseudo des classements (un seul pour tous les jeux, gardé dans ce navigateur).
// « Jouer sans pseudo » : on ne le redemande plus avant de jouer jusqu'au prochain chargement de la page
// (le panneau du classement le proposera encore en fin de partie, comme avant).
let plusTard = false;
export const pseudoPlusTard = () => plusTard;

export default function PseudoGate({ game, suggestion, onDone }) {
    const [form, setForm] = useState('pseudo'); // pseudo | code
    const [saisie, setSaisie] = useState({ pseudo: suggestion || '', code: '' });
    const [envoi, setEnvoi] = useState(false);
    const [err, setErr] = useState('');
    const [code, setCode] = useState('');
    const [captcha, setCaptcha] = useState({ cle: null, jeton: null });
    const box = useRef(null);

    useEffect(() => { config().then((c) => setCaptcha((x) => ({ ...x, cle: c?.captcha || null }))); }, []);
    useEffect(() => {
        if (form !== 'pseudo' || !captcha.cle || !box.current) return undefined;
        let id = null, annule = false;
        chargerTurnstile().then((t) => {
            if (annule || !box.current) return;
            id = t.render(box.current, {
                sitekey: captcha.cle, appearance: 'interaction-only', language: 'fr',
                callback: (jeton) => setCaptcha((x) => ({ ...x, jeton })),
                'expired-callback': () => setCaptcha((x) => ({ ...x, jeton: null }))
            });
        }).catch(() => setErr('La vérification anti-robot ne se charge pas : vérifie ta connexion.'));
        return () => { annule = true; if (id != null && window.turnstile) window.turnstile.remove(id); };
    }, [form, captcha.cle]);

    const valider = async (e) => {
        e.preventDefault();
        if (envoi) return;
        setErr('');
        if (form === 'pseudo' && captcha.cle && !captcha.jeton) { setErr('Encore une seconde, vérification anti-robot en cours…'); return; }
        setEnvoi(true);
        try {
            if (form === 'pseudo') {
                const d = await choisirPseudo(saisie.pseudo, captcha.jeton);
                await importerRecords();
                setCode(d.code);
            } else {
                await retrouverPseudo(saisie.pseudo, saisie.code);
                await importerRecords();
                onDone();
            }
        } catch (er) {
            setErr(er.message);
            if (window.turnstile && captcha.jeton) { window.turnstile.reset(); setCaptcha((x) => ({ ...x, jeton: null })); }
        } finally {
            setEnvoi(false);
        }
    };

    if (code) {
        return (
            <div className="gate" role="status">
                <p className="gate__eyebrow">Bienvenue {moi()?.pseudo} !</p>
                <p className="lb__code">Pour jouer sous ce pseudo sur un autre appareil, note ce code :<strong>{code}</strong>(il ne sera plus affiché).</p>
                <button type="button" className="lb__btn gate__go" onClick={onDone} autoFocus>Jouer à {game.title}</button>
            </div>
        );
    }
    return (
        <form className="gate" onSubmit={valider}>
            <p className="gate__eyebrow">Avant de jouer</p>
            <h3 className="gate__title">{form === 'pseudo' ? 'Ton pseudo pour les classements' : 'Retrouver ton pseudo'}</h3>
            <p className="gate__txt">{form === 'pseudo' ? 'Un seul pseudo pour tous les jeux : on ne te le redemandera plus sur ce navigateur, et tes scores partiront tout seuls.' : 'Le pseudo et le code donnés quand tu l’as choisi.'}</p>
            {form === 'pseudo' ? (
                <div className="lb__row">
                    <input aria-label="Pseudo" value={saisie.pseudo} maxLength={20} autoComplete="nickname" placeholder="ex. Flocon42" autoFocus
                        onChange={(e) => setSaisie({ ...saisie, pseudo: e.target.value })} />
                    <button type="submit" className="lb__btn" disabled={envoi || saisie.pseudo.trim().length < 2}>{envoi ? '…' : 'Valider'}</button>
                </div>
            ) : (
                <>
                    <div className="lb__row">
                        <input aria-label="Pseudo" value={saisie.pseudo} maxLength={20} placeholder="Pseudo" autoFocus onChange={(e) => setSaisie({ ...saisie, pseudo: e.target.value })} />
                        <input aria-label="Code" value={saisie.code} maxLength={9} placeholder="ABCD-EFGH" onChange={(e) => setSaisie({ ...saisie, code: e.target.value })} />
                    </div>
                    <div className="lb__row"><button type="submit" className="lb__btn" disabled={envoi}>{envoi ? '…' : 'Retrouver'}</button></div>
                </>
            )}
            <div ref={box} className="lb__captcha" />
            {err && <p className="lb__err" role="alert">{err}</p>}
            <p className="lb__liens">
                <button type="button" onClick={() => { setForm(form === 'pseudo' ? 'code' : 'pseudo'); setErr(''); }}>{form === 'pseudo' ? 'J’ai déjà un pseudo' : 'Nouveau pseudo'}</button>
                <button type="button" onClick={() => { plusTard = true; onDone(); }}>Jouer sans pseudo</button>
            </p>
        </form>
    );
}
