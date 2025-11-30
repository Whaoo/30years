import React from 'react';
import { motion } from 'framer-motion';

function SantaTracker({ position, dayNumber }) {
    if (!position || dayNumber === 0) return null;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
                position: 'absolute',
                ...position,
                width: '100px',
                height: '60px',
                zIndex: 25,
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)' // Center on the coordinate
            }}
        >
            {/* Santa's Sleigh with Reindeer */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Reindeer (leading) */}
                <motion.div
                    className="absolute text-3xl"
                    style={{
                        left: '-30px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                    animate={{
                        y: [0, -5, 0],
                        x: [0, 2, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    🦌
                </motion.div>

                {/* Santa in Sleigh */}
                <motion.div
                    className="text-4xl"
                    animate={{
                        y: [0, -3, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.2
                    }}
                >
                    🛷
                </motion.div>

                {/* Sparkle trail */}
                <motion.div
                    className="absolute text-2xl"
                    style={{
                        right: '-20px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                    animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                >
                    ✨
                </motion.div>
            </div>

            {/* Day indicator below Santa */}
            <div
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                style={{
                    background: 'rgba(220, 38, 38, 0.9)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '1px solid white',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
            >
                Day {dayNumber}
            </div>
        </motion.div>
    );
}

export default SantaTracker;
