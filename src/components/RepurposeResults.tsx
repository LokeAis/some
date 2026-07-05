import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, CircleCheck, Lightbulb, PenTool } from 'lucide-react';
import { Draft, RepurposeResult } from '../lib/useRepurpose';

interface Props {
  result: RepurposeResult;
  channel: string;
  onEditFurther?: (draft: Draft, channel: string) => void;
}

/**
 * Presentasjon av eit /api/repurpose-svar: lynanalyse + 2–3 utkast med
 * kopier/rediger-vidare. Delt mellom «Gjenbruk innhald» og artikkelgeneratoren.
 */
export function RepurposeResults({ result, channel, onEditFurther }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyDraft = (draft: Draft, idx: number) => {
    const tags = (draft.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    navigator.clipboard.writeText(tags ? `${draft.text}\n\n${tags}` : draft.text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Lynanalyse */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-amber-50 p-1.5 rounded-lg"><Lightbulb className="w-4 h-4 text-amber-600" /></div>
          <h3 className="font-semibold text-sm text-gray-900">Lynanalyse</h3>
        </div>
        <p className="text-sm text-gray-800"><span className="font-medium">Hovudbodskap:</span> {result.analysis.main_message}</p>
        <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-gray-800">Tonefall:</span> {result.analysis.tone}</p>
        {result.analysis.key_points?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.analysis.key_points.map((p, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-amber-500">•</span>{p}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Utkast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {result.drafts.map((draft, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
            <span className="inline-flex self-start px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 mb-3">
              {draft.angle}
            </span>
            <p className="text-sm text-gray-800 whitespace-pre-wrap flex-grow">{draft.text}</p>
            {draft.hashtags?.length > 0 && (
              <p className="text-xs text-emerald-600 mt-3">
                {draft.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => copyDraft(draft, idx)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copiedIdx === idx
                  ? <><CircleCheck className="w-3.5 h-3.5 text-emerald-600" /> Kopiert!</>
                  : <><Copy className="w-3.5 h-3.5" /> Kopier</>}
              </button>
              {onEditFurther && (
                <button
                  onClick={() => onEditFurther(draft, channel)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" /> Rediger vidare
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
