import React, { useState } from 'react';
import { Recycle, Loader2, AlertCircle, Link as LinkIcon, FileText, Copy, CircleCheck, Lightbulb, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandData } from '../lib/db';

interface Draft {
  angle: string;
  text: string;
  hashtags: string[];
}

interface RepurposeResult {
  analysis: { main_message: string; tone: string; key_points: string[] };
  drafts: Draft[];
}

interface Props {
  apiKey: string;
  selectedBrand: BrandData | null;
  brandVoice?: any;
  /** Send eit utkast vidare til innleggseditoren (arvar fidelity-score, auto-fiks og lagring). */
  onEditFurther?: (draft: Draft, channel: string) => void;
}

const CHANNELS = ['LinkedIn', 'Facebook', 'X/Twitter', 'Instagram'];

/**
 * Gjenbruk: lim inn ei lenke eller tekst → lynanalyse + 2–3 publiseringsklare
 * utkast for vald kanal. Byggjer på /api/repurpose (kanalreglar + brand voice).
 */
export function Repurpose({ apiKey, selectedBrand, brandVoice, onEditFurther }: Props) {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('LinkedIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!apiKey) {
      setError('API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre.');
      return;
    }
    if (inputMode === 'url' && !url.trim()) {
      setError('Lim inn ei lenke først.');
      return;
    }
    if (inputMode === 'text' && !text.trim()) {
      setError('Lim inn teksten du vil gjenbruke.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const body = {
        ...(inputMode === 'url' ? { url: url.trim() } : { text }),
        channel,
        brandVoice,
        brandProfile: selectedBrand
      };
      const response = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }
      setResult(await response.json());
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod.');
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = (draft: Draft, idx: number) => {
    const tags = (draft.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    navigator.clipboard.writeText(tags ? `${draft.text}\n\n${tags}` : draft.text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Recycle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Gjenbruk innhald</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Lim inn ein artikkel, eit innlegg eller eigen tekst — få lynanalyse og 2–3 ferdige utkast
            skreddarsydde for kanalen du vel.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'url' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              <LinkIcon className="w-4 h-4" /> Lim inn lenke
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              <FileText className="w-4 h-4" /> Lim inn tekst
            </button>
          </div>

          {inputMode === 'url' ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ei-nettside.no/artikkel"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Lim inn innhaldet du vil gjenbruke..."
              className="w-full h-36 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyserer og skriv utkast...</>
                : <><Recycle className="w-4 h-4" /> Lag utkast for {channel}</>}
            </button>
          </div>
        </form>
      </div>

      {result && (
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
      )}
    </div>
  );
}
