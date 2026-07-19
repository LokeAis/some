import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, AlertCircle, X, Linkedin, Instagram, Facebook } from 'lucide-react';
import { BrandData } from '../lib/db';
import { RepurposeResult, Draft } from '../lib/useRepurpose';
import { RepurposeResults } from './RepurposeResults';
import { fileToDownscaledBase64 } from '../lib/imageUtils';

interface Props {
  apiKey: string;
  selectedBrand: BrandData | null;
  brandVoice?: any;
  onEditFurther?: (draft: Draft, channel: string) => void;
}

const CHANNELS: { name: string; icon: typeof Linkedin }[] = [
  { name: 'LinkedIn', icon: Linkedin },
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Bilde-til-SoMe: last opp eit bilde (+ valfri kommentar) → multimodal analyse
 * + kanaltilpassa utkast. Bildet vert aldri lagra – berre sendt i AI-kallet.
 */
export function ImageToPost({ apiKey, selectedBrand, brandVoice, onEditFurther }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepurposeResult | null>(null);

  const handleFile = async (file?: File) => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vel ei bildefil (jpg, png eller webp).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Bildet er for stort (maks ~5 MB).');
      return;
    }
    try {
      const data = await fileToDownscaledBase64(file);
      setImageData(data);
      setPreview(`data:${data.mimeType};base64,${data.base64}`);
    } catch (e: any) {
      setError(e.message || 'Klarte ikkje å lese bildet.');
    }
  };

  const clearImage = () => {
    setImageData(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generate = async (channel: string) => {
    setError(null);
    if (!apiKey) {
      setError('API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre.');
      return;
    }
    if (!imageData) {
      setError('Last opp eit bilde først.');
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveChannel(channel);
    try {
      const res = await fetch('/api/image-to-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mimeType: imageData.mimeType,
          comment,
          channel,
          brandVoice,
          brandProfile: selectedBrand
        })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || `Feilkode: ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <ImagePlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Bilde til innlegg</h2>
          </div>
          <p className="text-neutral-600 text-sm">
            Last opp eit bilde og la AI-en foreslå ferdige innlegg med emojis og hashtags, tilpassa kanalen.
            Bildet vert berre analysert – det vert ikkje lagra.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {!preview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-neutral-300 rounded-xl p-10 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:border-rose-300 hover:text-rose-600 transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm font-medium">Klikk for å velje eit bilde</span>
              <span className="text-xs">jpg, png eller webp – maks ~5 MB</span>
            </button>
          ) : (
            <div className="relative inline-block">
              <img src={preview} alt="Førehandsvising" className="max-h-64 rounded-xl border border-neutral-200" />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-white border border-neutral-200 rounded-full p-1 shadow-sm hover:bg-neutral-50"
                title="Fjern bilde"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Valfritt: kort kommentar eller stikkord om kva bildet viser (t.d. «ny produktlansering», «teambilde frå messe»)..."
            className="w-full h-20 p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none text-sm"
          />

          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Lag utkast for:</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => generate(name)}
                  disabled={loading || !imageData}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 bg-white text-neutral-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && activeChannel === name
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className="w-4 h-4" />}
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {result && <RepurposeResults result={result} channel={activeChannel} onEditFurther={onEditFurther} />}
    </div>
  );
}
