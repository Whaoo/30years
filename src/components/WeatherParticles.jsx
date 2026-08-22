import React, { useEffect, useRef } from 'react';

export default function WeatherParticles({ type }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!type) return undefined;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        const particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const isRain = type === 'rain';
        const count = isRain ? 140 : 80;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                len: isRain ? 10 + Math.random() * 14 : 1 + Math.random() * 2.5,
                speed: isRain ? 9 + Math.random() * 8 : 0.5 + Math.random() * 1.2,
                drift: isRain ? -1 - Math.random() * 2 : (Math.random() - 0.5) * 0.6,
                phase: Math.random() * Math.PI * 2,
                opacity: isRain ? 0.18 + Math.random() * 0.3 : 0.4 + Math.random() * 0.5,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                ctx.beginPath();
                if (isRain) {
                    ctx.strokeStyle = `rgba(191, 219, 254, ${p.opacity})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.drift, p.y + p.len);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                    ctx.arc(p.x + Math.sin(p.phase) * 6, p.y, p.len, 0, Math.PI * 2);
                    ctx.fill();
                    p.phase += 0.01;
                }
                p.y += p.speed;
                p.x += p.drift;
                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x < -20) p.x = canvas.width + 20;
                if (p.x > canvas.width + 20) p.x = -20;
            }
            raf = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [type]);

    if (!type) return null;
    return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] opacity-70" />;
}
