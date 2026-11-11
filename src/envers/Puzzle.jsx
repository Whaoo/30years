import { useEffect, useMemo, useRef, useState } from 'react';
import { WORDS } from './engine';
import Scrap from './Scrap';

// La carte est complète : on glisse les 11 lettres dans les cases de TRICK OR TREE.
// Glisser-déposer à la souris ou au doigt, ou bien toucher une lettre puis une case.
export default function Puzzle({ letters, onSolved }) {
    const tiles = useMemo(() => letters.map((l, k) => ({ id: k, ch: l.ch, dot: l.dot, seed: l.i + 1 })), [letters]);
    const groups = useMemo(() => {
        let n = 0;
        return WORDS.map((w) => w.split('').map(() => n++));
    }, []);
    const total = groups.flat().length;
    const [slots, setSlots] = useState(() => Array(total).fill(null));
    const [pool, setPool] = useState(() => shuffle(tiles.map((t) => t.id)));
    const [selected, setSelected] = useState(null);
    const [drag, setDrag] = useState(null);
    const [wrong, setWrong] = useState([]);
    const [msg, setMsg] = useState('');
    const [solved, setSolved] = useState(false);
    const dragRef = useRef(null);

    const tileOf = (id) => tiles[id];
    const wordOk = (g) => g.every((s, k) => slots[s] !== null && tileOf(slots[s]).ch === WORDS[groups.indexOf(g)][k]);
    const okGroups = groups.map(wordOk);

    const allOk = okGroups.every(Boolean);
    const solvedRef = useRef(onSolved);
    solvedRef.current = onSolved;
    useEffect(() => {
        if (allOk && !solved) {
            setSolved(true);
            setMsg('');
        }
    }, [allOk, solved]);
    useEffect(() => {
        if (!solved) return undefined;
        const t = setTimeout(() => solvedRef.current(), 900);
        return () => clearTimeout(t);
    }, [solved]);

    function place(id, slot) {
        const next = slots.slice();
        const from = next.indexOf(id);
        const occupant = next[slot];
        if (from >= 0) next[from] = occupant; // échange si la lettre venait d'une autre case
        next[slot] = id;
        const p2 = pool.filter((x) => x !== id);
        if (occupant !== null && from < 0) p2.push(occupant);
        setSlots(next);
        setPool(p2);
        setSelected(null);
        setWrong([]);
    }

    function unplace(id) {
        if (!slots.includes(id)) return;
        setSlots(slots.map((x) => (x === id ? null : x)));
        setPool(pool.includes(id) ? pool : [...pool, id]);
        setSelected(null);
        setWrong([]);
    }

    function onSlotClick(slot) {
        if (solved) return;
        if (selected !== null) place(selected, slot);
        else if (slots[slot] !== null) unplace(slots[slot]);
    }

    function startDrag(e, id) {
        if (solved) return;
        e.preventDefault();
        dragRef.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
        setDrag({ id, x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    function moveDrag(e) {
        const d = dragRef.current;
        if (!d) return;
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true;
        setDrag({ id: d.id, x: e.clientX, y: e.clientY });
    }
    function endDrag(e) {
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!d) return;
        if (!d.moved) {
            // simple toucher : sélection (ou retour au tas si la lettre était dans une case)
            if (slots.includes(d.id)) unplace(d.id);
            else setSelected((s) => (s === d.id ? null : d.id));
            return;
        }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest?.('[data-slot]');
        if (slotEl) place(d.id, Number(slotEl.dataset.slot));
        else if (el?.closest?.('.envers-pz__pool')) unplace(d.id);
    }

    function check() {
        if (slots.some((s) => s === null)) {
            setMsg('Il manque encore des lettres dans les cases.');
            return;
        }
        setWrong(groups.map((g, i) => (okGroups[i] ? -1 : i)).filter((i) => i >= 0));
        setMsg('Presque ! Les mots en rouge ne sont pas encore les bons.');
    }

    const tileProps = (id) => ({
        onPointerDown: (e) => startDrag(e, id),
        onPointerMove: moveDrag,
        onPointerUp: endDrag,
        onPointerCancel: () => {
            dragRef.current = null;
            setDrag(null);
        },
        onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (slots.includes(id)) unplace(id);
                else setSelected((s) => (s === id ? null : id));
            }
        }
    });

    return (
        <div className="envers-pz" role="dialog" aria-modal="true" aria-labelledby="envers-pz-title">
            <div className={`envers-pz__card${solved ? ' is-solved' : ''}`}>
                <h2 id="envers-pz-title">{solved ? 'Message retrouvé !' : 'La carte est complète !'}</h2>
                <p>
                    Remets les {total} morceaux dans l’ordre pour lire le message caché.
                    <br />
                    Le point <strong>rouge</strong> marque la première lettre de chaque mot.
                </p>
                <div className="envers-pz__words">
                    {groups.map((g, gi) => (
                        <div key={gi} className={`envers-pz__word${okGroups[gi] ? ' is-ok' : ''}${wrong.includes(gi) ? ' is-wrong' : ''}`}>
                            <div className="envers-pz__slots">
                                {g.map((s, k) => {
                                    const id = slots[s];
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            data-slot={s}
                                            className={`envers-pz__slot${k === 0 ? ' is-first' : ''}${selected !== null && id === null ? ' is-target' : ''}`}
                                            aria-label={id === null ? `Case ${k + 1} du mot ${gi + 1}, vide` : `Case ${k + 1} du mot ${gi + 1} : ${tileOf(id).ch}`}
                                            onClick={() => onSlotClick(s)}
                                        >
                                            {id !== null && (
                                                <span className={`envers-pz__tile${drag?.id === id ? ' is-ghosted' : ''}`} {...tileProps(id)}>
                                                    <Scrap ch={tileOf(id).ch} dot={tileOf(id).dot} seed={tileOf(id).seed} size={54} />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <span className="envers-pz__len">{g.length} lettres</span>
                        </div>
                    ))}
                </div>
                <div className="envers-pz__pool">
                    <span className="envers-pz__label">Lettres à placer</span>
                    <div className="envers-pz__tiles">
                        {pool.map((id) => (
                            <button
                                key={id}
                                type="button"
                                className={`envers-pz__tile${selected === id ? ' is-selected' : ''}${drag?.id === id ? ' is-ghosted' : ''}`}
                                aria-label={`Lettre ${tileOf(id).ch}${tileOf(id).dot ? ', début de mot' : ''}`}
                                aria-pressed={selected === id}
                                {...tileProps(id)}
                            >
                                <Scrap ch={tileOf(id).ch} dot={tileOf(id).dot} seed={tileOf(id).seed} size={62} />
                            </button>
                        ))}
                        {pool.length === 0 && <span className="envers-pz__empty">Toutes les lettres sont placées.</span>}
                    </div>
                </div>
                <div className="envers-pz__actions">
                    <button type="button" className="envers-btn envers-btn--ghost" onClick={() => setPool((p) => shuffle(p))} disabled={solved}>Mélanger</button>
                    <button type="button" className="envers-btn" onClick={check} disabled={solved}>Vérifier</button>
                </div>
                <p className="envers-pz__hint" role="status">{msg || 'Glisse une lettre dans une case, ou touche une lettre puis une case. Un mot juste s’entoure de vert.'}</p>
            </div>
            {drag && (
                <div className="envers-pz__drag" style={{ transform: `translate(${drag.x - 31}px, ${drag.y - 36}px)` }} aria-hidden="true">
                    <Scrap ch={tileOf(drag.id).ch} dot={tileOf(drag.id).dot} seed={tileOf(drag.id).seed} size={62} lifted />
                </div>
            )}
        </div>
    );
}

function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}
