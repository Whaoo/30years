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
    // Reduced to 1 to match height
    const nextBirthdays = sortedBirthdays.slice(1, 2);

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

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen p-4 gap-8">

                {/* Left Card: Main Dashboard */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-black/30 backdrop-blur-md rounded-3xl p-6 text-white shadow-2xl w-full max-w-md border border-white/10 flex flex-col justify-between lg:h-[500px]"
                >
                    <div className="flex flex-col items-center justify-center flex-grow">
                        <h2 className="text-xs font-bold tracking-[0.2em] text-white-400 mb-6 uppercase">Prochain Anniversaire</h2>
                        <div className="text-center w-full">
                            <Countdown
                                targetDate={mainBirthday.nextBirthday}
                                name={mainBirthday.name}
                                isMain={true}
                            />
                            {/* Duplicate name removed */}
                        </div>
                    </div>

                    <div className="space-y-6 mt-auto">
                        {/* Upcoming Birthdays List - Hidden on mobile */}
                        <div className="hidden md:block bg-black/20 rounded-2xl p-4 border border-white/5">
                            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">À Venir</h3>
                            <div className="space-y-2">
                                {nextBirthdays.map((birthday, index) => (
                                    <Countdown
                                        key={index}
                                        targetDate={birthday.nextBirthday}
                                        name={birthday.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Weather Widget */}
                        <WeatherWidget />
                    </div>
                </motion.div>

                {/* Right Card: Advent Calendar (Only in December, Hidden on Mobile) */}
                {getCurrentDecemberDay() !== 0 && (
                    <div className="hidden lg:block w-full max-w-md lg:h-[500px]">
                        <AdventCalendar />
                    </div>
                )}
            </div>

            {/* Santa Widget - Always visible at bottom, position based on current day */}
            <SantaWidget currentDay={getCurrentDecemberDay()} />
        </div>
    );
}

export default App;
