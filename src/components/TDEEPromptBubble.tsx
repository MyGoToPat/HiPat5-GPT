import React from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';

interface TDEEPromptBubbleProps {
  onClick: () => void;
}

export const TDEEPromptBubble: React.FC<TDEEPromptBubbleProps> = ({ onClick }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full max-w-sm mx-auto mb-4 px-6 py-4 bg-gradient-to-r from-red-600 to-red-500 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow"
      role="button"
      aria-label="Calculate your macros to get started"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Calculator size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-bold text-lg">Let's Calculate Your Macros</p>
          <p className="text-white/90 text-sm">Tap here to get personalized nutrition goals</p>
        </div>
      </div>
    </motion.button>
  );
};
