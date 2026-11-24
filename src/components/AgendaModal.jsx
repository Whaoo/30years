import { useEffect, useMemo, useState } from 'react';
import Icon from './Icons';
import { AGENDA_PATH, googleLink, personPath } from '../utils/agenda';
import { agendaState, markAdded } from '../utils/agendaStore';
import { MONTHS } from '../utils/birthdayLogic';
import { qrMatrix, qrSvgPath } from '../utils/qr';

// « Dans mon agenda » : ajouter les anniversaires à l'agenda du téléphone avec un simple fichier (.ics), gratuit et sans compte.
// Trois cas selon ce que ce navigateur a déjà ajouté (agendaStore.js) :
// - jamais : le fichier complet (/anniversaires.ics), avec la marche à suivre iPhone / Android / ordinateur (QR code vers /agenda) ;
// - à jour : rien à faire, on le dit ;
// - nouveaux venus : seulement eux, un par un (/anniversaires/<prenom>-<jjmm>.ics, ou directement dans Google Agenda).
// Ouverte par le bouton de la liste « Ensuite », le menu du téléphone ou l'adresse /agenda (à partager).

function detectPlatform() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'ordi';
}

const TABS = [
    { id: 'ios', label: 'iPhone' },
    { id: 'android', label: 'Android' },
    { id: 'ordi', label: 'Ordinateur' },
];

const dayLabel = (p) => `${p.d === 1 ? '1er' : p.d} ${MONTHS[p.m - 1]}`;
const plural = (n, one, many) => (n > 1 ? many : one);

function Qr({ text }) {
    const { d, size } = useMemo(() => qrSvgPath(qrMatrix(text)), [text]);
    return (
        <svg className="agenda__qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`QR code vers ${text}`} shapeRendering="crispEdges">
            <rect width={size} height={size} fill="#fff" />
            <path d={d} fill="#14172b" />
        </svg>
    );
}

export default function AgendaModal({ people, onClose }) {
    const mine = useMemo(detectPlatform, []);
    const [tab, setTab] = useState(mine);
    const saved = useMemo(agendaState, []);
    // nouveaux venus au moment d'ouvrir (ils restent affichés, cochés, une fois ajoutés)
    const fresh = useMemo(() => (saved ? people.filter((p) => !saved.ids.includes(p.id)) : null), [saved, people]);
    const [done, setDone] = useState(() => new Set());
    const [toutRefaire, setToutRefaire] = useState(false);
    const [toutFait, setToutFait] = useState(false);
    const page = window.location.origin + '/agenda';
    // sur iPhone, pas d'attribut download : Safari passe le fichier à Calendrier ; ailleurs, le fichier est enregistré
    const dl = mine === 'ios' ? {} : { download: 'anniversaires-equipe.ics' };

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const addAll = () => { markAdded(people.map((p) => p.id)); setToutFait(true); };
    const addOne = (p) => { markAdded([p.id]); setDone((s) => new Set(s).add(p.id)); };

    const mode = !saved || toutRefaire ? 'tout' : fresh.length ? 'nouveaux' : 'ajour';
    const n = people.length;
    const depuis = saved && saved.depuis ? new Date(saved.depuis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

    return (
        <div className="game-modal board-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-titre" onWheel={(e) => e.stopPropagation()}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="glist agenda">
                <div className="glist__head">
                    <h3 className="glist__title" id="agenda-titre"><Icon name="calendar" size={18} /> Les anniversaires dans ton agenda</h3>
                    <button type="button" className="lb__close" onClick={onClose} aria-label="Fermer"><Icon name="close" size={18} /></button>
                </div>

                {mode === 'ajour' && (
                    <div className="agenda__etat">
                        <p className="agenda__ok"><Icon name="check" size={18} /> Ton agenda est à jour</p>
                        <p className="agenda__intro">
                            Les {n} anniversaires de l’équipe y sont{depuis ? ` depuis le ${depuis}` : ''}. Quand quelqu’un arrivera,
                            il apparaîtra ici pour l’ajouter en un geste.
                        </p>
                    </div>
                )}

                {mode === 'nouveaux' && (
                    <div className="agenda__etat">
                        <p className="agenda__ok agenda__ok--new">
                            {fresh.length} {plural(fresh.length, 'nouvel anniversaire', 'nouveaux anniversaires')} depuis ton dernier ajout
                        </p>
                        <ul className="agenda__nouveaux">
                            {fresh.map((p) => (
                                <li key={p.id} className={done.has(p.id) ? 'is-done' : ''}>
                                    <span className="agenda__qui"><b>{p.name}</b><span>{dayLabel(p)}</span></span>
                                    {done.has(p.id) && <span className="agenda__fait"><Icon name="check" size={14} /> ajouté</span>}
                                    <a className="agenda__mini" href={personPath(p)} {...(mine === 'ios' ? {} : { download: `anniversaire-${p.id}.ics` })} onClick={() => addOne(p)}>
                                        {mine === 'ios' ? 'Ajouter' : 'Fichier'}
                                    </a>
                                    {mine !== 'ios' && (
                                        <a className="agenda__mini agenda__mini--g" href={googleLink(p)} target="_blank" rel="noopener noreferrer" onClick={() => addOne(p)}>Google Agenda</a>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <p className="agenda__note">
                            {mine === 'ios'
                                ? 'Touche « Ajouter », puis « Ajouter au calendrier » : le rappel de 9 h est compris.'
                                : 'Google Agenda crée l’anniversaire directement dans ton agenda (sur le téléphone aussi) ; le fichier sert pour les autres agendas.'}
                        </p>
                    </div>
                )}

                {mode === 'tout' && (
                    <>
                        <p className="agenda__intro">
                            Ajoute d’un coup les {n} anniversaires de l’équipe à l’agenda de ton téléphone : un événement chaque année,
                            avec un rappel à 9 h le jour J. Quand quelqu’un arrivera, le site te proposera seulement le nouveau.
                        </p>
                        <div className="agenda__tabs" role="tablist" aria-label="Ton appareil">
                            {TABS.map((t) => (
                                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="agenda__tab" onClick={() => setTab(t.id)}>
                                    {t.label}{t.id === mine && mine !== 'ordi' ? <span className="agenda__moi">ton téléphone</span> : null}
                                </button>
                            ))}
                        </div>

                        {tab === 'ios' && (
                            <div className="agenda__panel" role="tabpanel">
                                <a className="agenda__btn" href={AGENDA_PATH} {...dl} onClick={addAll}><Icon name="calendar" size={18} /> Ajouter les {n} anniversaires</a>
                                <ol className="agenda__steps">
                                    <li>Touche le bouton depuis Safari : la liste des anniversaires s’affiche (sinon, touche la flèche des téléchargements puis le fichier).</li>
                                    <li>Touche <b>Ajouter tout</b> et choisis un calendrier. Le rappel de 9 h est compris.</li>
                                </ol>
                                {mine !== 'ios' && <p className="agenda__note">Depuis un ordinateur, passe plutôt par l’onglet « Ordinateur » et scanne le code avec l’iPhone.</p>}
                            </div>
                        )}

                        {tab === 'android' && (
                            <div className="agenda__panel" role="tabpanel">
                                <a className="agenda__btn" href={AGENDA_PATH} {...dl} onClick={addAll}><Icon name="calendar" size={18} /> Télécharger les {n} anniversaires</a>
                                <ol className="agenda__steps">
                                    <li><b>Samsung Agenda</b> (et la plupart des agendas) : ouvre le fichier téléchargé, il propose de l’importer.</li>
                                    <li>
                                        <b>Google Agenda</b> n’importe un fichier que depuis un ordinateur : calendar.google.com › Paramètres ›
                                        <b> Importer et exporter</b>. Les anniversaires arrivent ensuite tout seuls sur le téléphone.
                                    </li>
                                    <li>Google applique ses notifications habituelles des événements d’une journée : règle-les avant l’import si tu veux un rappel.</li>
                                </ol>
                            </div>
                        )}

                        {tab === 'ordi' && (
                            <div className="agenda__panel agenda__panel--ordi" role="tabpanel">
                                {mine === 'ordi' && (
                                    <figure className="agenda__qrbox">
                                        <Qr text={page} />
                                        <figcaption>Pour ton téléphone : vise ce code avec l’appareil photo, la bonne marche à suivre s’ouvre.</figcaption>
                                    </figure>
                                )}
                                <div className="agenda__ordi">
                                    <span className="agenda__label">Ou sur cet ordinateur</span>
                                    <a className="agenda__btn agenda__btn--small" href={AGENDA_PATH} {...dl} onClick={addAll}>Télécharger le fichier ({n} anniversaires)</a>
                                    <span className="agenda__note">
                                        Google Agenda : Paramètres › Importer et exporter, puis choisis le fichier (il arrive aussi sur ton téléphone Android).
                                        Outlook, Calendrier (Mac) : ouvre simplement le fichier.
                                    </span>
                                </div>
                            </div>
                        )}
                        {toutFait && <p className="agenda__note agenda__note--ok"><Icon name="check" size={14} /> Noté : la prochaine fois, seuls les nouveaux venus te seront proposés.</p>}
                    </>
                )}

                {mode !== 'tout' && (
                    <button type="button" className="agenda__refaire" onClick={() => setToutRefaire(true)}>
                        Nouveau téléphone ou agenda vidé ? Tout réajouter
                    </button>
                )}
            </div>
        </div>
    );
}
