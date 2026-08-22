import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Countdown from './components/Countdown';
import WeatherWidget from './components/WeatherWidget';
import Background from './components/Background';
import WeatherParticles from './components/WeatherParticles';
import { getSortedBirthdays } from './utils/birthdayLogic';
import { resolveTheme, getWeatherMood } from './utils/theme';
import { useWeather } from './hooks/useWeather';

function App() {
    const [sortedBirthdays, setSortedBirthdays] = useState([]);
    const { weather } = useWeather();

    const theme = useMemo(() => {
        let weatherCode = null;
        if (weather) {
            const hour = new Date().getHours();
            weatherCode = weather.hourlyData.hourly.weathercode[hour];
        }
        return resolveTheme(new Date(), weatherCode);
    }, [weather]);

    useEffect(() => {
        const birthdays = getSortedBirthdays();
        setSortedBirthdays(birthdays);

        const birthdayInterval = setInterval(() => {
            setSortedBirthdays(getSortedBirthdays());
        }, 60000);

        const refreshInterval = setInterval(() => {
            window.location.reload();
        }, 3600000);

        return () => {
            clearInterval(birthdayInterval);
            clearInterval(refreshInterval);
        };
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', theme.accent);
    }, [theme.accent]);

    if (sortedBirthdays.length === 0) return null;

    const mainBirthday = sortedBirthdays[0];
    // Show 2 upcoming birthdays
    const nextBirthdays = sortedBirthdays.slice(1, 3);

    return (
        <div
            className="relative w-screen h-screen overflow-hidden bg-black font-sans selection:bg-pink-500/30"
            style={{ '--accent': theme.accent }}
        >
            <Background theme={theme} />
            <WeatherParticles type={theme.particles} />

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen p-4 gap-6">
                {/* LEFT CARD: Birthdays */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-black/30 backdrop-blur-md rounded-3xl p-6 text-white shadow-2xl w-full max-w-md border border-white/10 flex flex-col lg:h-[420px] overflow-hidden"
                >
                    {/* Main Birthday */}
                    <div className="flex flex-col items-center justify-center flex-grow">
                        <h2 className="text-xs font-bold tracking-[0.2em] text-white/80 mb-4 uppercase">Prochain Anniversaire</h2>
                        <div className="text-center w-full">
                            <Countdown
                                targetDate={mainBirthday.nextBirthday}
                                name={mainBirthday.name}
                                isMain={true}
                            />
                        </div>
                    </div>

                    {/* Upcoming Birthdays - Desktop only (inside left card) */}
                    <div className="hidden lg:block mt-auto bg-black/20 rounded-2xl p-4 border border-white/5 flex-shrink-0">
                        <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">À Venir</h3>
                        <div className="space-y-1">
                            {nextBirthdays.map((birthday, index) => (
                                <Countdown
                                    key={index}
                                    targetDate={birthday.nextBirthday}
                                    name={birthday.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Weather Widget - Mobile/Tablet only (inside left card) */}
                    <div className="lg:hidden mt-6">
                        <WeatherWidget compact={true} />
                    </div>
                </motion.div>

                {/* RIGHT CARD: Extended Weather - Desktop only */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="hidden lg:flex bg-black/30 backdrop-blur-md rounded-3xl p-6 text-white shadow-2xl w-full max-w-sm border border-white/10 flex-col lg:h-[420px]"
                >
                    <WeatherWidget extended={true} />
                </motion.div>
            </div>

            {/* Theme indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute bottom-3 left-3 z-10 rounded-full bg-black/25 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70 border border-white/10"
            >
                {theme.label}
            </motion.div>
        </div>
    );
}

export default App;
