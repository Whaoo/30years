import { useEffect, useRef } from 'react';

// Moteur commun des jeux canvas : boucle d'animation, mise à l'échelle (écran Retina compris),
// clavier, souris et tactile. Chaque jeu fournit create(api) qui renvoie
// { update(dt), render(ctx), pointerDown, pointerMove, pointerUp, keyDown(code, repeat), keyUp(code) }.
// La logique travaille toujours dans un repère fixe (width × height).
const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export default function GameCanvas({ create, onScore, width = 800, height = 450, controls = null, label = 'Mini-jeu' }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const controlsRef = useRef(null);
    const gameRef = useRef(null);
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
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.style.width = `${Math.floor(cw)}px`;
            canvas.style.height = `${Math.floor(ch)}px`;
            canvas.width = Math.max(1, Math.round(cw * dpr));
            canvas.height = Math.max(1, Math.round(ch * dpr));
        };
        resize();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (ro) ro.observe(wrap);
        else window.addEventListener('resize', resize);

        const frame = (now) => {
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            if (!paused) game.update(dt);
            ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
            game.render(ctx);
            raf = requestAnimationFrame(frame);
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
            const [x, y] = toLocal(e);
            if (game.pointerDown) game.pointerDown(x, y);
        };
        const onMove = (e) => {
            const [x, y] = toLocal(e);
            if (game.pointerMove) game.pointerMove(x, y);
        };
        const onUp = (e) => {
            const [x, y] = toLocal(e);
            if (game.pointerUp) game.pointerUp(x, y);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') return;
            if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
            if (game.keyDown) game.keyDown(e.code, e.repeat);
        };
        const onKeyUp = (e) => {
            if (game.keyUp) game.keyUp(e.code);
        };
        const onVisibility = () => {
            paused = document.hidden;
            last = performance.now();
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        document.addEventListener('visibilitychange', onVisibility);
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
            if (game.destroy) game.destroy();
            gameRef.current = null;
        };
    }, [create, width, height]);

    const press = (code, down) => {
        const game = gameRef.current;
        if (!game) return;
        if (down && game.keyDown) game.keyDown(code, false);
        if (!down && game.keyUp) game.keyUp(code);
    };

    return (
        <div className="game-canvas-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} className="game-canvas" tabIndex={0} aria-label={label} />
            {controls && (
                <div className="game-controls" ref={controlsRef}>
                    {controls.map((c) => (
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
