import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdventDoor from './AdventDoor';
import SantaTracker from './SantaTracker';
import { adventData, getDoorPosition, getSantaTrailPosition, getCurrentDecemberDay } from '../utils/adventMessages';
import adventHouseBg from '../assets/advent-house.png';
import santaTrailBg from '../assets/santa-trail.png';

function AdventCalendar() {
    const [currentDay, setCurrentDay] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Get current day in December (1-24)
        const day = getCurrentDecemberDay();
        setCurrentDay(day);
    }, []);

    // Don't render if not in December
    if (currentDay === 0) {
        return null;
    }

    // Get Santa's position on the trail (Left Side)
    const santaPosition = currentDay > 0 ? getSantaTrailPosition(currentDay) : null;

    return (
        <>
            {/* Toggle button */}
            <motion.button
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                onClick={() => setIsVisible(!isVisible)}
                className="fixed top-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2"
                style={{
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}
            >
                <span>{isVisible ? '🎄 Hide' : '🎄 Show'} Calendar</span>
            </motion.button>

            {/* Advent Calendar Container */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 pointer-events-none flex"
                    >
                        {/* Left Side: Santa Trail */}
                        <div className="w-1/2 h-full relative flex items-center justify-center">
                            {/* Trail Background */}
                            <div
                                className="absolute inset-0 opacity-80"
                                style={{
                                    backgroundImage: `url(${santaTrailBg})`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
                                }}
                            />

                            {/* Santa Tracker on Trail */}
                            {currentDay > 0 && santaPosition && (
                                <div className="absolute inset-0 w-full h-full">
                                    <SantaTracker
                                        position={santaPosition}
                                        dayNumber={currentDay}
                                    />
                                </div>
                            )}

                            {/* Trail End Marker (25) */}
                            <div
                                className="absolute text-red-600 font-bold text-6xl font-serif"
                                style={{
                                    bottom: '10%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    textShadow: '0 0 10px white, 0 0 20px white'
                                }}
                            >
                                25
                            </div>
                        </div>

                        {/* Right Side: Advent House */}
                        <div className="w-1/2 h-full relative flex items-center justify-center pointer-events-auto">
                            <div
                                className="relative w-full max-w-xl aspect-[4/5]"
                                style={{
                                    backgroundImage: `url(${adventHouseBg})`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            >
                                {/* Grid Container for Doors */}
                                {/* Positioned to fit within the "house" image - adjusted based on typical generation */}
                                <div className="absolute inset-0 w-full h-full">
                                    {adventData.map((data) => {
                                        const doorPosition = getDoorPosition(data.day);
                                        const isCurrentDay = data.day === currentDay;
                                        // Santa is on the left trail, not on the door anymore
                                        const isSantaHere = false;

                                        return (
                                            <AdventDoor
                                                key={data.day}
                                                dayNumber={data.day}
                                                message={data.message}
                                                chocolate={data.chocolate}
                                                isCurrentDay={isCurrentDay}
                                                isSantaHere={isSantaHere}
                                                position={doorPosition}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AdventCalendar;
