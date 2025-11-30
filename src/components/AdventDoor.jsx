import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import giftBoxImage from '../assets/gift-box.png';

function AdventDoor({ dayNumber, message, chocolate, isCurrentDay, isSantaHere, position, onOpen }) {
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
        if (!isCurrentDay || hasBeenOpened) return;

        setIsOpen(true);
        setHasBeenOpened(true);
        localStorage.setItem(`advent-door-${dayNumber}`, 'true');
        if (onOpen) onOpen(dayNumber);
    };

    const canOpen = isCurrentDay && !hasBeenOpened;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: dayNumber * 0.05, duration: 0.3 }}
            style={{
                position: 'absolute',
                ...position,
                width: '40px', // Smaller size for grid
                height: '40px',
                zIndex: 20
            }}
        >
            <div
                onClick={handleClick}
                className={`relative w-full h-full cursor-pointer transition-all duration-300 ${canOpen ? 'hover:scale-110' : ''
                    }`}
                style={{ perspective: '1000px' }}
            >
                {/* Door Container */}
                <motion.div
                    className="relative w-full h-full"
                    animate={{ rotateY: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front of door (closed) */}
                    <div
                        className="absolute w-full h-full rounded-md shadow-sm flex items-center justify-center"
                        style={{
                            backfaceVisibility: 'hidden',
                            background: hasBeenOpened
                                ? 'rgba(0,0,0,0.5)'
                                : canOpen
                                    ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                                    : 'rgba(124, 45, 18, 0.8)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            boxShadow: canOpen ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none'
                        }}
                    >
                        {/* Day Number */}
                        <div className="font-bold text-white text-sm shadow-black drop-shadow-md">
                            {dayNumber}
                        </div>

                        {/* Lock/Unlock indicator */}
                        {!hasBeenOpened && (
                            <div className="absolute bottom-0 right-0 text-[8px] opacity-70 p-0.5">
                                {canOpen ? '🔓' : '🔒'}
                            </div>
                        )}
                    </div>

                    {/* Back of door (open) - Gift Box */}
                    <div
                        className="absolute w-full h-full rounded-md shadow-sm flex items-center justify-center"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'rgba(255,255,255,0.9)'
                        }}
                    >
                        <motion.img
                            src={giftBoxImage}
                            alt="Gift"
                            className="w-3/4 h-3/4 object-contain"
                            initial={{ scale: 0 }}
                            animate={{ scale: isOpen ? 1 : 0 }}
                            transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
                        />
                    </div>
                </motion.div>

                {/* Message Popup on Hover (when opened) */}
                {isOpen && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-32 bg-white/95 text-black text-[10px] p-2 rounded shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300 z-50 pointer-events-none">
                        <p className="text-center font-bold mb-1">Day {dayNumber}</p>
                        <p className="text-center leading-tight">{message}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default AdventDoor;
