import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdventDoor from './AdventDoor';
import SantaTracker from './SantaTracker';
import { adventData, getDoorPosition, getCurrentDecemberDay } from '../utils/adventMessages';

function AdventCalendar() {
    const [currentDay, setCurrentDay] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const cardRef = useRef(null);

    useEffect(() => {
        // Get current day in December (1-24)
        const day = getCurrentDecemberDay();
        setCurrentDay(day);

        // For testing outside December, you can uncomment this:
        // setCurrentDay(1);
    }, []);

    // Don't render if not in December
    if (currentDay === 0) {
        return null;
    }

    // Get Santa's position (same as current day's door)
    const santaPosition = currentDay > 0 ? getDoorPosition(currentDay) : null;

    return (
        <>
            {/* Toggle button */}
            <motion.button
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                onClick={() => setIsVisible(!isVisible)}
                className="fixed top-4 left-4 z-30 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2"
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
                        className="fixed inset-0 z-10 pointer-events-none"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        {/* Wrapper around the card - this is where doors will be positioned */}
                        <div
                            ref={cardRef}
                            className="relative pointer-events-none"
                            style={{
                                // Match the card size from App.jsx
                                width: '100%',
                                maxWidth: '320px',
                                aspectRatio: '1/1',
                            }}
                        >
                            {/* Media query for desktop */}
                            <style>{`
                                @media (min-width: 768px) {
                                    .advent-wrapper {
                                        max-width: 56rem !important;
                                        aspect-ratio: auto !important;
                                    }
                                }
                            `}</style>
                            <div className="advent-wrapper" style={{ width: '100%', height: '100%' }}>
                                {/* Santa Tracker */}
                                {currentDay > 0 && santaPosition && (
                                    <SantaTracker
                                        position={santaPosition}
                                        dayNumber={currentDay}
                                    />
                                )}

                                {/* Advent Doors */}
                                {adventData.map((data) => {
                                    const doorPosition = getDoorPosition(data.day);
                                    const isCurrentDay = data.day === currentDay;
                                    const isSantaHere = data.day === currentDay;

                                    return (
                                        <div key={data.day} className="pointer-events-auto">
                                            <AdventDoor
                                                dayNumber={data.day}
                                                message={data.message}
                                                chocolate={data.chocolate}
                                                isCurrentDay={isCurrentDay}
                                                isSantaHere={isSantaHere}
                                                position={doorPosition}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AdventCalendar;
