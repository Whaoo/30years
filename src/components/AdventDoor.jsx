import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AdventDoor({ dayNumber, message, chocolate, isCurrentDay, openDay, setOpenDay }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasBeenOpened, setHasBeenOpened] = useState(false);

    // Load opened state from localStorage
    useEffect(() => {
        const opened = localStorage.getItem(`advent-door-${dayNumber}`);
        if (opened === 'true') {
            setIsOpen(true);
            setHasBeenOpened(true);
        }
    }, [dayNumber]);

    const handleClick = () => {
        if (!isCurrentDay && !hasBeenOpened) return; // Locked

        if (!hasBeenOpened) {
            setIsOpen(true);
            setHasBeenOpened(true);
            localStorage.setItem(`advent-door-${dayNumber}`, 'true');
            // Show tooltip for this door by setting it global 'openDay'
            if (setOpenDay) setOpenDay(dayNumber);
        } else {
            // Toggle tooltip: if it's already open, close it, otherwise open it
            if (setOpenDay) setOpenDay(prev => (prev === dayNumber ? 0 : dayNumber));
        }
    };

    // Determine bulb color/style
    const isLocked = !isCurrentDay && !hasBeenOpened;

    // Bulb Styles
    const bulbGradient = isLocked
        ? 'radial-gradient(circle at 30% 30%, #4a4a4a, #2d2d2d)' // Grey for locked
        : hasBeenOpened
            ? 'radial-gradient(circle at 30% 30%, #10B981, #059669)' // Green for opened
            : 'radial-gradient(circle at 30% 30%, #EF4444, #B91C1C)'; // Red for available

    return (
        <div className="relative flex flex-col items-center justify-center select-none">
            {/* The Bulb */}
            <motion.div
                whileHover={{ scale: isLocked ? 1 : 1.1 }}
                whileTap={{ scale: isLocked ? 1 : 0.95 }}
                onClick={handleClick}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg flex items-center justify-center relative z-10 ${isLocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                style={{
                    background: bulbGradient,
                    boxShadow: isCurrentDay && !hasBeenOpened
                        ? '0 0 15px rgba(239, 68, 68, 0.6), inset 2px 2px 5px rgba(255,255,255,0.3)'
                        : '0 4px 6px rgba(0,0,0,0.3), inset 2px 2px 5px rgba(255,255,255,0.3)'
                }}
            >
                {/* Bulb Cap */}
                <div className="absolute -top-2 w-4 h-3 bg-gray-400 rounded-sm shadow-sm" />

                {/* Content: Number or Icon */}
                <AnimatePresence mode="wait">
                    {!hasBeenOpened ? (
                        <motion.span
                            key="number"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-white font-bold text-xl md:text-2xl drop-shadow-md pt-1"
                        >
                            {dayNumber}
                        </motion.span>
                    ) : (
                        <motion.span
                            key="icon"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="text-3xl md:text-4xl pt-1"
                        >
                            {chocolate}
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Lock Icon for locked days */}
                {isLocked && (
                    <div className="absolute -bottom-1 -right-1 text-[10px]">🔒</div>
                )}
            </motion.div>

            {/* Message Tooltip - driven by the shared openDay prop */}
            <AnimatePresence>
                {openDay === dayNumber && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        className="absolute z-20 w-48 bg-white/95 text-black p-3 rounded-xl shadow-xl text-center pointer-events-none"
                        style={{
                            bottom: '100%',
                            marginBottom: '10px',
                        }}
                    >
                        <div className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">
                            Day {dayNumber}
                        </div>
                        <p className="text-sm leading-tight font-medium">
                            {message}
                        </p>
                        {/* Arrow */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white/95" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default AdventDoor;
