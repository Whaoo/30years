import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { formatScore } from '../games';
import { getBest } from '../games/scores';
import { chargerTurnstile, choisirPseudo, classement, config, envoyerScore, importerRecords, moi, retrouverPseudo } from '../utils/leaderboard';

// Panneau « Classement » de la fenêtre de jeu.
// En fin de partie (fin = nouveau `fin.n`) : avec un pseudo, le score part tout seul ; sans pseudo, on le demande une fois,
// en montrant la place que ce score obtiendrait. Le pseudo est ensuite gardé dans le navigateur.
// Ouvert hors fin de partie, sans pseudo, avec un record déjà fait dans ce navigateur (`ancien`, ex. la cave finie avant
// l'arrivée des classements) : on montre la place de ce record et on propose le pseudo ; le record part alors par l'import.
// Podium (les 3 premiers en marches) et classement en direct : tant que le panneau est ouvert et l'onglet visible,
// il se recharge toutes les 20 s ; les lignes qui changent clignotent. Après 5 min sans changement il s'arrête
// (« en pause ») et repart dès qu'on revient sur l'onglet : peu d'appels à la base.
const rangTxt = (r) => (r === 1 ? '1er' : `${r}e`);
const DIRECT_MS = 20000;
const DIRECT_CALMES = 15;
const signature = (b) => (b ? b.top.map((l) => `${l.pseudo}:${l.score}`).join('|') + '#' + b.total : '');

export default function Leaderboard({ game, fin, onClose }) {
    const [joueur, setJoueur] = useState(moi);
    const [portee, setPortee] = useState(game.quest ? 'jour' : 'tout');
    const [board, setBoard] = useState(null);
    const [etat, setEtat] = useState('chargement'); // chargement | pret | erreur
    const [message, setMessage] = useState('');
    const [resultat, setResultat] = useState(null);
    const [attente, setAttente] = useState(null); // score de fin de partie pas encore envoyé (pas de pseudo)
    const [ancien] = useState(() => {
        if (fin || moi()) return null;
        const b = Math.round(getBest(game.id) ?? 0);
        return b > 0 ? b : null;
    });
    const [form, setForm] = useState('pseudo'); // pseudo | code | masque
    const [saisie, setSaisie] = useState({ pseudo: '', code: '' });
    const [envoi, setEnvoi] = useState(false);
    const [erreurForm, setErreurForm] = useState('');
    const [codeNouveau, setCodeNouveau] = useState('');
    const [captcha, setCaptcha] = useState({ cle: null, jeton: null });
    const captchaBox = useRef(null);
    const vu = useRef(0);
    const [direct, setDirect] = useState(false);
    const [neufs, setNeufs] = useState(() => new Set()); // pseudos dont la ligne vient de changer
    const boardRef = useRef(null);
    boardRef.current = board;

    const fmt = (sc) => (game.format ? game.format(sc) : formatScore(game, sc));
    const meilleurQue = (a, b) => (game.lowerIsBetter ? a < b : a > b);
    // le score « Toi ? » à glisser dans la liste : fin de partie pas encore envoyée, ou ancien record (classement « Toujours » seulement)
    const propose = (p) => (attente != null ? attente : !joueur && p === 'tout' ? ancien : null);
    const charger = async (p = portee, score = null) => {
        try {
            const b = await classement(game.id, p, score);
            setBoard(b);
            setEtat('pret');
        } catch (e) {
            setEtat('erreur');
            setMessage(e.message);
        }
    };

    const envoyer = async (score) => {
        try {
            const r = await envoyerScore(game.id, score, portee);
            setResultat(r);
            setAttente(null);
            // le classement revient avec le score : pas de deuxième appel
            if (r.classement) { setBoard(r.classement); setEtat('pret'); } else await charger(portee);
        } catch (e) {
            if (e.status === 401) { setJoueur(null); setAttente(score); await charger(portee, score); return; }
            setMessage(e.message);
            await charger(portee);
        }
    };

    // une nouvelle fin de partie
    useEffect(() => {
        if (!fin || fin.n === vu.current) return;
        vu.current = fin.n;
        setResultat(null);
        setMessage('');
        if (moi()) envoyer(fin.score);
        else { setAttente(fin.score); setForm((f) => (f === 'masque' ? 'pseudo' : f)); charger(portee, fin.score); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fin]);

    // ouverture sans partie terminée : on montre juste le classement
    useEffect(() => {
        if (!fin) charger(portee, propose(portee));
        config().then((c) => setCaptcha((x) => ({ ...x, cle: c?.captcha || null })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // captcha Turnstile (seulement s'il est configuré côté Cloudflare) quand le formulaire de pseudo est affiché
    useEffect(() => {
        if (joueur || form !== 'pseudo' || !captcha.cle || !captchaBox.current) return undefined;
        let id = null, annule = false;
        chargerTurnstile().then((t) => {
            if (annule || !captchaBox.current) return;
            id = t.render(captchaBox.current, {
                sitekey: captcha.cle, appearance: 'interaction-only', language: 'fr',
                callback: (jeton) => setCaptcha((x) => ({ ...x, jeton })),
                'expired-callback': () => setCaptcha((x) => ({ ...x, jeton: null }))
            });
        }).catch(() => setErreurForm('La vérification anti-robot ne se charge pas : vérifie ta connexion.'));
        return () => { annule = true; if (id != null && window.turnstile) window.turnstile.remove(id); };
    }, [joueur, form, captcha.cle]);

    const changerPortee = (p) => { setPortee(p); setEtat('chargement'); charger(p, propose(p)); };

    // classement en direct
    const essaiDirect = propose(portee);
    useEffect(() => {
        if (etat !== 'pret') return undefined;
        let calmes = 0, enCours = false, fini = false, efface = null;
        const tick = async () => {
            if (fini || enCours || document.hidden || calmes >= DIRECT_CALMES) return;
            enCours = true;
            try {
                const b = await classement(game.id, portee, essaiDirect);
                if (fini) return;
                const avant = boardRef.current;
                if (signature(b) !== signature(avant)) {
                    calmes = 0;
                    const old = new Map((avant?.top || []).map((l) => [l.pseudo, l.score]));
                    setNeufs(new Set(b.top.filter((l) => old.get(l.pseudo) !== l.score).map((l) => l.pseudo)));
                    clearTimeout(efface);
                    efface = setTimeout(() => setNeufs(new Set()), 2600);
                    setBoard(b);
                    // ma place a pu bouger : le message « tu es 2e sur 5 » suit
                    if (b.moi) setResultat((r) => (r ? (portee === 'jour' ? { ...r, jour: { rang: b.moi.rang, total: b.total } } : { ...r, rang: b.moi.rang, total: b.total }) : r));
                } else calmes++;
            } catch { /* réseau : on réessaiera au prochain tour */ }
            finally { enCours = false; }
            setDirect(!fini && calmes < DIRECT_CALMES && !document.hidden);
        };
        const id = setInterval(tick, DIRECT_MS);
        const vis = () => { if (!document.hidden) { calmes = 0; tick(); } setDirect(!document.hidden); };
        document.addEventListener('visibilitychange', vis);
        setDirect(!document.hidden);
        return () => { fini = true; clearInterval(id); clearTimeout(efface); document.removeEventListener('visibilitychange', vis); setDirect(false); };
    }, [etat, game.id, portee, essaiDirect]);

    const valider = async (e) => {
        e.preventDefault();
        if (envoi) return;
        setErreurForm('');
        if (form === 'pseudo' && captcha.cle && !captcha.jeton) { setErreurForm('Encore une seconde, vérification anti-robot en cours…'); return; }
        setEnvoi(true);
        try {
            if (form === 'pseudo') {
                const d = await choisirPseudo(saisie.pseudo, captcha.jeton);
                setCodeNouveau(d.code);
            } else {
                await retrouverPseudo(saisie.pseudo, saisie.code);
            }
            setJoueur(moi());
            // d'abord le score de la partie qui vient de finir, puis les anciens records de ce navigateur
            if (attente != null) await envoyer(attente);
            const importe = await importerRecords();
            if (importe || attente == null) await charger(portee);
        } catch (err) {
            setErreurForm(err.message);
            if (window.turnstile && captcha.jeton) { window.turnstile.reset(); setCaptcha((x) => ({ ...x, jeton: null })); }
        } finally {
            setEnvoi(false);
        }
    };

    const lignes = board ? [...board.top] : [];
    const essai = propose(portee);
    // sans pseudo : la place qu'aurait ce score, glissée dans la liste
    if (board && essai != null && board.potentiel != null) {
        const ligne = { rang: board.potentiel, pseudo: 'Toi ?', score: essai, fantome: true };
        const i = lignes.findIndex((l) => meilleurQue(essai, l.score));
        if (i >= 0) {
            lignes.splice(i, 0, ligne);
            for (let k = i + 1; k < lignes.length; k++) lignes[k] = { ...lignes[k], rang: lignes[k].rang + 1 }; // les suivants descendraient d'une place
        }
        else if (board.potentiel <= 10 || lignes.length < 10) lignes.push(ligne);
    }
    const moiHorsTop = board?.moi && !board.top.some((l) => l.moi) ? board.moi : null;
    // podium : les 3 premières lignes, sauf quand « Toi ? » s'y glisse (la liste seule montre mieux la place qu'il prendrait)
    const podium = lignes.length > 0 && !lignes.slice(0, 3).some((l) => l.fantome) ? lignes.slice(0, 3) : null;
    const reste = podium ? lignes.slice(3) : lignes;
    const classeLigne = (l) => `lb__li${l.moi ? ' is-moi' : ''}${l.fantome ? ' is-fantome' : ''}${l.rang <= 3 ? ` is-podium is-p${l.rang}` : ''}${neufs.has(l.pseudo) ? ' is-neuf' : ''}`;

    let titre = null;
    if (resultat) {
        const r = portee === 'jour' ? resultat.jour : resultat;
        if (portee === 'jour') titre = `Aujourd’hui, tu es ${rangTxt(r.rang)} sur ${r.total}.`;
        else if (resultat.record) titre = `Nouveau record perso ! Tu es ${rangTxt(r.rang)} sur ${r.total}.`;
        else titre = `Pas de record cette fois (le tien : ${fmt(resultat.meilleur)}). Tu restes ${rangTxt(r.rang)} sur ${r.total}.`;
    } else if (attente != null && board?.potentiel) {
        titre = `Ce score te placerait ${rangTxt(board.potentiel)} ${portee === 'jour' ? 'aujourd’hui' : 'au classement'}.`;
    } else if (essai != null && board?.potentiel) {
        titre = `Ton record (${fmt(essai)}) te placerait ${rangTxt(board.potentiel)}. Choisis un pseudo pour l’inscrire au classement.`;
    }

    return (
        <aside className="lb" aria-label={`Classement : ${game.title}`}>
            <div className="lb__head">
                <h3 className="lb__title"><Icon name="trophy" size={18} /> Classement</h3>
                <div className="lb__tabs" role="group" aria-label="Période">
                    <button type="button" aria-pressed={portee === 'tout'} onClick={() => changerPortee('tout')}>Toujours</button>
                    <button type="button" aria-pressed={portee === 'jour'} onClick={() => changerPortee('jour')}>Aujourd’hui</button>
                </div>
                <button type="button" className="lb__close" onClick={onClose} aria-label="Fermer le classement"><Icon name="close" size={18} /></button>
            </div>

            {titre && <p className="lb__titre">{titre}</p>}
            {message && <p className="lb__msg">{message}</p>}

            {!joueur && (attente != null || ancien != null) && form !== 'masque' && (
                <form className="lb__form" onSubmit={valider}>
                    {form === 'pseudo' ? (
                        <>
                            <label htmlFor="lb-pseudo">Ton pseudo pour le classement</label>
                            <div className="lb__row">
                                <input id="lb-pseudo" value={saisie.pseudo} maxLength={20} autoComplete="nickname" placeholder="ex. Flocon42" autoFocus
                                    onChange={(e) => setSaisie({ ...saisie, pseudo: e.target.value })} />
                                <button type="submit" className="lb__btn" disabled={envoi || saisie.pseudo.trim().length < 2}>{envoi ? '…' : 'Valider'}</button>
                            </div>
                            <div ref={captchaBox} className="lb__captcha" />
                            <p className="lb__aide">Il te sera gardé sur ce navigateur : on ne te le redemandera pas.</p>
                            <p className="lb__liens">
                                <button type="button" onClick={() => { setForm('code'); setErreurForm(''); }}>J’ai déjà un pseudo</button>
                                <button type="button" onClick={() => setForm('masque')}>Pas maintenant</button>
                            </p>
                        </>
                    ) : (
                        <>
                            <label htmlFor="lb-pseudo2">Ton pseudo et ton code</label>
                            <div className="lb__row">
                                <input id="lb-pseudo2" value={saisie.pseudo} maxLength={20} placeholder="Pseudo" autoFocus onChange={(e) => setSaisie({ ...saisie, pseudo: e.target.value })} />
                                <input value={saisie.code} maxLength={9} placeholder="ABCD-EFGH" aria-label="Code" onChange={(e) => setSaisie({ ...saisie, code: e.target.value })} />
                            </div>
                            <div className="lb__row">
                                <button type="submit" className="lb__btn" disabled={envoi}>{envoi ? '…' : 'Retrouver'}</button>
                                <span className="lb__liens"><button type="button" onClick={() => { setForm('pseudo'); setErreurForm(''); }}>Nouveau pseudo</button></span>
                            </div>
                        </>
                    )}
                    {erreurForm && <p className="lb__err" role="alert">{erreurForm}</p>}
                </form>
            )}

            {codeNouveau && (
                <p className="lb__code">
                    Bienvenue {joueur?.pseudo} ! Pour jouer sous ce pseudo sur un autre appareil, note ce code :
                    <strong>{codeNouveau}</strong> (il ne sera plus affiché).
                </p>
            )}

            {etat === 'chargement' && <p className="lb__vide">Chargement…</p>}
            {etat === 'erreur' && <p className="lb__vide">{message || 'Classement indisponible pour le moment.'}</p>}
            {etat === 'pret' && board && (
                lignes.length === 0
                    ? <p className="lb__vide">{portee === 'jour' ? 'Personne n’a encore joué aujourd’hui.' : 'Personne au classement pour l’instant : à toi l’honneur !'}</p>
                    : (<>
                        {podium && (
                            <ol className="lb__podium" aria-label="Podium">
                                {[0, 1, 2].map((k) => {
                                    const l = podium[k];
                                    if (!l) return <li key={k} className={`lb__marche is-vide is-m${k + 1}`} aria-hidden="true"><span className="lb__nom">libre</span><span className="lb__socle">{rangTxt(k + 1)}</span></li>;
                                    return (
                                        <li key={k} className={`lb__marche is-m${k + 1}${l.moi ? ' is-moi' : ''}${neufs.has(l.pseudo) ? ' is-neuf' : ''}`}>
                                            <span className="lb__nom" title={l.pseudo}>{l.pseudo}</span>
                                            <span className="lb__score">{fmt(l.score)}</span>
                                            <span className="lb__socle">{rangTxt(l.rang)}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                        <ol className="lb__list" start={reste[0]?.rang}>
                            {reste.map((l, i) => (
                                <li key={`${l.rang}-${l.pseudo}-${i}`} className={classeLigne(l)}>
                                    <span className="lb__rang">{l.rang}</span>
                                    <span className="lb__nom">{l.pseudo}</span>
                                    <span className="lb__score">{fmt(l.score)}</span>
                                </li>
                            ))}
                            {moiHorsTop && (
                                <li className="lb__li is-moi lb__li--sep">
                                    <span className="lb__rang">{moiHorsTop.rang}</span>
                                    <span className="lb__nom">{moiHorsTop.pseudo}</span>
                                    <span className="lb__score">{fmt(moiHorsTop.score)}</span>
                                </li>
                            )}
                        </ol>
                    </>)
            )}
            {board && board.total > 0 && (
                <p className="lb__pied">
                    <span className={`lb__direct${direct ? ' is-on' : ''}`} title={direct ? 'Mis à jour toutes les 20 secondes' : 'Mise à jour en pause : reviens sur l’onglet pour la relancer'}>{direct ? 'En direct' : 'En pause'}</span>
                    {board.total} joueur{board.total > 1 ? 's' : ''}{portee === 'jour' ? ' aujourd’hui' : ''}{joueur ? ` · tu joues en tant que ${joueur.pseudo}` : ''}
                </p>
            )}
        </aside>
    );
}
