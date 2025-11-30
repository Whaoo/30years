import React from 'react';
import { motion } from 'framer-motion';

function SantaTracker({ position, dayNumber }) {
    if (!position || dayNumber === 0) return null;

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
                position: 'absolute',
                ...position,
                width: '80px',
                height: '50px',
                zIndex: 25,
                pointerEvents: 'none'
            }}
        >
            {/* Santa's Sleigh with Reindeer */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Reindeer (leading) */}
                <motion.div
                    className="absolute text-2xl"
                    style={{
                        left: '-20px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                    animate={{
                        y: [0, -3, 0]
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    🦌
                </motion.div>

                {/* Santa in Sleigh */}
                <motion.div
                    className="text-3xl"
                    animate={{
                        y: [0, -5, 0]
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.1
                    }}
                >
                    🛷
                </motion.div>

                {/* Sparkle trail */}
                <motion.div
                    className="absolute text-xl"
                    style={{
                        right: '-15px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                    animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    ✨
                </motion.div>
            </div>

            {/* Day indicator below Santa */}
            <div
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                style={{
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'gold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: '1px solid gold',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
            >
                Day {dayNumber}
            </div>
        </motion.div>
    );
}

export default SantaTracker;
