import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Background({ theme }) {
    const [gradient, animation] = theme.gradient;
    const sceneStyle = theme.image
        ? {}
        : {
              background: gradient,
              backgroundSize: '200% 200%',
              animation: `${animation} 24s ease-in-out infinite`,
          };

    return (
        <div className="absolute inset-0 z-0 overflow-hidden">
            <AnimatePresence>
                <motion.div
                    key={theme.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4 }}
                    className="absolute inset-0"
                >
                    {theme.image ? (
                        <img src={theme.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 transition-all duration-1000" style={sceneStyle} />
                    )}
                    {theme.overlays.map((overlay, index) => (
                        <div
                            key={index}
                            className="absolute inset-0 transition-colors duration-1000"
                            style={{ backgroundColor: overlay }}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
