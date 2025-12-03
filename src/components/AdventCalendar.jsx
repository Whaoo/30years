import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdventDoor from './AdventDoor';
import { adventData, getCurrentDecemberDay } from '../utils/adventMessages';

function AdventCalendar() {
    const [currentDay, setCurrentDay] = useState(0);

    // Shared open tooltip state: only one door's tooltip is visible at a time
    const [openDay, setOpenDay] = useState(0);

    useEffect(() => {
        setCurrentDay(getCurrentDecemberDay());
    }, []);

    // If not December (or testing mode not active), don't render
    if (currentDay === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-black/30 backdrop-blur-md rounded-3xl p-6 text-white shadow-2xl w-full h-full border border-white/10 flex flex-col items-center justify-center"
        >
            <h2 className="text-xs font-bold tracking-[0.2em] text-white-400 mb-6 uppercase">
                Calendrier de l'Avent
            </h2>

            {currentDay === 25 ? (
                <div className="flex items-center justify-center w-full h-full">
                    {adventData.filter(d => d.day === 25).map(data => (
                        <AdventDoor
                            key={data.day}
                            dayNumber={data.day}
                            message={data.message}
                            chocolate={data.chocolate}
                            isCurrentDay={true}
                            openDay={openDay}
                            setOpenDay={setOpenDay}
                            size="large"
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-5 gap-4 w-full place-items-center">
                    {adventData.filter(data => data.day !== 25).map((data) => (
                        <AdventDoor
                            key={data.day}
                            dayNumber={data.day}
                            message={data.message}
                            chocolate={data.chocolate}
                            isCurrentDay={data.day <= currentDay}
                            openDay={openDay}
                            setOpenDay={setOpenDay}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export default AdventCalendar;
