import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Countdown from './components/Countdown';
import WeatherWidget from './components/WeatherWidget';
import SantaWidget from './components/SantaWidget';
import { getSortedBirthdays } from './utils/birthdayLogic';

function App() {
    const [sortedBirthdays, setSortedBirthdays] = useState([]);
    // const bgImage = 'https://i.postimg.cc/zvqjtKPQ/1759475418238.png';
    const bgImage = 'https://images.pexels.com/photos/640809/pexels-photo-640809.jpeg?cs=srgb&dl=pexels-eberhardgross-640809.jpg&fm=jpg';

    useEffect(() => {
        const birthdays = getSortedBirthdays();
        setSortedBirthdays(birthdays);

        // Refresh birthdays every minute to keep order correct if day changes
        const interval = setInterval(() => {
            setSortedBirthdays(getSortedBirthdays());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (sortedBirthdays.length === 0) return null;

    const mainBirthday = sortedBirthdays[0];
    // Reduced to 3 to avoid scrollbar on smaller screens
    const nextBirthdays = sortedBirthdays.slice(1, 4);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black font-sans selection:bg-pink-500/30">
            {/* Background Image - Using img tag for better quality control */}
            <img
                src={bgImage}
                alt="Background"
                className="absolute inset-0 z-0 w-full h-full object-cover"
            />

            {/* Dark Overlay - Reduced opacity, removed blur for sharpness */}
            <div className="absolute inset-0 z-0 bg-black/20" />

            {/* Main Content */}
            <div className="relative z-10 flex items-center justify-center h-full p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    // Square aspect ratio on mobile (aspect-square), auto on desktop
                    // Smaller max-width on mobile
                    className="w-full max-w-[320px] md:max-w-4xl aspect-square md:aspect-auto bg-black/30 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
                >
                    {/* Left Side: Main Countdown */}
                    <div className="flex-1 relative overflow-hidden group py-4 md:py-12 px-4 md:px-6 flex flex-col justify-center">
                        {/* Subtle Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-30" />

                        <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
                            <div className="text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-4 md:mb-8">
                                Prochain Anniversaire
                            </div>

                            <Countdown
                                targetDate={mainBirthday.nextBirthday}
                                name={mainBirthday.name}
                                isMain={true}
                            />
                        </div>
                    </div>

                    {/* Right Side: List & Weather */}
                    <div className="md:w-80 bg-black/20 border-t md:border-t-0 md:border-l border-white/5 p-4 md:p-6 flex flex-col justify-between">
                        {/* Upcoming List - Hidden on small screens (Vivaldi tiles) */}
                        <div className="hidden md:block mb-6">
                            <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">
                                À Venir
                            </h3>
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

                        {/* Weather Widget - Always visible */}
                        <div className="w-full">
                            <WeatherWidget />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Santa Widget - Bottom Left */}
            <SantaWidget />


        </div>
    );
}

export default App;
