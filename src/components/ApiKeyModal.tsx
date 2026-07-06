import { motion } from 'motion/react';
import { X, Loader2, CircleCheck, AlertCircle, KeyRound } from 'lucide-react';

type KeyStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface Props {
  apiKey: string;
  setApiKey: (v: string) => void;
  keyStatus: KeyStatus;
  keyError: string | null;
  onClose: () => void;
}

/** Modal for å legge inn / oppdatere Gemini API-nøkkelen (flytta ut av sidebaren). */
export function ApiKeyModal({ apiKey, setApiKey, keyStatus, keyError, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Gemini API-nøkkel</h3>
              <p className="text-xs text-neutral-500">Lagrast lokalt i nettlesaren din.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors" aria-label="Lukk">
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
          autoFocus
          className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />

        {apiKey.trim() && keyStatus === 'checking' && (
          <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Sjekkar nøkkelen...
          </p>
        )}
        {apiKey.trim() && keyStatus === 'valid' && (
          <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5">
            <CircleCheck className="w-3 h-3" /> Nøkkelen er gyldig og klar til bruk.
          </p>
        )}
        {apiKey.trim() && keyStatus === 'invalid' && (
          <p className="text-xs text-red-600 mt-2 flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {keyError}
          </p>
        )}

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-3 inline-flex items-center gap-1"
        >
          Skaff ein gratis nøkkel her →
        </a>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Ferdig
          </button>
        </div>
      </motion.div>
    </div>
  );
}
