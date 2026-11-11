import { useEffect, useState } from 'react';
import Icon from './Icons';
import { ALL_GAMES } from '../games';
import { DATE_SIMULATED } from '../hooks/useNow';
import { MONTHS, SHORT_MONTHS, WEEKDAYS } from '../utils/birthdayLogic';

/* global __BUILD_INFO__ */

// Panneau « Test » : uniquement en mode test (npm run dev et préversion de la branche dev, voir vite.config.js).
// Sur main, ce fichier n'est même pas inclus dans le site.
// Il permet d'ouvrir n'importe quel jeu sans attendre sa porte, et de simuler une date (?date=).

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d, h = d.getHours(), m = d.getMinutes()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;

function rule(g) {
    if (g.always) return 'toute l’année';
    if (g.birthdayOnly) return 'le jour J';
    if (g.from) return `dès le ${g.from.getDate()} déc.`;
    return `porte ${g.door}`;
}

// La date simulée est lue au chargement (voir useNow) : on recharge la page avec le nouveau ?date=
function goToDate(value) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('date', value);
    else url.searchParams.delete('date');
    url.searchParams.delete('jeu');
    window.location.assign(url.toString().replace(/%3A/gi, ':'));
}

export default function TestPanel({ now, sorted, onPlay, onEnvers, onClearBests }) {
    const [open, setOpen] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [custom, setCustom] = useState(() => stamp(now));

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const year = new Date().getFullYear();
    // Prochain vrai anniversaire (pas Noël) : pour tester le jour J et le jeu des bougies
    const star = sorted.find((p) => p.name !== 'Noël' && p.days > 0) || sorted.find((p) => p.name !== 'Noël');
    const presets = [
        { label: 'Vraie date', value: null },
        { label: '12 nov. · l’Envers', value: `${year}-11-12T10:00` },
        { label: '1er déc.', value: `${year}-12-01T10:00` },
        { label: '10 déc. · aventure', value: `${year}-12-10T10:00` },
        { label: '20 déc. · tous les jeux', value: `${year}-12-20T15:00` },
        star && { label: `Jour J de ${star.name}`, value: stamp(star.nextBirthday, 10, 0), accent: true }
    ].filter(Boolean);

    const { branch, commit } = __BUILD_INFO__;
    const shortDate = `${now.getDate()} ${SHORT_MONTHS[now.getMonth()]}`;

    const play = (id) => {
        setOpen(false);
        onPlay(id);
    };

    const clear = () => {
        if (!confirmClear) {
            setConfirmClear(true);
            return;
        }
        onClearBests();
        setConfirmClear(false);
    };

    return (
        <>
            <button
                type="button"
                className="testbar"
                aria-expanded={open}
                aria-controls="testpanel"
                title="Mode test (absent du site de production)"
                onClick={() => setOpen((o) => !o)}
            >
                <Icon name="flask" size={17} />
                <span>Test</span>
                {DATE_SIMULATED && <span className="testbar__date">{shortDate}</span>}
            </button>

            {open && (
                <section id="testpanel" className="testpanel" role="dialog" aria-label="Mode test">
                    <div className="testpanel__head">
                        <div>
                            <div className="testpanel__title">Mode test</div>
                            <div className="testpanel__sub">
                                Branche {branch || '?'}{commit ? ` · ${commit}` : ''} · absent du site de production
                            </div>
                        </div>
                        <button type="button" className="testpanel__close" aria-label="Fermer" onClick={() => setOpen(false)}>
                            <Icon name="close" size={16} />
                        </button>
                    </div>

                    <div className="testpanel__section">
                        <span className="testpanel__label">Date du site</span>
                        <p className="testpanel__now">
                            {WEEKDAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()},{' '}
                            {pad(now.getHours())}:{pad(now.getMinutes())}
                            <span className={`testpanel__tag${DATE_SIMULATED ? ' is-sim' : ''}`}>
                                {DATE_SIMULATED ? 'simulée' : 'vraie date'}
                            </span>
                        </p>
                        <div className="testpanel__chips">
                            {presets.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className={`tchip${p.accent ? ' tchip--accent' : ''}`}
                                    onClick={() => goToDate(p.value)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <form
                            className="testpanel__form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (custom) goToDate(custom);
                            }}
                        >
                            <input
                                type="datetime-local"
                                aria-label="Autre date"
                                value={custom}
                                onChange={(e) => setCustom(e.target.value)}
                            />
                            <button type="submit" className="tchip">Aller</button>
                        </form>
                    </div>

                    <div className="testpanel__section">
                        <span className="testpanel__label">La cave sous la page</span>
                        <div className="testpanel__chips">
                            <button type="button" className="tchip tchip--accent" onClick={() => { setOpen(false); onEnvers(); }}>Descendre dans l’Envers</button>
                            <button type="button" className="tchip" onClick={() => { try { window.localStorage.removeItem('30years:envers'); window.localStorage.removeItem('30years:envers-news'); } catch { /* rien */ } }}>Effacer la progression et l’annonce</button>
                        </div>
                    </div>

                    <div className="testpanel__section">
                        <span className="testpanel__label">Tous les jeux, sans attendre leur porte</span>
                        <div className="testpanel__games">
                            {ALL_GAMES.map((g) => (
                                <button key={g.id} type="button" className="tgame" title={g.title} onClick={() => play(g.id)}>
                                    <Icon name={g.icon} size={18} />
                                    <span className="tgame__text">
                                        <span className="tgame__name">{g.short}</span>
                                        <span className="tgame__rule">{rule(g)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="testpanel__foot">
                        <span>Records gardés dans ce navigateur uniquement.</span>
                        <button
                            type="button"
                            className={`tchip${confirmClear ? ' tchip--danger' : ''}`}
                            onClick={clear}
                            onBlur={() => setConfirmClear(false)}
                        >
                            {confirmClear ? 'Confirmer ?' : 'Effacer les records'}
                        </button>
                    </div>
                </section>
            )}
        </>
    );
}
