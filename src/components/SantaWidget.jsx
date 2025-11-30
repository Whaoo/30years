import React from 'react';
import { motion } from 'framer-motion';

const SantaWidget = ({ currentDay = 0 }) => {
    const today = new Date();
    const isDecember = today.getMonth() === 11; // 11 is December
    const day = today.getDate();

    // Calculate days until Christmas
    const daysUntilChristmas = 25 - day;
    const isChristmas = day === 25;

    // Calculate position based on current day (1-25)
    // Day 1: right side (90%)
    // Day 25: left side (10%)
    // Linear interpolation
    const calculatePosition = () => {
        if (currentDay === 0) return '50%'; // Default center if not December
        const progress = (currentDay - 1) / 24; // 0 to 1
        const leftPosition = 90 - (progress * 80); // 90% to 10%
        return `${leftPosition}%`;
    };

    const position = calculatePosition();

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{
                y: 0,
                opacity: 1,
                left: position
            }}
            transition={{
                delay: 1,
                type: "spring",
                left: { duration: 0.8, ease: "easeInOut" }
            }}
            className="fixed bottom-4 -translate-x-1/2 z-50 group cursor-pointer"
            style={{ left: position }}
        >
            <div className="relative">
                {/* Sparkle stars */}
                <motion.div
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 0.5
                    }}
                    className="absolute -top-6 -right-2 text-2xl"
                >
                    ✨
                </motion.div>

                <motion.div
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                        rotate: [0, -180, -360]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                        delay: 0.7
                    }}
                    className="absolute -top-4 -left-4 text-xl"
                >
                    ⭐
                </motion.div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 text-xs text-white text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {isDecember ? (
                        isChristmas ? "Joyeux Noël ! 🎄" : `En route vers Noël... J-${daysUntilChristmas} 🎅`
                    ) : (
                        "La tournée est lancée ! 🎁❄️"
                    )}
                </div>

                {/* Icon with hover effect */}
                <div className="text-5xl md:text-7xl filter drop-shadow-2xl hover:scale-110 transition-transform duration-300 hover:rotate-12 select-none">
                    🛷
                </div>
            </div>
        </motion.div>
    );
};

export default SantaWidget;
