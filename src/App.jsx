import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Background from './components/Background';
import WeatherParticles from './components/WeatherParticles';
import Header from './components/Header';
import Countdown from './components/Countdown';
import UpcomingList from './components/UpcomingList';
import StatTiles from './components/StatTiles';
import GamesTile from './components/GamesTile';
import GameModal from './components/GameModal';
import { ADVENTURE, ALL_GAMES, CANDLES, QUIZ, getGame, isUnlocked } from './games';
import { clearBests, loadBests, saveScore } from './games/scores';
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
import { announceActive, dismissAnnounce, formatTime, isEnversOpen } from './envers/config';
import NewsBanner from './envers/NewsBanner';
import Crack from './envers/Crack';

const HOUR = 3600000;

/* global __TEST_MODE__ */
// Panneau « Test » : seulement en mode test (npm run dev, préversion dev). Sur main il n'est pas inclus dans le site.
const TestPanel = __TEST_MODE__ ? lazy(() => import('./components/TestPanel')) : null;
// La cave sous la page : chargée seulement quand on y descend
const EnversGame = lazy(() => import('./envers/EnversGame'));

// Adresses directes, pratiques pour tester : /aventure, /bougies, /quiz
const PATH_GAMES = { '/aventure': ADVENTURE.id, '/bougies': CANDLES.id, '/quiz': QUIZ.id };
function pathGame() {
    return PATH_GAMES[window.location.pathname.replace(/\/+$/, '')] || null;
}
// /envers ouvre directement la cave, en mode test uniquement (en production, il faut trouver le passage)
const enversPath = () => __TEST_MODE__ && window.location.pathname.replace(/\/+$/, '') === '/envers';

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
    const [bests, setBests] = useState(() => loadBests(ALL_GAMES.map((g) => g.id)));
    // ?jeu=snowball ouvre directement un jeu (s'il est débloqué, ou toujours en mode test), /aventure ouvre le jeu d'aventure
    const [gameId, setGameId] = useState(() => {
        const fromPath = pathGame();
        if (fromPath) return fromPath;
        const id = new URLSearchParams(window.location.search).get('jeu');
        const g = getGame(id);
        if (!g) return null;
        return __TEST_MODE__ || isUnlocked(g, advent, now, { isBirthday: sorted[0].days === 0 }) ? g.id : null;
    });

    const [envers, setEnvers] = useState(enversPath);
    const [stage, setStage] = useState(0); // passage : 0 rien, 1 ça gratte, 2 ça craque
    const [newsHidden, setNewsHidden] = useState(false);
    const [enversCovered, setEnversCovered] = useState(false); // la page reste visible pendant la première seconde de la chute
    const stageRef = useRef({ n: 0, last: 0, timer: 0 });
    const touchY = useRef(null);

    const gameOpen = useRef(false);
    gameOpen.current = !!gameId || envers;
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
        // Arrivé par une adresse directe (/aventure…) : on revient à l'accueil sans recharger la page
        if (pathGame()) window.history.replaceState(null, '', '/');
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

    const enversOpen = isEnversOpen(now, isToday);
    const news = announceActive(now, isToday) && !newsHidden;

    // Le passage vers l'Envers : trois coups vers le bas (molette ou glissé), sans pause de plus de 4 secondes
    const passageStep = useCallback(() => {
        const st = stageRef.current;
        const t = performance.now();
        if (t - st.last < 380) return; // un seul coup de molette envoie plusieurs évènements
        st.last = t;
        st.n += 1;
        clearTimeout(st.timer);
        if (st.n >= 3) {
            st.n = 0;
            setStage(0);
            dismissAnnounce();
            setNewsHidden(true);
            setEnvers(true);
            return;
        }
        setStage(st.n);
        st.timer = setTimeout(() => {
            st.n = 0;
            setStage(0);
        }, 4000);
    }, []);

    useEffect(() => () => clearTimeout(stageRef.current.timer), []);
    useEffect(() => {
        if (!envers) {
            setEnversCovered(false);
            return undefined;
        }
        const t = setTimeout(() => setEnversCovered(true), 1100);
        return () => clearTimeout(t);
    }, [envers]);

    // Molette : pas de scroll, mais des gags (et, à partir du 12 novembre, le passage vers la cave)
    const onWheel = useCallback((e) => {
        if (gameOpen.current) return;
        if (enversOpen && e.deltaY > 0) {
            passageStep();
            return;
        }
        if (gagBusy.current) return;
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
    }, [flash, enversOpen, passageStep]);

    const onTouchStart = (e) => {
        touchY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e) => {
        const y0 = touchY.current;
        touchY.current = null;
        const y1 = e.changedTouches[0]?.clientY;
        if (!enversOpen || gameOpen.current || y0 === null || y1 === undefined) return;
        if (y0 - y1 > 60) passageStep(); // glissé vers le haut = on descend dans la page
    };

    const closeEnvers = useCallback((result) => {
        setEnvers(false);
        if (enversPath()) window.history.replaceState(null, '', '/');
        if (result?.kind === 'win') {
            const record = saveScore('envers', Math.round(result.time), true);
            boom();
            flash(`Bravo ! Cave éclairée et message retrouvé en ${formatTime(result.time)}${record ? ' · nouveau record' : ''}.`);
        } else if (result?.kind === 'quit') {
            flash(`Retour à la surface : ${result.found} lettre${result.found > 1 ? 's' : ''} sur 11 gardée${result.found > 1 ? 's' : ''} pour la prochaine fois.`);
        }
        if (reloadPending.current) window.location.reload();
    }, [boom, flash]);

    const onLogo = useCallback(() => {
        logoClicks.current += 1;
        if (logoClicks.current < 5) return;
        logoClicks.current = 0;
        const on = !disco;
        setDisco(on);
        flash(on ? 'Mode aurore activé.' : 'Retour à la normale.');
    }, [disco, flash]);

    if (isDial) return <Dial theme={theme} sorted={sorted} advent={advent} news={announceActive(now, isToday)} />;

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
        if (!isUnlocked(g, advent, now, { isBirthday: isToday })) {
            flash(g.birthdayOnly ? 'Ce jeu n’apparaît que le jour d’un anniversaire.' : `${g.title} : disponible le ${g.door} décembre.`);
            return;
        }
        setGameId(id);
    };

    const onWish = () => {
        if (!isToday) return; // seulement le jour de l'anniversaire
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
        <div className={`app${gameId || enversCovered ? ' is-gaming' : ''}`} style={themeStyle(theme)} onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <Background theme={theme} disco={disco} />
            {!gameId && <WeatherParticles type={theme.weatherParticles} />}

            <div className={`layout${shake ? ' is-shaking' : ''}${stage ? ` envers-stage-${stage}` : ''}`}>
                <Header
                    theme={theme}
                    weather={weather}
                    isAvent={isAvent}
                    isDecember={advent.isDecember}
                    daysToStart={advent.daysToStart}
                    onHome={onHome}
                    onAvent={onAvent}
                    onLogo={onLogo}
                    onAdventure={isUnlocked(ADVENTURE, advent, now) ? () => openGame(ADVENTURE.id) : null}
                />

                <main className={`main${isAvent ? ' main--avent' : ''}`}>
                    {isAvent
                        ? <AdventCalendar now={now} bests={bests} onPlay={openGame} />
                        : <Countdown group={group} now={now} play={play} onWish={onWish} onCandles={() => openGame(CANDLES.id)} />}
                    <aside className="side">
                        <UpcomingList
                            title={isAvent ? 'Anniversaires' : 'Ensuite'}
                            items={listItems}
                            highlightFirst={isAvent}
                            restLabel={restLabel}
                            play={play}
                            onQuiz={isAvent ? null : () => openGame(QUIZ.id)}
                        />
                        {isAvent
                            ? <GamesTile openCount={advent.openCount} bests={bests} onPlay={openGame} />
                            : <StatTiles tiles={tiles} />}
                    </aside>
                </main>

                <footer className="footer-hint hide-short">
                    <p className="glass">{footerHint(stage, news, enversOpen)}</p>
                </footer>
            </div>

            {stage > 0 && !envers && <Crack stage={stage} />}
            {news && !gameId && !envers && (
                <NewsBanner
                    onClose={() => {
                        dismissAnnounce();
                        setNewsHidden(true);
                    }}
                />
            )}
            {toast && (
                <div className="toast-wrap" role="status">
                    <span className="toast">{toast}</span>
                </div>
            )}
            {confetti > 0 && <Confetti key={confetti} />}
            <Gags gag={gag} people={sorted} />
            {TestPanel && !gameId && !envers && (
                <Suspense fallback={null}>
                    <TestPanel
                        now={now}
                        sorted={sorted}
                        onPlay={setGameId}
                        onEnvers={() => setEnvers(true)}
                        onClearBests={() => {
                            const ids = ALL_GAMES.map((g) => g.id);
                            clearBests(ids);
                            setBests(loadBests(ids));
                            flash('Records effacés.');
                        }}
                    />
                </Suspense>
            )}
            {gameId && (
                <GameModal
                    game={getGame(gameId)}
                    best={bests[gameId]}
                    onScore={onGameScore}
                    onClose={closeGame}
                    gameProps={gameId === CANDLES.id ? { people: isToday ? group : [] } : undefined}
                />
            )}
            {envers && (
                <Suspense fallback={<div className="envers envers--loading" />}>
                    <EnversGame onClose={closeEnvers} />
                </Suspense>
            )}
        </div>
    );
}

function footerHint(stage, news, enversOpen) {
    if (stage === 1) return 'Tu as entendu ? Ça gratte sous la page…';
    if (stage === 2) return 'Encore un petit coup…';
    if (news) return 'Psst : il y a du nouveau tout en bas… insiste un peu.';
    if (enversOpen) return 'Psst : les pingouins ont des secrets. Et il y a quelque chose plus bas…';
    return 'Psst : les pingouins ont des secrets. Et il n’y a rien plus bas… quoique.';
}

export default App;
