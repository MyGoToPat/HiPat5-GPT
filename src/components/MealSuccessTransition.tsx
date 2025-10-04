import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MealSuccessTransitionProps {
  kcal: number;
  items: number;
  onSkip: () => void;
}

export const MealSuccessTransition: React.FC<MealSuccessTransitionProps> = ({
  kcal,
  items,
  onSkip
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress from 0 to 100 over 2 seconds
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-label="Meal successfully logged"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl max-w-sm mx-4 text-center"
        >
          {/* Animated Checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5, times: [0, 0.6, 1] }}
            className="w-16 h-16 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <Check size={32} className="text-white" strokeWidth={3} />
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              Meal Logged!
            </h2>
            <p className="text-gray-300 text-lg">
              {kcal} kcal added to today
            </p>
            {items > 1 && (
              <p className="text-gray-400 text-sm mt-1">
                {items} items tracked
              </p>
            )}
          </motion.div>

          {/* Progress Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-2 mt-6 mb-4"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: progress >= (i + 1) * 20 ? '#10b981' : '#374151'
                }}
                animate={{
                  scale: progress >= (i + 1) * 20 ? [1, 1.3, 1] : 1
                }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.1
                }}
              />
            ))}
          </motion.div>

          {/* Skip Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onSkip}
            className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors mt-2"
          >
            View Dashboard Now →
          </motion.button>

          {/* Screen Reader Announcement */}
          <div className="sr-only" role="alert">
            Meal successfully logged with {kcal} calories. Redirecting to dashboard.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
