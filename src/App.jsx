import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Background from './components/Background';
import WeatherParticles from './components/WeatherParticles';
import Header from './components/Header';
import Countdown from './components/Countdown';
import UpcomingList from './components/UpcomingList';
import StatTiles from './components/StatTiles';
import GamesTile from './components/GamesTile';
import GameModal from './components/GameModal';
import { GAMES, getGame, isUnlocked } from './games';
import { loadBests, saveScore } from './games/scores';
import AdventCalendar from './components/AdventCalendar';
import Gags from './components/Gags';
import Confetti from './components/Confetti';
import Dial from './components/Dial';
import { MONTHS, birthdays, getSortedBirthdays } from './utils/birthdayLogic';
import { adventState } from './utils/advent';
import { resolveTheme, themeStyle } from './utils/theme';
import { useWeather } from './hooks/useWeather';
import { useNow } from './hooks/useNow';
import { useDialMode } from './hooks/useDialMode';
import { usePenguinPlay } from './hooks/usePenguinPlay';

const HOUR = 3600000;

function greeting(now, isToday) {
    if (isToday) return 'C’est le grand jour !';
    const h = now.getHours();
    if (h < 12) return 'Bonjour !';
    if (h < 18) return 'Salut !';
    return 'Bonsoir !';
}

function plural(n, word) {
    return `${n} ${word}${n > 1 ? 's' : ''}`;
}

function App() {
    const now = useNow();
    const { weather } = useWeather();
    const isDial = useDialMode();

    const weatherCode = weather?.hourlyData?.hourly?.weathercode?.[new Date().getHours()] ?? null;
    const theme = useMemo(() => resolveTheme(now, weatherCode), [now, weatherCode]);
    const sorted = useMemo(() => getSortedBirthdays(now), [now]);
    const advent = adventState(now);

    const [view, setView] = useState(null);
    const [disco, setDisco] = useState(false);
    const [shake, setShake] = useState(false);
    const [toast, setToast] = useState('');
    const [confetti, setConfetti] = useState(0);
    const [gag, setGag] = useState(null);
    const [bests, setBests] = useState(() => loadBests(GAMES.map((g) => g.id)));
    // ?jeu=snowball ouvre directement un jeu (s'il est débloqué), pratique pour tester
    const [gameId, setGameId] = useState(() => {
        const id = new URLSearchParams(window.location.search).get('jeu');
        const g = getGame(id);
        return g && isUnlocked(g, advent) ? g.id : null;
    });

    const gameOpen = useRef(false);
    gameOpen.current = !!gameId;
    const reloadPending = useRef(false);
    const toastTimer = useRef();
    const confettiTimer = useRef();
    const gagTimer = useRef();
    const gagCount = useRef(0);
    const gagBusy = useRef(false);
    const logoClicks = useRef(0);
    const lockTries = useRef(0);

    const flash = useCallback((text) => {
        clearTimeout(toastTimer.current);
        setToast(text);
        toastTimer.current = setTimeout(() => setToast(''), 2800);
    }, []);

    const boom = useCallback(() => {
        clearTimeout(confettiTimer.current);
        setConfetti((k) => k + 1);
        confettiTimer.current = setTimeout(() => setConfetti(0), 3400);
    }, []);

    const play = usePenguinPlay(boom);
    const { wave, say } = play;

    const first = sorted[0];
    const group = sorted.filter((p) => p.days === first.days);
    const isToday = first.days === 0;
    const firstId = first.id;

    // Rechargement toutes les heures (écran affiché en continu) pour récupérer les mises à jour,
    // repoussé à la fin de la partie si un mini-jeu est ouvert
    useEffect(() => {
        const id = setInterval(() => {
            if (gameOpen.current) reloadPending.current = true;
            else window.location.reload();
        }, HOUR);
        return () => clearInterval(id);
    }, []);

    const closeGame = useCallback(() => {
        setGameId(null);
        if (reloadPending.current) window.location.reload();
    }, []);

    const onGameScore = useCallback((id, score) => {
        const g = getGame(id);
        // Un score nul n'est jamais un record (partie ratée d'entrée)
        if (!g?.lowerIsBetter && score <= 0) return false;
        const record = saveScore(id, score, g?.lowerIsBetter);
        if (record) setBests((b) => ({ ...b, [id]: score }));
        return record;
    }, []);

    useEffect(() => () => {
        clearTimeout(toastTimer.current);
        clearTimeout(confettiTimer.current);
        clearTimeout(gagTimer.current);
    }, []);

    // Le pingouin du prochain anniversaire salue à l'arrivée
    const greetRef = useRef({ id: firstId, text: greeting(now, isToday), party: isToday });
    useEffect(() => {
        const { id, text, party } = greetRef.current;
        const t = setTimeout(() => {
            wave(id);
            say(id, text, 'happy', 3000);
            if (party) boom();
        }, 700);
        return () => clearTimeout(t);
    }, [wave, say, boom]);

    // Le jour J, le pingouin star refait coucou régulièrement
    useEffect(() => {
        if (!isToday) return undefined;
        const id = setInterval(() => wave(firstId), 20000);
        return () => clearInterval(id);
    }, [isToday, firstId, wave]);

    // Molette : pas de scroll, mais des gags
    const onWheel = useCallback((e) => {
        if (gagBusy.current || gameOpen.current) return;
        gagBusy.current = true;
        gagCount.current += 1;
        const n = gagCount.current;
        let kind = n % 2 === 1 ? 'slide' : 'peek';
        if (e.deltaY < 0) kind = 'drop';
        setGag({ kind, n });
        gagTimer.current = setTimeout(() => {
            gagBusy.current = false;
            setGag(null);
        }, 2900);
        if (n === 7) {
            setDisco(true);
            setShake(true);
            flash('Sept scrolls pour rien ? Mode aurore débloqué.');
            setTimeout(() => setShake(false), 700);
        }
    }, [flash]);

    const onLogo = useCallback(() => {
        logoClicks.current += 1;
        if (logoClicks.current < 5) return;
        logoClicks.current = 0;
        const on = !disco;
        setDisco(on);
        flash(on ? 'Mode aurore activé.' : 'Retour à la normale.');
    }, [disco, flash]);

    if (isDial) return <Dial theme={theme} sorted={sorted} advent={advent} />;

    // En décembre, le calendrier de l'Avent est affiché par défaut
    const isAvent = advent.isDecember && (view ?? 'avent') === 'avent';

    const onHome = () => setView('home');
    const onAvent = () => {
        if (advent.isDecember) {
            setView('avent');
            return;
        }
        lockTries.current += 1;
        const d = advent.daysToStart;
        flash(lockTries.current >= 3
            ? `Le pingouin gardien t’a à l’œil. Toujours J-${d}.`
            : `Patience : ouverture le 1er décembre, dans ${plural(d, 'jour')}.`);
    };

    const openGame = (id) => {
        const g = getGame(id);
        if (!g) return;
        if (!isUnlocked(g, advent)) {
            flash(`${g.title} : disponible le ${g.door} décembre.`);
            return;
        }
        setGameId(id);
    };

    const onWish = () => {
        boom();
        group.forEach((p) => {
            wave(p.id);
            say(p.id, 'Merci, on fête ça !', 'happy');
        });
    };

    // En décembre, la tuile des 10 mini-jeux prend de la place : 3 anniversaires au lieu de 4
    const listItems = isAvent ? sorted.slice(0, 3) : sorted.slice(group.length, group.length + 4);
    const shownCount = isAvent ? 3 : group.length + 4;
    const restCount = Math.max(0, sorted.length - shownCount);
    const lastMonth = sorted[sorted.length - 1].nextBirthday.getMonth();
    const horizon = lastMonth === now.getMonth() ? 'dans l’année' : `d’ici ${MONTHS[lastMonth]}`;
    const restLabel = restCount > 0
        ? `Et ${restCount} ${restCount > 1 ? 'autres' : 'autre'} ${horizon}.`
        : null;

    const monthCount = birthdays.filter((b) => Number(b.date.split('-')[1]) === now.getMonth() + 1).length;
    const tiles = [
        { value: String(monthCount), label: `${monthCount > 1 ? 'anniversaires' : 'anniversaire'} en ${MONTHS[now.getMonth()]}` },
        advent.isDecember
            ? { value: `${advent.openCount}/25`, label: 'portes ouvertes' }
            : { value: `J-${advent.daysToStart}`, label: 'avant le calendrier de l’Avent' }
    ];

    return (
        <div className={`app${gameId ? ' is-gaming' : ''}`} style={themeStyle(theme)} onWheel={onWheel}>
            <Background theme={theme} disco={disco} />
            {!gameId && <WeatherParticles type={theme.weatherParticles} />}

            <div className={`layout${shake ? ' is-shaking' : ''}`}>
                <Header
                    theme={theme}
                    weather={weather}
                    isAvent={isAvent}
                    isDecember={advent.isDecember}
                    daysToStart={advent.daysToStart}
                    onHome={onHome}
                    onAvent={onAvent}
                    onLogo={onLogo}
                />

                <main className={`main${isAvent ? ' main--avent' : ''}`}>
                    {isAvent
                        ? <AdventCalendar now={now} bests={bests} onPlay={openGame} />
                        : <Countdown group={group} now={now} play={play} onWish={onWish} />}
                    <aside className="side">
                        <UpcomingList
                            title={isAvent ? 'Anniversaires' : 'Ensuite'}
                            items={listItems}
                            highlightFirst={isAvent}
                            restLabel={restLabel}
                            play={play}
                        />
                        {isAvent
                            ? <GamesTile openCount={advent.openCount} bests={bests} onPlay={openGame} />
                            : <StatTiles tiles={tiles} />}
                    </aside>
                </main>

                <footer className="footer-hint hide-short">
                    <p className="glass">Psst : les pingouins ont des secrets. Et il n’y a rien plus bas… quoique.</p>
                </footer>
            </div>

            {toast && (
                <div className="toast-wrap" role="status">
                    <span className="toast">{toast}</span>
                </div>
            )}
            {confetti > 0 && <Confetti key={confetti} />}
            <Gags gag={gag} people={sorted} />
            {gameId && (
                <GameModal
                    game={getGame(gameId)}
                    best={bests[gameId]}
                    onScore={onGameScore}
                    onClose={closeGame}
                />
            )}
        </div>
    );
}

export default App;
