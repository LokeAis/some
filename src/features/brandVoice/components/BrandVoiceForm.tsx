import React, { useState, useEffect } from 'react';
import { Save, Sparkles, AlertCircle, Check, Plus, Trash2, Loader2, FileText, Link as LinkIcon } from 'lucide-react';
import { BrandVoiceProfile } from '../types';

type ProfileDraft = Omit<BrandVoiceProfile, 'id' | 'createdAt' | 'updatedAt' | 'uid'>;
type ArrayField = 'dos' | 'donts' | 'referenceTexts' | 'values' | 'forbiddenPhrases';

interface BrandVoiceFormProps {
  brandId: string;
  initialProfile: BrandVoiceProfile | null;
  apiKey: string;
  onSave: (profile: ProfileDraft) => Promise<boolean>;
}

const emptyDraft = (brandId: string): ProfileDraft => ({
  brandId,
  summary: '',
  tone: '',
  rhythm: '',
  vocabulary: '',
  ctaStyle: '',
  values: [],
  forbiddenPhrases: [],
  dos: [''],
  donts: [''],
  referenceTexts: ['']
});

export function BrandVoiceForm({ brandId, initialProfile, apiKey, onSave }: BrandVoiceFormProps) {
  const [profile, setProfile] = useState<ProfileDraft>(emptyDraft(brandId));

  // Steg 1 – ekstraher frå tekst eller URL
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [samples, setSamples] = useState(() => localStorage.getItem('draft_brand_voice_samples') || '');
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('draft_brand_voice_samples', samples);
  }, [samples]);

  useEffect(() => {
    if (initialProfile) {
      setProfile({
        ...emptyDraft(brandId),
        ...initialProfile,
        dos: initialProfile.dos?.length ? initialProfile.dos : [''],
        donts: initialProfile.donts?.length ? initialProfile.donts : [''],
        referenceTexts: initialProfile.referenceTexts?.length ? initialProfile.referenceTexts : ['']
      });
      setHasProfile(true);
    } else {
      setProfile(emptyDraft(brandId));
      setHasProfile(false);
    }
  }, [initialProfile, brandId]);

  const handleAnalyze = async () => {
    setError(null);
    if (!apiKey) {
      setError('API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre.');
      return;
    }
    if (inputMode === 'text' && !samples.trim()) {
      setError('Lim inn nokre teksteksempel først.');
      return;
    }
    if (inputMode === 'url' && !url.trim()) {
      setError('Skriv inn ein URL først.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const body = inputMode === 'url' ? { url: url.trim() } : { samples };
      const response = await fetch('/api/analyze-brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }
      const { dna } = await response.json();
      // Map den rike ekstraksjonen inn i profilen (behald manuelle dos/donts/referansetekstar).
      setProfile(prev => ({
        ...prev,
        summary: dna.summary ?? prev.summary,
        tone: dna.tone ?? prev.tone,
        rhythm: dna.rhythm ?? prev.rhythm,
        vocabulary: dna.vocabulary ?? prev.vocabulary,
        ctaStyle: dna.cta_style ?? prev.ctaStyle,
        values: Array.isArray(dna.values) ? dna.values : prev.values,
        forbiddenPhrases: Array.isArray(dna.forbidden_phrases) ? dna.forbidden_phrases : prev.forbiddenPhrases
      }));
      setHasProfile(true);
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod under analysen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setField = (field: keyof ProfileDraft, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const handleArrayChange = (field: ArrayField, index: number, value: string) => {
    const arr = [...(profile[field] || [])];
    arr[index] = value;
    setProfile(prev => ({ ...prev, [field]: arr }));
  };
  const addArrayItem = (field: ArrayField) => {
    if (field === 'referenceTexts' && (profile.referenceTexts?.length || 0) >= 3) return;
    setProfile(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));
  };
  const removeArrayItem = (field: ArrayField, index: number) => {
    const arr = (profile[field] || []).filter((_, i) => i !== index);
    setProfile(prev => ({ ...prev, [field]: arr.length ? arr : [''] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setIsSaved(false);

    const cleaned: ProfileDraft = {
      ...profile,
      dos: (profile.dos || []).filter(s => s.trim() !== ''),
      donts: (profile.donts || []).filter(s => s.trim() !== ''),
      referenceTexts: (profile.referenceTexts || []).filter(s => s.trim() !== ''),
      values: (profile.values || []).filter(s => s.trim() !== ''),
      forbiddenPhrases: (profile.forbiddenPhrases || []).filter(s => s.trim() !== '')
    };

    if (!cleaned.summary.trim()) {
      setError('Du må ha ei kort oppsummering av tonen.');
      setIsSaving(false);
      return;
    }

    try {
      const success = await onSave(cleaned);
      if (success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        setError('Klarte ikkje å lagre Brand Voice.');
      }
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderArrayEditor = (field: ArrayField, label: string, hint: string, placeholder: string) => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="space-y-2">
        {(profile[field]?.length ? profile[field]! : ['']).map((item, index) => (
          <div key={`${field}-${index}`} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => handleArrayChange(field, index, e.target.value)}
              className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              placeholder={placeholder}
            />
            <button onClick={() => removeArrayItem(field, index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => addArrayItem(field)} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 mt-1">
          <Plus className="w-4 h-4" /> Legg til
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Brand Voice DNA</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Lim inn 3–5 av dine beste tekstar, eller hent ein URL. AI-en destillerer eit faktisk
          stemme-fingeravtrykk — tone, rytme, vokabular og forbodne fraser — som styrer alt innhald.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Steg 1 – Ekstraher */}
        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'text' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
            >
              <FileText className="w-4 h-4" /> Lim inn tekst
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'url' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
            >
              <LinkIcon className="w-4 h-4" /> Hent frå URL
            </button>
          </div>

          {inputMode === 'text' ? (
            <textarea
              value={samples}
              onChange={(e) => setSamples(e.target.value)}
              placeholder={"Eksempel 1:\nHei alle saman! I dag har vi lansert...\n\nEksempel 2:\nVisste du at..."}
              className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://dinbedrift.no"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
            >
              {isAnalyzing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyserer stemma...</>)
                : (<><Sparkles className="w-4 h-4" /> {hasProfile ? 'Analyser på nytt' : 'Knekk koden (analyser)'}</>)}
            </button>
          </div>
        </div>

        {/* Steg 2 – Stadfest og rediger den ekstraherte profilen */}
        {hasProfile && (
          <div className="space-y-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 -mb-2">
              Dette er stemma AI-en oppfatta. Juster det som ikkje stemmer, og lagre.
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">Oppsummering av tonen <span className="text-red-500">*</span></label>
              <textarea
                value={profile.summary}
                onChange={(e) => setField('summary', e.target.value)}
                className="w-full h-20 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                placeholder="Kort oppsummering av stemma..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Tone</label>
                <input type="text" value={profile.tone || ''} onChange={(e) => setField('tone', e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="T.d. uformell, varm, fagleg" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Rytme og setningsbygnad</label>
                <input type="text" value={profile.rhythm || ''} onChange={(e) => setField('rhythm', e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="T.d. korte, kontante setningar" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Vokabular og tiltaleform</label>
                <input type="text" value={profile.vocabulary || ''} onChange={(e) => setField('vocabulary', e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder='T.d. brukar "vi", enkelt språk' />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">CTA-stil</label>
                <input type="text" value={profile.ctaStyle || ''} onChange={(e) => setField('ctaStyle', e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="T.d. direkte og oppfordrande" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {renderArrayEditor('values', 'Verdiar som skin gjennom', 'Kva står merkevaren for?', 'T.d. berekraft')}
              {renderArrayEditor('forbiddenPhrases', 'Forbodne ord/fraser', 'Ord AI-en aldri skal bruke.', 'T.d. "vennligst merk"')}
              {renderArrayEditor('dos', 'Slik skriv vi (DOs)', 'Kva kjenneteiknar gode tekstar?', 'T.d. bruk korte setningar')}
              {renderArrayEditor('donts', 'Slik skriv vi IKKJE (DONTs)', 'Stilar AI-en skal unngå.', 'T.d. unngå forkortingar')}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-900">Referansetekstar (maks 3)</label>
              <p className="text-xs text-gray-500">Lim inn 1–3 gode eksempel AI-en kan herme direkte etter.</p>
              <div className="space-y-4">
                {(profile.referenceTexts?.length ? profile.referenceTexts : ['']).map((item, index) => (
                  <div key={`ref-${index}`} className="relative">
                    <textarea
                      value={item}
                      onChange={(e) => handleArrayChange('referenceTexts', index, e.target.value)}
                      className="w-full h-28 p-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                      placeholder={`Referansetekst ${index + 1}...`}
                    />
                    <button onClick={() => removeArrayItem('referenceTexts', index)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(profile.referenceTexts?.length || 0) < 3 && (
                  <button onClick={() => addArrayItem('referenceTexts')} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Legg til referansetekst
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors font-medium ${isSaved ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'}`}
              >
                {isSaved ? (<><Check className="w-4 h-4" /> Lagra!</>) : (<><Save className="w-4 h-4" /> {isSaving ? 'Lagrar...' : 'Lagre Brand Voice'}</>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
