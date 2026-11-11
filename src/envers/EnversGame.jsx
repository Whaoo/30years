import { useCallback, useEffect, useRef, useState } from 'react';
import { createEngine, loadCaveArt, loadEndArt, loadIntroArt, LETTER_COUNT, LEVEL } from './engine';
import { loadProgress, saveProgress } from './config';
import { createMusic } from './music';
import Puzzle from './Puzzle';
import Scrap from './Scrap';

// « L'Envers » : plein écran par-dessus la page d'accueil.
// onClose({ kind: 'win', time } | { kind: 'quit', found })
export default function EnversGame({ onClose }) {
    const canvasRef = useRef(null);
    const miniRef = useRef(null);
    const engineRef = useRef(null);
    const musicRef = useRef(null);
    const closedRef = useRef(false);
    const [phase, setPhase] = useState('intro');
    const [found, setFound] = useState([]);
    const [pct, setPct] = useState(0);
    const [hint, setHint] = useState('');
    const [paused, setPaused] = useState(false);
    const [music, setMusic] = useState(false);
    const [bigMap, setBigMap] = useState(false);
    const [showKeys, setShowKeys] = useState(true);
    const [touch] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const close = useCallback((result) => {
        if (closedRef.current) return;
        closedRef.current = true;
        onCloseRef.current(result);
    }, []);

    useEffect(() => {
        const progress = loadProgress();
        const engine = createEngine({
            canvas: canvasRef.current,
            miniCanvas: miniRef.current,
            progress,
            touch,
            cb: {
                onPhase: setPhase,
                onLetter: () => setFound(engine.state().found.slice()),
                onProgress: setPct,
                onHint: (h) => setHint(h),
                onGoal: () => {
                    setHint('');
                    setTimeout(() => engine.openPuzzle(), 700);
                },
                onSave: (snap) => saveProgress(snap),
                onRopeTop: () => engine.ropeUp(),
                onDone: (kind, data) => {
                    if (kind === 'win') {
                        saveProgress(null);
                        close({ kind: 'win', time: data.time });
                    } else {
                        saveProgress(data);
                        close({ kind: 'quit', found: data.found.length });
                    }
                }
            }
        });
        engineRef.current = engine;
        setFound(engine.state().found.slice());
        setPct(Math.floor(engine.state().pct * 100));
        engine.start();
        const caveScale = Math.max(1, Math.min(1.5, (window.devicePixelRatio || 1) * Math.min(window.innerWidth / 1280, window.innerHeight / 720)));
        loadIntroArt().then((a) => engine.setArt('intro', a)).catch(() => {});
        loadCaveArt(caveScale)
            .then((a) => {
                engine.setArt('cave', a);
                return loadEndArt();
            })
            .then((a) => engine.setArt('end', a))
            .catch(() => {});
        const onResize = () => engine.resize();
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            engine.destroy();
            musicRef.current?.destroy();
            if (__TEST_MODE__) delete window.envers;
        };
    }, [close, touch]);

    // clavier
    useEffect(() => {
        const down = (e) => {
            const engine = engineRef.current;
            if (!engine) return;
            if (e.code === 'Escape' || e.code === 'KeyP') {
                if (phase === 'play') {
                    e.preventDefault();
                    setPaused((v) => !v);
                } else if (phase === 'intro' && e.code === 'Escape') engine.skip();
                return;
            }
            if (phase === 'puzzle' || paused) return;
            if (e.code === 'KeyM' && phase === 'play') {
                setBigMap((v) => !v);
                return;
            }
            if (engine.key(e.code, true)) e.preventDefault();
        };
        const up = (e) => engineRef.current?.key(e.code, false);
        const blur = () => {
            engineRef.current?.releaseKeys();
            if (phase === 'play') setPaused(true);
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
        };
    }, [phase, paused]);

    useEffect(() => {
        engineRef.current?.setPaused(paused);
    }, [paused]);

    // la légende des touches s'efface au bout de 12 secondes de jeu
    useEffect(() => {
        if (phase !== 'play') return undefined;
        const t = setTimeout(() => setShowKeys(false), 12000);
        return () => clearTimeout(t);
    }, [phase]);

    useEffect(() => {
        if (!hint) return undefined;
        const t = setTimeout(() => setHint(''), 6000);
        return () => clearTimeout(t);
    }, [hint]);

    useEffect(() => {
        musicRef.current?.setLevel(found.length / LETTER_COUNT);
    }, [found]);

    const toggleMusic = () => {
        if (!musicRef.current) musicRef.current = createMusic();
        if (music) musicRef.current.stop();
        else musicRef.current.start();
        musicRef.current.setLevel(found.length / LETTER_COUNT);
        setMusic(!music);
    };

    const rope = () => {
        const engine = engineRef.current;
        if (!engine) return;
        setPaused(false);
        saveProgress(engine.snapshot());
        engine.ropeUp();
    };

    const restart = () => {
        engineRef.current?.reset();
        saveProgress(null);
        setFound([]);
        setPct(0);
        setPaused(false);
    };

    const playing = phase === 'play';
    const hud = playing || phase === 'puzzle';
    const ending = ['lights', 'message', 'freeze', 'time', 'rope', 'done'].includes(phase);

    return (
        <div className={`envers${phase === 'intro' ? ' is-intro' : ''}`} role="application" aria-label="L’Envers : la cave sous la page">
            <canvas
                ref={canvasRef}
                className="envers__canvas"
                onPointerMove={(e) => {
                    if (e.pointerType === 'touch') engineRef.current?.joyMove(e.clientX, e.clientY);
                    else engineRef.current?.pointerMove(e.clientX, e.clientY);
                }}
                onPointerDown={(e) => {
                    if (e.pointerType === 'touch' && phase === 'play') {
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        engineRef.current?.joyStart(e.clientX, e.clientY);
                    } else engineRef.current?.click();
                }}
                onPointerUp={() => engineRef.current?.joyEnd()}
                onPointerCancel={() => engineRef.current?.joyEnd()}
            />

            {phase === 'intro' && (
                <button type="button" className="envers__skip" onClick={() => engineRef.current?.skip()}>Passer</button>
            )}

            <div className={`envers__hud${hud ? ' is-on' : ''}`} aria-hidden={!hud}>
                <div className="envers__stats">
                    <span>Lettres <strong>{found.length} / {LETTER_COUNT}</strong></span>
                    <span className="envers__sep">·</span>
                    <span>Cave éclairée <strong className="is-gold">{pct} %</strong></span>
                    <span className="envers__bar"><span style={{ transform: `scaleX(${Math.min(1, pct / 90)})` }} /></span>
                </div>
                <div className="envers__actions">
                    <button type="button" className="envers__rope" onClick={rope} disabled={!playing}>
                        <svg width="18" height="22" viewBox="-10 -12 20 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M0 -10V10M-4 -6l4 -4l4 4M-3 -2q3 2 6 0M-3 3q3 2 6 0" /></svg>
                        Utiliser la corde en rappel
                    </button>
                    <button type="button" className="envers__icon" onClick={toggleMusic} aria-pressed={music} aria-label={music ? 'Couper la musique' : 'Mettre la musique'}>
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />{!music && <path d="M3 3l18 18" />}</svg>
                    </button>
                    <button type="button" className="envers__icon" onClick={() => setPaused(true)} disabled={!playing} aria-label="Pause">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5" /><rect x="14" y="4" width="5" height="16" rx="1.5" /></svg>
                    </button>
                </div>
                <div className="envers__inv" aria-label={`Morceaux de carte : ${found.map((l) => l.ch).join(' ')}`}>
                    <span className="envers__label">Morceaux de carte</span>
                    <div className="envers__slots">
                        {Array.from({ length: LETTER_COUNT }, (_, k) => (
                            <span key={k} className={`envers__slot${found[k] ? ' is-full' : ''}`}>
                                {found[k] && <Scrap ch={found[k].ch} dot={found[k].dot} seed={found[k].i + 1} size={28} />}
                            </span>
                        ))}
                    </div>
                </div>
                {touch ? (
                    <div className={`envers__keys envers__keys--touch${showKeys ? ' is-on' : ''}`} aria-hidden="true">
                        <span>Pose le doigt et glisse pour te déplacer : la lampe suit.</span>
                    </div>
                ) : (
                    <div className={`envers__keys${showKeys || paused ? ' is-on' : ''}`} aria-hidden="true">
                        <span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> se déplacer partout</span>
                        <span className="envers__mouse">la souris oriente la lampe</span>
                        <span><kbd>M</kbd> carte</span>
                        <span><kbd className="is-wide">Échap</kbd> pause</span>
                    </div>
                )}
                <button type="button" className={`envers__map${bigMap ? ' is-big' : ''}`} onClick={() => setBigMap((v) => !v)} aria-label={bigMap ? 'Réduire la carte' : 'Agrandir la carte'}>
                    <canvas ref={miniRef} width={LEVEL.minimap.w} height={LEVEL.minimap.h} />
                    <span className="envers__maplabel">Carte · {pct} %</span>
                </button>
            </div>

            {hint && playing && <div className="envers__hint" role="status">{hint}</div>}

            {paused && playing && (
                <div className="envers__pause" role="dialog" aria-modal="true" aria-label="Pause">
                    <div className="envers__pausecard">
                        <h2>Pause</h2>
                        <p>{found.length} lettre{found.length > 1 ? 's' : ''} sur {LETTER_COUNT} · cave éclairée à {pct} %</p>
                        <button type="button" className="envers-btn" onClick={() => setPaused(false)} autoFocus>Reprendre</button>
                        <button type="button" className="envers-btn envers-btn--ghost" onClick={rope}>Utiliser la corde en rappel</button>
                        <button type="button" className="envers-btn envers-btn--ghost" onClick={restart}>Recommencer la cave</button>
                    </div>
                </div>
            )}

            {phase === 'puzzle' && <Puzzle letters={found} onSolved={() => engineRef.current?.startVictory()} />}

            {ending && phase !== 'rope' && phase !== 'done' && (
                <button type="button" className="envers__skip" onClick={() => engineRef.current?.click()}>Suite</button>
            )}
        </div>
    );
}

/* global __TEST_MODE__ */
