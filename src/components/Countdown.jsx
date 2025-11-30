import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Countdown = ({ targetDate, name, isMain }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [isToday, setIsToday] = useState(false);

    function calculateTimeLeft() {
        const now = new Date();
        const difference = targetDate - now;

        // Check if it's the same day (Happy Birthday)
        const isSameDay = now.getDate() === targetDate.getDate() &&
            now.getMonth() === targetDate.getMonth();

        if (isSameDay) {
            return { isToday: true };
        }

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, isToday: false };
        }

        const totalSeconds = Math.floor(difference / 1000);
        const days = Math.floor(totalSeconds / (60 * 60 * 24));
        const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

        return { days, hours, minutes, isToday: false };
    }

    useEffect(() => {
        // Initial check
        const initial = calculateTimeLeft();
        setTimeLeft(initial);
        setIsToday(initial.isToday);

        const timer = setInterval(() => {
            const current = calculateTimeLeft();
            setTimeLeft(current);
            setIsToday(current.isToday);
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    // Legacy formatting logic
    const getFormattedTime = () => {
        if (isToday) return "🎉 Happy Birthday!";

        if (timeLeft.days === 0 && timeLeft.hours === 0) {
            return `${timeLeft.minutes}min`;
        } else if (timeLeft.days === 0) {
            return `${timeLeft.hours}h`;
        }
        // Legacy logic added +1 to days, preserving that behavior
        return `${timeLeft.days + 1}j`;
    };

    if (isMain) {
        return (
            <div className="text-center flex flex-col items-center justify-center h-full">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="relative"
                >
                    <div className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-2xl tracking-tighter leading-none ${isToday ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl'}`}>
                        {getFormattedTime()}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3"
                >
                    <div className="text-2xl md:text-4xl font-bold text-white drop-shadow-md bg-white/10 backdrop-blur-md px-8 py-2 rounded-full border border-white/20">
                        {name}
                    </div>
                </motion.div>
            </div>
        );
    }

    // List Item View
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group hover:bg-white/5 px-2 rounded-lg transition-colors"
        >
            <span className="text-base md:text-lg font-medium text-white/80 group-hover:text-white transition-colors">{name}</span>
            <div className="flex items-baseline gap-1">
                <span className={`font-bold text-white ${isToday ? 'text-yellow-400' : 'text-lg md:text-xl'}`}>
                    {getFormattedTime()}
                </span>
            </div>
        </motion.div>
    );
};

export default Countdown;
