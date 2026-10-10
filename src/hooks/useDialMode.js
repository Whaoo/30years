import { useEffect, useState } from 'react';

// Vue « Speed Dial » (vignette carrée de Vivaldi) :
// - forcée avec ?dial ou /dial
// - automatique quand la fenêtre est un petit carré (≤ 480 × 480)
function detect() {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has('dial')) return true;
    if (window.location.pathname.replace(/\/+$/, '') === '/dial') return true;
    return window.innerWidth <= 480 && window.innerHeight <= 480;
}

export function useDialMode() {
    const [dial, setDial] = useState(detect);

    useEffect(() => {
        const onResize = () => setDial(detect());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return dial;
}
