import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Slett',
  cancelText = 'Avbryt',
  isDestructive = true,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDestructive ? 'bg-red-100' : 'bg-indigo-100'}`}>
                  <AlertTriangle className={`w-5 h-5 ${isDestructive ? 'text-red-600' : 'text-indigo-600'}`} />
                </div>
                <button
                  onClick={onCancel}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">{message}</p>
              
              <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors shadow-sm ${
                    isDestructive 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
