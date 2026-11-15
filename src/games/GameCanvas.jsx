import { useEffect, useRef } from 'react';
import { drawOverlay } from './draw';

// Moteur commun des jeux canvas : boucle d'animation, mise à l'échelle (écran Retina compris),
// clavier, souris et tactile. Chaque jeu fournit create(api) qui renvoie
// { update(dt), render(ctx), pointerDown, pointerMove, pointerUp, keyDown(code, repeat), keyUp(code) }.
// La logique travaille toujours dans un repère fixe (width × height).
// pausable : P met en pause (et la partie se fige si la fenêtre perd le focus). Le jeu peut fournir
// canPause() pour n'autoriser la pause que pendant une partie en cours, et blur() pour relâcher ses touches.
// fixedStep : update() est appelé à pas fixe (1/120 s), quelle que soit la fréquence de l'écran (60, 120, 144 Hz…).
// Indispensable aux jeux du « scénario du jour » (src/december/) : même partie et même difficulté pour tout le monde.
// Les gestionnaires pointer* reçoivent aussi l'identifiant du doigt (multi-touch : courir et sauter en même temps).
const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const STEP = 1 / 120;
const MAX_PIXELS = 2.1e6;

export default function GameCanvas({ create, onScore, width = 800, height = 450, controls = null, label = 'Mini-jeu', pausable = false, fixedStep = false }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const controlsRef = useRef(null);
    const gameRef = useRef(null);
    const pauseRef = useRef(null);
    const scoreRef = useRef(onScore);

    useEffect(() => {
        scoreRef.current = onScore;
    }, [onScore]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        const ctx = canvas.getContext('2d');
        const api = {
            width,
            height,
            reportScore: (score) => (scoreRef.current ? scoreRef.current(score) : false)
        };
        const game = create(api);
        gameRef.current = game;

        let raf = 0;
        let last = performance.now();
        let paused = document.hidden;
        let userPaused = false;
        const canPause = () => pausable && (!game.canPause || game.canPause());
        const setUserPaused = (on) => {
            if (on && !canPause()) return;
            userPaused = on;
            last = performance.now();
            if (on && game.blur) game.blur();
        };
        pauseRef.current = () => setUserPaused(!userPaused);

        const resize = () => {
            const ctrlH = controlsRef.current ? controlsRef.current.offsetHeight + 10 : 0;
            const availW = wrap.clientWidth;
            const availH = Math.max(80, wrap.clientHeight - ctrlH);
            let cw = availW;
            let ch = (cw * height) / width;
            if (ch > availH) {
                ch = availH;
                cw = (ch * width) / height;
            }
            // Résolution plafonnée : au-delà, l'œil ne voit pas la différence mais la carte graphique si
            // et un plafond de pixels pour les grands écrans (1440p plein écran : sinon 3,7 millions de pixels par image)
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch)));
            canvas.style.width = `${Math.floor(cw)}px`;
            canvas.style.height = `${Math.floor(ch)}px`;
            canvas.width = Math.max(1, Math.round(cw * dpr));
            canvas.height = Math.max(1, Math.round(ch * dpr));
        };
        resize();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (ro) ro.observe(wrap);
        else window.addEventListener('resize', resize);

        let acc = 0;
        const frame = (now) => {
            raf = requestAnimationFrame(frame);
            if (paused) {
                last = now;
                return;
            }
            if (fixedStep) {
                acc += Math.min(0.25, Math.max(0, (now - last) / 1000));
                last = now;
                let steps = 0;
                while (acc >= STEP && steps < 8) {
                    if (!userPaused) game.update(STEP);
                    acc -= STEP;
                    steps += 1;
                }
                if (steps === 8) acc = 0; // machine trop lente : on ralentit plutôt que d'accumuler du retard
            } else {
                const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
                last = now;
                if (!userPaused) game.update(dt);
            }
            ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
            game.render(ctx);
            if (userPaused) drawOverlay(ctx, width, height, 'Pause', ['Appuie sur P ou clique pour reprendre.']);
        };
        raf = requestAnimationFrame(frame);

        const toLocal = (e) => {
            const r = canvas.getBoundingClientRect();
            return [((e.clientX - r.left) * width) / r.width, ((e.clientY - r.top) * height) / r.height];
        };
        const onDown = (e) => {
            e.preventDefault();
            canvas.focus({ preventScroll: true });
            if (canvas.setPointerCapture) {
                try { canvas.setPointerCapture(e.pointerId); } catch { /* sans importance */ }
            }
            if (userPaused) {
                setUserPaused(false);
                return;
            }
            const [x, y] = toLocal(e);
            if (game.pointerDown) game.pointerDown(x, y, e.pointerId);
        };
        const onMove = (e) => {
            if (userPaused) return;
            const [x, y] = toLocal(e);
            if (game.pointerMove) game.pointerMove(x, y, e.pointerId);
        };
        const onUp = (e) => {
            const [x, y] = toLocal(e);
            if (game.pointerUp) game.pointerUp(x, y, e.pointerId);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') return;
            if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
            if (pausable && e.code === 'KeyP') {
                if (!e.repeat) setUserPaused(!userPaused);
                return;
            }
            if (userPaused) return;
            if (game.keyDown) game.keyDown(e.code, e.repeat);
        };
        const onKeyUp = (e) => {
            if (game.keyUp) game.keyUp(e.code);
        };
        const onVisibility = () => {
            paused = document.hidden;
            last = performance.now();
        };
        // Fenêtre qui perd le focus : on relâche les touches (sinon le personnage continue d'avancer)
        const onBlur = () => {
            if (game.blur) game.blur();
            setUserPaused(true);
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', onBlur);
        canvas.focus({ preventScroll: true });

        return () => {
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect();
            else window.removeEventListener('resize', resize);
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', onBlur);
            if (game.destroy) game.destroy();
            gameRef.current = null;
            pauseRef.current = null;
        };
    }, [create, width, height, pausable, fixedStep]);

    const press = (code, down) => {
        const game = gameRef.current;
        if (!game) return;
        if (code === 'KeyP') {
            if (down && pauseRef.current) pauseRef.current();
            return;
        }
        if (down && game.keyDown) game.keyDown(code, false);
        if (!down && game.keyUp) game.keyUp(code);
    };
    const buttons = controls || pausable
        ? [...(controls || []), ...(pausable ? [{ code: 'KeyP', text: 'Pause', label: 'Mettre en pause' }] : [])]
        : null;

    return (
        <div className="game-canvas-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label={label} />
            {buttons && (
                <div className="game-controls" ref={controlsRef}>
                    {buttons.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            className="game-ctrl"
                            tabIndex={-1}
                            aria-label={c.label}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                press(c.code, true);
                            }}
                            onPointerUp={() => press(c.code, false)}
                            onPointerLeave={() => press(c.code, false)}
                        >
                            {c.text}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
