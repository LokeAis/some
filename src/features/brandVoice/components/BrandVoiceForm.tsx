import React, { useState, useEffect } from 'react';
import { Save, Sparkles, AlertCircle, Check, Plus, Trash2 } from 'lucide-react';
import { BrandVoiceProfile } from '../types';

interface BrandVoiceFormProps {
  brandId: string;
  initialProfile: BrandVoiceProfile | null;
  onSave: (profile: Omit<BrandVoiceProfile, 'id' | 'createdAt' | 'updatedAt' | 'uid'>) => Promise<boolean>;
}

export function BrandVoiceForm({ brandId, initialProfile, onSave }: BrandVoiceFormProps) {
  const [profile, setProfile] = useState<Omit<BrandVoiceProfile, 'id' | 'createdAt' | 'updatedAt' | 'uid'>>({
    brandId,
    summary: '',
    dos: [''],
    donts: [''],
    referenceTexts: ['']
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile({
        ...initialProfile,
        dos: initialProfile.dos?.length ? initialProfile.dos : [''],
        donts: initialProfile.donts?.length ? initialProfile.donts : [''],
        referenceTexts: initialProfile.referenceTexts?.length ? initialProfile.referenceTexts : ['']
      });
    } else {
      setProfile({
        brandId,
        summary: '',
        dos: [''],
        donts: [''],
        referenceTexts: ['']
      });
    }
  }, [initialProfile, brandId]);

  const handleArrayChange = (field: 'dos' | 'donts' | 'referenceTexts', index: number, value: string) => {
    const newArray = [...profile[field]];
    newArray[index] = value;
    setProfile({ ...profile, [field]: newArray });
  };

  const addArrayItem = (field: 'dos' | 'donts' | 'referenceTexts') => {
    if (field === 'referenceTexts' && profile.referenceTexts.length >= 3) return;
    setProfile({ ...profile, [field]: [...profile[field], ''] });
  };

  const removeArrayItem = (field: 'dos' | 'donts' | 'referenceTexts', index: number) => {
    const newArray = profile[field].filter((_, i) => i !== index);
    if (newArray.length === 0) newArray.push('');
    setProfile({ ...profile, [field]: newArray });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setIsSaved(false);

    // Clean up empty items
    const cleanedProfile = {
      ...profile,
      dos: profile.dos.filter(item => item.trim() !== ''),
      donts: profile.donts.filter(item => item.trim() !== ''),
      referenceTexts: profile.referenceTexts.filter(item => item.trim() !== '')
    };

    if (!cleanedProfile.summary.trim()) {
      setError('Du må skrive ei kort oppsummering av tonen.');
      setIsSaving(false);
      return;
    }

    try {
      const success = await onSave(cleanedProfile);
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
          Definer korleis merkevaren din snakkar. Dette blir brukt av AI-en for å treffe riktig tone i alt innhold.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Kort oppsummering av tonen <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500">F.eks: "Uformell, engasjerande og fagleg sterk, men aldri kjedelig."</p>
          <textarea
            value={profile.summary}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            className="w-full h-24 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            placeholder="Beskriv tonen her..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* DOs */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">Slik skriv vi (DOs)</label>
            <p className="text-xs text-gray-500">Kva kjenneteiknar gode tekstar frå dykk?</p>
            <div className="space-y-2">
              {profile.dos.map((item, index) => (
                <div key={`do-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayChange('dos', index, e.target.value)}
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="F.eks: Bruk korte setningar"
                  />
                  <button 
                    onClick={() => removeArrayItem('dos', index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('dos')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 mt-2"
              >
                <Plus className="w-4 h-4" /> Legg til regel
              </button>
            </div>
          </div>

          {/* DONTs */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">Slik skriv vi IKKJE (DONTs)</label>
            <p className="text-xs text-gray-500">Kva ord eller stilar skal AI-en unngå?</p>
            <div className="space-y-2">
              {profile.donts.map((item, index) => (
                <div key={`dont-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayChange('donts', index, e.target.value)}
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="F.eks: Unngå stammespråk og forkortingar"
                  />
                  <button 
                    onClick={() => removeArrayItem('donts', index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('donts')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 mt-2"
              >
                <Plus className="w-4 h-4" /> Legg til regel
              </button>
            </div>
          </div>
        </div>

        {/* Reference Texts */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-900">Referansetekstar (Maks 3)</label>
          <p className="text-xs text-gray-500">Lim inn 1-3 gode eksempel på tekstar de har skrive før, slik at AI-en kan herme etter stilen.</p>
          <div className="space-y-4">
            {profile.referenceTexts.map((item, index) => (
              <div key={`ref-${index}`} className="relative">
                <textarea
                  value={item}
                  onChange={(e) => handleArrayChange('referenceTexts', index, e.target.value)}
                  className="w-full h-32 p-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                  placeholder={`Referansetekst ${index + 1}...`}
                />
                <button 
                  onClick={() => removeArrayItem('referenceTexts', index)}
                  className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {profile.referenceTexts.length < 3 && (
              <button 
                onClick={() => addArrayItem('referenceTexts')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Legg til referansetekst
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors font-medium ${
              isSaved 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                Lagra!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isSaving ? 'Lagrar...' : 'Lagre Brand Voice'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
