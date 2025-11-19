import React from 'react';
import { motion } from 'framer-motion';

const SantaWidget = () => {
    const today = new Date();
    const isDecember = today.getMonth() === 11; // 11 is December
    const day = today.getDate();

    // Calculate days until Christmas
    const daysUntilChristmas = 25 - day;
    const isChristmas = day === 25;

    return (
        <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1, type: "spring" }}
            className="fixed bottom-4 left-4 z-50 group cursor-pointer"
        >
            <div className="relative">
                {/* Tooltip */}
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 text-xs text-white text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {isDecember ? (
                        isChristmas ? "Joyeux Noël ! 🎄" : `En route vers Noël... J-${daysUntilChristmas} 🎅`
                    ) : (
                        "Le Père Noël se prépare... ❄️"
                    )}
                </div>

                {/* Icon with hover effect */}
                <div className="text-5xl md:text-7xl filter drop-shadow-2xl hover:scale-110 transition-transform duration-300 hover:rotate-12">
                    🦌🛷
                </div>
            </div>
        </motion.div>
    );
};

export default SantaWidget;
