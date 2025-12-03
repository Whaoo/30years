import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AdventDoor({ dayNumber, message, chocolate, isCurrentDay, openDay, setOpenDay, size = 'normal' }) {
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

    // Size classes
    const isLarge = size === 'large';
    const containerClass = isLarge
        ? 'w-64 h-64 rounded-full shadow-2xl'
        : 'w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg';

    const numberClass = isLarge
        ? 'text-6xl md:text-7xl pt-2'
        : 'text-xl md:text-2xl pt-1';

    const iconClass = isLarge
        ? 'text-8xl md:text-9xl pt-2'
        : 'text-3xl md:text-4xl pt-1';

    // Parse URLs in message
    const renderMessageWithLinks = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all relative z-50 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className={`relative flex flex-col items-center justify-center select-none ${isLarge ? 'p-8' : ''}`}>
            {/* The Bulb */}
            <motion.div
                whileHover={{ scale: isLocked ? 1 : 1.05 }}
                whileTap={{ scale: isLocked ? 1 : 0.95 }}
                onClick={handleClick}
                className={`flex items-center justify-center relative z-10 ${isLocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    } ${containerClass}`}
                style={{
                    background: bulbGradient,
                    boxShadow: isCurrentDay && !hasBeenOpened
                        ? '0 0 30px rgba(239, 68, 68, 0.8), inset 4px 4px 10px rgba(255,255,255,0.4)'
                        : '0 10px 15px rgba(0,0,0,0.3), inset 4px 4px 10px rgba(255,255,255,0.3)'
                }}
            >
                {/* Bulb Cap */}
                <div className={`absolute -top-2 bg-gray-400 rounded-sm shadow-sm ${isLarge ? 'w-12 h-8 -top-6' : 'w-4 h-3'}`} />

                {/* Content: Number or Icon */}
                <AnimatePresence mode="wait">
                    {!hasBeenOpened ? (
                        <motion.span
                            key="number"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`text-white font-bold drop-shadow-md ${numberClass}`}
                        >
                            {dayNumber}
                        </motion.span>
                    ) : (
                        <motion.span
                            key="icon"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={iconClass}
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
                        className={`absolute z-20 bg-white/95 text-black p-4 rounded-xl shadow-xl text-center ${isLarge ? 'w-80 text-lg' : 'w-48 text-sm'}`}
                        style={{
                            bottom: '100%',
                            marginBottom: isLarge ? '20px' : '10px',
                        }}
                    >
                        <div className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">
                            Day {dayNumber}
                        </div>
                        <p className="leading-tight font-medium">
                            {renderMessageWithLinks(message)}
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
