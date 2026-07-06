import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, LogOut, LogIn, ChevronUp, Sparkles, Share2, Trash2, Activity,
  CircleCheck, AlertCircle, KeyRound
} from 'lucide-react';

type KeyStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface Props {
  user: { displayName?: string | null; email?: string | null } | null;
  isAdmin: boolean;
  keyStatus: KeyStatus;
  hasApiKey: boolean;
  showReset: boolean;
  copiedShare: boolean;
  onSignIn: () => void;
  onLogout: () => void;
  onOpenApiKey: () => void;
  onDemo: () => void;
  onShare: () => void;
  onReset: () => void;
  onQuality: () => void;
}

/**
 * Kompakt konto-/profilmeny nedst i sidebaren. Erstattar den tunge botnblokka:
 * éi rad (avatar + namn + status-prikk) som opnar ein oppover-popover med konto- og
 * verktøy-handlingar. Gjenbruker dropdown-mønsteret frå BrandSelector.
 */
export function AccountMenu({
  user, isAdmin, keyStatus, hasApiKey, showReset, copiedShare,
  onSignIn, onLogout, onOpenApiKey, onDemo, onShare, onReset, onQuality
}: Props) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Logg inn med Google</span>
      </button>
    );
  }

  const statusDot =
    !hasApiKey ? null
    : keyStatus === 'valid' ? 'bg-emerald-500'
    : keyStatus === 'invalid' ? 'bg-red-500'
    : keyStatus === 'checking' ? 'bg-amber-400'
    : 'bg-neutral-300';

  const item = (icon: React.ReactNode, label: React.ReactNode, onClick: () => void, extra = '') => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors ${extra}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white rounded-xl shadow-lg border border-neutral-100 p-1.5"
          >
            {item(
              <KeyRound className="w-4 h-4 text-neutral-400" />,
              <span className="flex items-center gap-2">API-nøkkel
                {hasApiKey && keyStatus === 'valid' && <CircleCheck className="w-3.5 h-3.5 text-emerald-600" />}
                {hasApiKey && keyStatus === 'invalid' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              </span>,
              onOpenApiKey
            )}
            {item(<Sparkles className="w-4 h-4 text-neutral-400" />, 'Sjå eit eksempel', onDemo)}
            {item(
              copiedShare ? <CircleCheck className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-neutral-400" />,
              copiedShare ? 'Lenke kopiert!' : 'Del appen',
              onShare
            )}
            {isAdmin && item(<Activity className="w-4 h-4 text-neutral-400" />, 'Kvalitet & Overvåking', onQuality)}
            {showReset && item(<Trash2 className="w-4 h-4 text-red-500" />, 'Start på nytt', onReset, 'text-red-600 hover:bg-red-50')}
            <div className="my-1 border-t border-neutral-100" />
            {item(<LogOut className="w-4 h-4 text-neutral-400" />, 'Logg ut', onLogout)}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
            {user.displayName?.charAt(0) || <User className="w-4 h-4" />}
          </div>
          {statusDot && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusDot}`} />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-neutral-900 truncate">{user.displayName || 'Brukar'}</p>
          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
        </div>
        <ChevronUp className={`w-4 h-4 text-neutral-400 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
