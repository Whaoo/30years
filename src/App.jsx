import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Countdown from './components/Countdown';
import WeatherWidget from './components/WeatherWidget';
import SantaWidget from './components/SantaWidget';
import AdventCalendar from './components/AdventCalendar';
import { getSortedBirthdays } from './utils/birthdayLogic';
import { getCurrentDecemberDay } from './utils/adventMessages';
import winterBackground from './assets/winter-background.png';

function App() {
    const [sortedBirthdays, setSortedBirthdays] = useState([]);
    const bgImage = winterBackground;

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

    if (sortedBirthdays.length === 0) return null;

    const mainBirthday = sortedBirthdays[0];
    const nextBirthdays = sortedBirthdays.slice(1, 4);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black font-sans selection:bg-pink-500/30">
            {/* Background Image */}
            <img
                src={bgImage}
                alt="Background"
                className="absolute inset-0 z-0 w-full h-full object-cover"
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 z-0 bg-black/10" />

            {/* Main Content Container - Flex for Side-by-Side Layout */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen p-4 gap-8">

                {/* Left Card: Main Dashboard */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-black/30 backdrop-blur-md rounded-3xl p-8 text-white shadow-2xl w-full max-w-md border border-white/10"
                >
                    <div className="flex flex-col items-center mb-8">
                        <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-2 uppercase">Prochain Anniversaire</h2>
                        <div className="text-center">
                            <div className="mb-2">
                                <Countdown
                                    targetDate={mainBirthday.nextBirthday}
                                    name={mainBirthday.name}
                                    isMain={true}
                                />
                            </div>
                            <div className="text-3xl font-bold bg-white/20 px-6 py-2 rounded-full backdrop-blur-sm inline-block">
                                {mainBirthday.name}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Upcoming Birthdays List */}
                        <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">À Venir</h3>
                            <div className="space-y-4">
                                {nextBirthdays.map((birthday, index) => (
                                    <div key={index} className="flex justify-between items-center border-b border-white/10 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium text-lg">{birthday.name}</span>
                                        <Countdown
                                            targetDate={birthday.nextBirthday}
                                            name={birthday.name}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weather Widget */}
                        <WeatherWidget />
                    </div>
                </motion.div>

                {/* Right Card: Advent Calendar (Only in December) */}
                {getCurrentDecemberDay() !== 0 && (
                    <div className="w-full max-w-md">
                        <AdventCalendar />
                    </div>
                )}
            </div>

            {/* Santa Widget - Always visible at bottom left */}
            <SantaWidget />
        </div>
    );
}

export default App;
