import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpTooltipProps {
  content: string;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center ml-1.5"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-indigo-500 cursor-help transition-colors" />
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-64 p-3 mt-2 text-xs leading-relaxed text-white bg-neutral-800 rounded-lg shadow-xl -left-2 top-full"
          >
            <div className="absolute w-2 h-2 bg-neutral-800 rotate-45 -top-1 left-3"></div>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
