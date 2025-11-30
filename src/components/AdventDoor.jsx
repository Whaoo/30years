import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
                width: '60px',
                height: '60px',
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
                        className="absolute w-full h-full rounded-lg shadow-lg"
                        style={{
                            backfaceVisibility: 'hidden',
                            background: hasBeenOpened
                                ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                                : canOpen
                                    ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #DC2626 100%)'
                                    : 'linear-gradient(135deg, #7C2D12 0%, #92400E 100%)',
                            border: isSantaHere ? '3px solid gold' : '2px solid rgba(255,255,255,0.3)',
                            boxShadow: isSantaHere
                                ? '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 6px rgba(0,0,0,0.3)'
                                : '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Day Number */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="font-bold text-white select-none"
                                style={{
                                    fontSize: '24px',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                                }}
                            >
                                {dayNumber}
                            </div>
                        </div>

                        {/* Santa indicator */}
                        {isSantaHere && (
                            <motion.div
                                className="absolute -top-2 -right-2 text-2xl"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                            >
                                🎅
                            </motion.div>
                        )}

                        {/* Lock/Unlock indicator */}
                        <div className="absolute bottom-1 right-1 text-xs opacity-70">
                            {hasBeenOpened ? '✓' : canOpen ? '🔓' : '🔒'}
                        </div>
                    </div>

                    {/* Back of door (open) - Message & Chocolate */}
                    <div
                        className="absolute w-full h-full rounded-lg shadow-lg flex flex-col items-center justify-center p-2"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                            border: '2px solid rgba(217, 119, 6, 0.3)'
                        }}
                    >
                        {/* Chocolate */}
                        <motion.div
                            className="text-3xl mb-1"
                            initial={{ scale: 0 }}
                            animate={{ scale: isOpen ? 1 : 0 }}
                            transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
                        >
                            {chocolate}
                        </motion.div>

                        {/* Message - hidden, shown on hover */}
                        <div className="absolute inset-0 bg-black/90 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                            <p className="text-white text-[8px] text-center leading-tight">
                                {message}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Pulsing effect for current day */}
                {canOpen && (
                    <motion.div
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                            border: '2px solid rgba(255, 215, 0, 0.5)',
                            boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)'
                        }}
                        animate={{
                            opacity: [0.5, 1, 0.5],
                            scale: [1, 1.05, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                )}
            </div>
        </motion.div>
    );
}

export default AdventDoor;
