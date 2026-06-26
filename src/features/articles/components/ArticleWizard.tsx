import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Wand2, Save, Loader2, List, CheckCircle2, Plus, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { BrandData } from '../../../lib/db';
import { BrandVoiceProfile } from '../../brandVoice/types';
import { saveArticle } from '../services/articleDb';
import { ArticleData } from '../types';
import { ErrorMessage } from '../../../components/ErrorMessage';
import { AITextEditor } from '../../../components/AITextEditor';
import { FidelityScore } from '../../../components/FidelityScore';

interface ArticleWizardProps {
  apiKey: string;
  selectedBrand: BrandData;
  voiceProfile?: BrandVoiceProfile;
  user: any;
  initialArticle?: ArticleData | null;
}

export function ArticleWizard({ apiKey, selectedBrand, voiceProfile, user, initialArticle }: ArticleWizardProps) {
  console.log('ArticleWizard rendered with API key length:', apiKey?.length);
  const [topic, setTopic] = useState(initialArticle?.topic || '');
  const [useSearch, setUseSearch] = useState(false);
  const [modelTier, setModelTier] = useState<'standard' | 'premium'>('standard');
  const [outline, setOutline] = useState(initialArticle?.outline || '');
  const [article, setArticle] = useState(initialArticle?.content || '');
  const [status, setStatus] = useState<'draft' | 'ready' | 'published'>(initialArticle?.status || 'draft');
  const [currentArticleId, setCurrentArticleId] = useState<string | undefined>(initialArticle?.id);

  // Update state if initialArticle changes
  React.useEffect(() => {
    if (initialArticle) {
      setTopic(initialArticle.topic);
      setOutline(initialArticle.outline);
      setArticle(initialArticle.content);
      setStatus(initialArticle.status);
      setCurrentArticleId(initialArticle.id);
    }
  }, [initialArticle]);
  
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerateOutline = async () => {
    if (!topic.trim()) {
      setError('Skriv inn eit tema først.');
      return;
    }
    if (!apiKey) {
      setError('API-nøkkel manglar.');
      return;
    }

    setIsGeneratingOutline(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Sending request to /api/generate-outline with API key length:', apiKey?.length);
      const response = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          topic,
          brandVoice: voiceProfile,
          useSearch,
          modelTier
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Feil ved generering av disposisjon');
      }

      setOutline(data.outline);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateArticle = async () => {
    if (!topic.trim() || !outline.trim()) {
      setError('Tema og disposisjon må vere fylt ut.');
      return;
    }
    if (!apiKey) {
      setError('API-nøkkel manglar.');
      return;
    }

    setIsGeneratingArticle(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Sending request to /api/generate-article with API key length:', apiKey?.length);
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          topic,
          outline,
          brandVoice: voiceProfile,
          useSearch,
          modelTier
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Feil ved generering av artikkel');
      }

      setArticle(data.article);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!topic.trim() || !article.trim()) {
      setError('Tema og artikkel må vere fylt ut før lagring.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const articleId = await saveArticle({
        uid: user.uid,
        brandId: selectedBrand.id!,
        topic,
        outline,
        content: article,
        status: status
      }, currentArticleId);

      if (articleId) {
        setCurrentArticleId(articleId);
        setSuccessMessage('Artikkel lagra!');
      } else {
        throw new Error('Kunne ikkje lagre artikkelen.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewArticle = () => {
    setTopic('');
    setOutline('');
    setArticle('');
    setStatus('draft');
    setCurrentArticleId(undefined);
    setGeneratedImagePrompt(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleGenerateImagePrompt = async () => {
    if (!article.trim()) {
      setError('Du må generere ein artikkel først.');
      return;
    }
    if (!apiKey) {
      setError('API-nøkkel manglar.');
      return;
    }

    setIsGeneratingImagePrompt(true);
    setError(null);
    setGeneratedImagePrompt(null);

    try {
      const response = await fetch('/api/generate-article-image-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          text: article
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Feil ved generering av bildeprompt');
      }

      setGeneratedImagePrompt(data.imagePrompt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  };

  const handleCopyPrompt = () => {
    if (generatedImagePrompt) {
      navigator.clipboard.writeText(generatedImagePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-end">
        <button
          onClick={handleNewArticle}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ny artikkel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Artikkelgenerator
          </h2>
          <p className="text-gray-500 mt-1">
            Lag strukturerte artiklar ved å først definere ein disposisjon.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {error && <ErrorMessage error={error} />}
          {successMessage && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* Steg 1: Tema */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Tema
            </h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Kva skal artikkelen handle om?"
                className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
              />
              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || !topic.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {isGeneratingOutline ? <Loader2 className="w-5 h-5 animate-spin" /> : <List className="w-5 h-5" />}
                Lag disposisjon
              </button>
            </div>
            
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={useSearch}
                    onChange={(e) => setUseSearch(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Bruk nettsøk for oppdaterte kjelder (Google Search Grounding)</span>
                </label>
                <div className="group relative flex items-center">
                  <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs cursor-help">?</div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    Slå på for artiklar om dagsaktuell statistikk, trendar eller tema med rask utvikling. Trengst ikkje for evergreen-artiklar eller enkle forklaringsartiklar.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setModelTier('standard')}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                    modelTier === 'standard' 
                      ? 'border-purple-600 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    🚀 Standard (Flash Lite)
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Rask og rimeleg. Perfekt for enkle artiklar, lister og utkast.
                  </div>
                </button>
                <button
                  onClick={() => setModelTier('premium')}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                    modelTier === 'premium' 
                      ? 'border-purple-600 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    ✨ Premium (Pro)
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Høgaste kvalitet. Perfekt for djupe guidar og "cornerstone"-innhald.
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Steg 2: Disposisjon */}
          {(outline || isGeneratingOutline) && (
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Disposisjon
              </h3>
              <p className="text-sm text-gray-500">
                Rediger disposisjonen før du genererer sjølve artikkelen.
              </p>
              <AITextEditor
                value={outline}
                onChange={setOutline}
                apiKey={apiKey}
                brandVoice={voiceProfile}
                placeholder="Disposisjonen kjem her..."
                className="h-48 font-mono text-sm"
                disabled={isGeneratingOutline}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateArticle}
                  disabled={isGeneratingArticle || !outline.trim() || !topic.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                >
                  {isGeneratingArticle ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  Skriv artikkel
                </button>
              </div>
            </div>
          )}

          {/* Steg 3: Artikkel */}
          {(article || isGeneratingArticle) && (
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                Artikkel
              </h3>
              <p className="text-sm text-gray-500">
                Gå over og rediger artikkelen før du lagrar.
              </p>
              <AITextEditor
                value={article}
                onChange={setArticle}
                apiKey={apiKey}
                brandVoice={voiceProfile}
                placeholder="Artikkelen kjem her..."
                className="h-96 font-mono text-sm"
                disabled={isGeneratingArticle}
              />
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="draft">Kladd</option>
                      <option value="ready">Klar</option>
                      <option value="published">Publisert</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateImagePrompt}
                    disabled={isGeneratingImagePrompt || !article.trim()}
                    className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    {isGeneratingImagePrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Analyser for bildeprompt
                  </button>
                </div>
                <button
                  onClick={handleSaveArticle}
                  disabled={isSaving || !article.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Lagre artikkel
                </button>
              </div>

              {/* Brand voice fidelity (Grep 2) */}
              <FidelityScore content={article} brandVoice={voiceProfile} />

              {generatedImagePrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Generert bildeprompt (AI-analyse)
                    </h4>
                    <button
                      onClick={handleCopyPrompt}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1.5 rounded-md border border-indigo-200 shadow-sm transition-all"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedPrompt ? 'Kopiert!' : 'Kopier prompt'}
                    </button>
                  </div>
                  <p className="text-sm text-indigo-800 font-mono bg-white/50 p-3 rounded-lg border border-indigo-100/50 italic">
                    {generatedImagePrompt}
                  </p>
                  <p className="text-[10px] text-indigo-500 mt-2">
                    Denne prompten er optimalisert for bildegeneratorar som Midjourney, DALL-E eller Stable Diffusion basert på innhaldet i artikkelen din.
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
