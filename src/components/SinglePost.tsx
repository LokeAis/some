import React, { useState, useEffect, useRef } from 'react';
import { Loader2, PenTool, Hash, Image as ImageIcon, MessageSquare, Copy, CircleCheck, Wand2, Calendar as CalendarIcon, RefreshCw, Save, Download, Instagram, Linkedin, Facebook, Twitter, Heart, Share2, Bookmark, Edit2, Check, Columns, Plus } from 'lucide-react';
import { SiteAnalysisData, MonthPlanItem, SinglePostData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { savePost, updatePost, BrandData } from '../lib/db';
import { HelpTooltip } from './HelpTooltip';
import { ErrorMessage } from './ErrorMessage';
import { AITextEditor } from './AITextEditor';
import { FidelityScore } from './FidelityScore';
import Markdown from 'react-markdown';

interface Props {
  analysisData: SiteAnalysisData | null;
  initialPlanItem: MonthPlanItem | null;
  initialPost?: SinglePostData | null;
  onGoToAnalysis?: () => void;
  onGoToPlan?: () => void;
  selectedBrand: BrandData | null;
  onPostUpdate?: (post: SinglePostData | null) => void;
  brandVoice?: any;
}

export function SinglePost({ analysisData, initialPlanItem, initialPost, onGoToAnalysis, onGoToPlan, selectedBrand, onPostUpdate, brandVoice }: Props) {
  const { user } = useAuth();
  const mockupRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<SinglePostData | null>(() => {
    const saved = localStorage.getItem('draft_post_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [copied, setCopied] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState(() => {
    const saved = localStorage.getItem('draft_editedText');
    return saved || '';
  });
  const [showComparison, setShowComparison] = useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const prevLoading = React.useRef(loading);
  const loadedPostIdRef = React.useRef<string | null>(
    (() => {
      const saved = localStorage.getItem('draft_post_data');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          return p?.id || 'draft';
        } catch (e) {
          return null;
        }
      }
      return null;
    })()
  );

  React.useEffect(() => {
    if (isEditingText && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditingText, editedText]);

  React.useEffect(() => {
    if (prevLoading.current && !loading && post && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    prevLoading.current = loading;
  }, [loading, post]);
  
  const loadingSteps = [
    "Analyserer målgruppe og tone og stil...",
    "Skriv ein fengande start...",
    "Utformar hovudbodskapen...",
    "Finn på bildeidé og visuelt konsept...",
    "Legg til emneknaggar og finpussar..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const [generatingImage, setGeneratingImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('draft_singlePost');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved single post draft", e);
      }
    }
    return {
      contentType: 'post' as 'post' | 'article',
      channel: 'Instagram',
      theme: '',
      goal: 'Engasjement',
      format: 'Bilde',
      angle: '',
      tone: analysisData?.tone_of_voice || 'Engasjerande og uformell',
      cta: 'Kommenter under',
      modification: '',
      visualStyle: 'Ingen spesifikk stil',
      status: 'draft'
    };
  });

  React.useEffect(() => {
    if (analysisData?.tone_of_voice && formData.tone === 'Engasjerande og uformell') {
      setFormData(prev => ({ ...prev, tone: analysisData.tone_of_voice! }));
    }
  }, [analysisData?.tone_of_voice]);

  React.useEffect(() => {
    localStorage.setItem('draft_singlePost', JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    localStorage.setItem('draft_editedText', editedText);
  }, [editedText]);

  React.useEffect(() => {
    if (post) {
      localStorage.setItem('draft_post_data', JSON.stringify(post));
    } else {
      localStorage.removeItem('draft_post_data');
    }
  }, [post]);

  const autoGeneratedPlanItemIdRef = useRef<string | null>(null);

  // Pre-fill form if a plan item was passed
  useEffect(() => {
    if (initialPost) {
      if (loadedPostIdRef.current !== initialPost.id) {
        loadedPostIdRef.current = initialPost.id || 'draft';
        setPost(initialPost);
        if (initialPost.content_type === 'article') {
          setEditedText(`# ${initialPost.article_title}\n\n**URL-slug:** ${initialPost.url_slug}\n**Meta-tittel:** ${initialPost.meta_title}\n**Meta-beskrivelse:** ${initialPost.meta_description}\n\n${initialPost.article_body}`);
        } else {
          setEditedText(`${initialPost.hook}\n\n${initialPost.main_caption}\n\n${(initialPost.hashtag_suggestions || []).map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`);
        }
        setFormData(prev => ({
          ...prev,
          channel: initialPost.channel || prev.channel,
          theme: initialPost.hook || initialPost.article_title || prev.theme, // Roughly map hook to theme
          status: initialPost.status || 'draft'
        }));
      }
    } else if (initialPlanItem) {
      setPost(null);
      setFormData(prev => ({
        ...prev,
        channel: initialPlanItem.channel,
        theme: initialPlanItem.theme,
        goal: initialPlanItem.post_goal,
        format: initialPlanItem.format,
        angle: initialPlanItem.angle,
        cta: initialPlanItem.cta,
        tone: analysisData?.tone_of_voice || prev.tone,
        status: initialPlanItem.status || 'draft'
      }));
      
      // Auto-generate if we haven't already for this plan item
      const planItemId = `${initialPlanItem.day}-${initialPlanItem.theme}`;
      if (autoGeneratedPlanItemIdRef.current !== planItemId && !loading) {
        autoGeneratedPlanItemIdRef.current = planItemId;
        // We need to wait for state to update before generating, so we use a small timeout
        setTimeout(() => {
          const generateBtn = document.getElementById('generate-post-btn');
          if (generateBtn) generateBtn.click();
        }, 100);
      }
    } else if (analysisData) {
      setFormData(prev => ({
        ...prev,
        tone: analysisData.tone_of_voice,
        cta: analysisData.cta_suggestions[0] || prev.cta
      }));
    }
  }, [initialPlanItem, analysisData, initialPost]);

  const handleGenerate = async (e?: React.FormEvent, modification?: string) => {
    if (e) e.preventDefault();
    if (!formData.theme) {
      setError('Tema er påkrevd');
      return;
    }

    setLoading(true);
    setError(null);
    setIsEditingText(false);

    const payload = {
      contentType: formData.contentType,
      channel: formData.channel,
      theme: formData.theme,
      goal: formData.goal,
      format: formData.format,
      angle: formData.angle,
      tone: formData.tone,
      cta: formData.cta,
      visualStyle: formData.visualStyle,
      analysis: analysisData,
      modification: modification || formData.modification,
      brandProfile: selectedBrand,
      brandVoice
    };

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å lage innlegg');
      }
      
      const result = await response.json();
      setPost(result);
      if (result.content_type === 'article') {
        setEditedText(`# ${result.article_title}\n\n**URL-slug:** ${result.url_slug}\n**Meta-tittel:** ${result.meta_title}\n**Meta-beskrivelse:** ${result.meta_description}\n\n${result.article_body}`);
      } else {
        setEditedText(`${result.hook}\n\n${result.main_caption}\n\n${(result.hashtag_suggestions || []).map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`);
      }
      setSaveSuccess(false);
      if (modification) {
        setFormData(prev => ({ ...prev, modification: '' }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !post) return;
    setSaving(true);
    try {
      let hook = post.hook;
      let main_caption = editedText;
      let hashtags = post.hashtag_suggestions;
      let article_title = post.article_title;
      let url_slug = post.url_slug;
      let meta_title = post.meta_title;
      let meta_description = post.meta_description;
      let article_body = post.article_body;

      if (post.content_type === 'article') {
        // Simple parsing for article edits (assuming format hasn't been completely destroyed)
        const lines = editedText.split('\n');
        if (lines[0]?.startsWith('# ')) {
          article_title = lines[0].replace('# ', '').trim();
        }
        
        const slugIndex = lines.findIndex(l => l.startsWith('**URL-slug:**'));
        if (slugIndex !== -1) {
          url_slug = lines[slugIndex].replace('**URL-slug:**', '').trim();
        }
        
        const metaTitleIndex = lines.findIndex(l => l.startsWith('**Meta-tittel:**'));
        if (metaTitleIndex !== -1) {
          meta_title = lines[metaTitleIndex].replace('**Meta-tittel:**', '').trim();
        }
        
        const metaDescIndex = lines.findIndex(l => l.startsWith('**Meta-beskrivelse:**'));
        if (metaDescIndex !== -1) {
          meta_description = lines[metaDescIndex].replace('**Meta-beskrivelse:**', '').trim();
          article_body = lines.slice(metaDescIndex + 1).join('\n').trim();
        } else {
          article_body = editedText; // Fallback if meta is removed
        }
      } else {
        // Parse edited text back into parts for saving
        const parts = editedText.split('\n\n');
        if (parts.length >= 3) {
          hook = parts[0];
          // Assume the last part is hashtags if it starts with #
          if (parts[parts.length - 1].trim().startsWith('#')) {
            hashtags = parts[parts.length - 1].split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace('#', ''));
            main_caption = parts.slice(1, -1).join('\n\n');
          } else {
            main_caption = parts.slice(1).join('\n\n');
          }
        } else if (parts.length === 2) {
          hook = parts[0];
          main_caption = parts[1];
        }
      }
      
      const postDataToSave: any = {
        content_type: post.content_type || 'post',
        channel: formData.channel,
        hook: hook,
        main_caption: main_caption,
        short_version: post.short_version,
        hashtag_suggestions: hashtags,
        image_prompt: post.image_prompt,
        imageUrl: post.imageUrl,
        alternative_variant: post.alternative_variant,
        article_title: article_title,
        url_slug: url_slug,
        meta_title: meta_title,
        meta_description: meta_description,
        article_body: article_body,
        status: formData.status || 'draft'
      };

      // Remove undefined fields to prevent Firestore errors
      Object.keys(postDataToSave).forEach(key => {
        if (postDataToSave[key] === undefined) {
          delete postDataToSave[key];
        }
      });

      if (initialPost?.id) {
        await updatePost(user.uid, selectedBrand.id!, initialPost.id, postDataToSave);
        if (onPostUpdate) {
          loadedPostIdRef.current = initialPost.id;
          onPostUpdate({ ...initialPost, ...postDataToSave });
        }
      } else {
        const newId = await savePost(user.uid, selectedBrand.id!, postDataToSave);
        if (onPostUpdate) {
          loadedPostIdRef.current = newId;
          onPostUpdate({ id: newId, ...postDataToSave });
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving post:", err);
      setError("Klarte ikkje å lagre innlegget.");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPromptToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleExportImage = async () => {
    if (!mockupRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(mockupRef.current, { cacheBust: true, quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `some-innlegg-${formData.channel.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Kunne ikkje eksportere bilde', err);
      setError('Kunne ikkje eksportere bilde. Prøv igjen.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportHtml = () => {
    if (!post || post.content_type !== 'article') return;
    
    const htmlContent = `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.meta_title || post.article_title || 'Artikkel'}</title>
    <meta name="description" content="${post.meta_description || ''}">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
        .content { font-size: 1.1rem; }
        .content p { margin-bottom: 1.5rem; }
        .content h2 { margin-top: 2rem; margin-bottom: 1rem; }
        .image-prompt { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-top: 3rem; font-size: 0.9rem; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 2rem; }
    </style>
</head>
<body>
    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Artikkelbilde" />` : ''}
    <h1>${post.article_title || 'Utan tittel'}</h1>
    <div class="meta">
        <p><strong>URL Slug:</strong> /${post.url_slug || ''}</p>
        <p><strong>Meta-tittel:</strong> ${post.meta_title || ''}</p>
        <p><strong>Meta-skildring:</strong> ${post.meta_description || ''}</p>
    </div>
    <div class="content">
        ${post.article_body ? post.article_body.split('\n\n').map(p => {
          if (p.startsWith('# ')) return `<h1>${p.replace('# ', '')}</h1>`;
          if (p.startsWith('## ')) return `<h2>${p.replace('## ', '')}</h2>`;
          if (p.startsWith('### ')) return `<h3>${p.replace('### ', '')}</h3>`;
          return `<p>${p}</p>`;
        }).join('\n') : ''}
    </div>
    <div class="image-prompt">
        <strong>Bildeidé:</strong> ${post.image_prompt || ''}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${post.url_slug || 'artikkel'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateImage = async () => {
    if (!post || !post.image_prompt) return;
    setGeneratingImage(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ prompt: post.image_prompt })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Klarte ikkje å generere bilde');
      }
      
      const result = await response.json();
      setPost(prev => prev ? { ...prev, imageUrl: result.imageUrl } : null);
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : 'Ein ukjend feil oppstod ved bildegenerering');
    } finally {
      setGeneratingImage(false);
    }
  };

  const renderChannelIcon = () => {
    switch (formData.channel) {
      case 'Instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'LinkedIn': return <Linkedin className="w-4 h-4 text-blue-700" />;
      case 'Facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'X/Twitter': return <Twitter className="w-4 h-4 text-sky-500" />;
      default: return <Hash className="w-4 h-4 text-neutral-500" />;
    }
  };

  const renderMockupContent = (text: string, isOriginal: boolean) => {
    if (post?.content_type === 'article') {
      return (
        <div className="bg-white p-8">
          <div className="relative group">
            {!isOriginal && isEditingText ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full min-h-[30rem] p-4 text-base text-neutral-900 bg-neutral-50 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none overflow-hidden font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsEditingText(false)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Ferdig</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="markdown-body">
                  <Markdown>{text}</Markdown>
                </div>
                {!isOriginal && (
                  <button
                    onClick={() => setIsEditingText(true)}
                    className="absolute top-0 right-0 p-1.5 bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-500 hover:text-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Rediger tekst"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
    <div className="bg-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            DB
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <p className="text-sm font-bold text-neutral-900">Din Bedrift</p>
              {renderChannelIcon()}
            </div>
            <p className="text-xs text-neutral-500">Sponsa • {formData.channel}</p>
          </div>
        </div>
        <div className="text-neutral-400">•••</div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3 relative group">
        {!isOriginal && isEditingText ? (
          <div className="space-y-2">
            <AITextEditor
              value={editedText}
              onChange={setEditedText}
              apiKey={localStorage.getItem('gemini_api_key') || ''}
              brandVoice={brandVoice}
              className="min-h-[12rem] text-sm text-neutral-900 bg-neutral-50 border-indigo-300"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditingText(false)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Ferdig</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p className="text-sm text-neutral-900 whitespace-pre-wrap">
              {text}
            </p>
            {!isOriginal && (
              <button
                onClick={() => setIsEditingText(true)}
                className="absolute top-0 right-0 p-1.5 bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-500 hover:text-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Rediger tekst"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Placeholder */}
      <div className="w-full aspect-square bg-neutral-100 relative flex flex-col items-center justify-center p-6 text-center border-y border-neutral-100 overflow-hidden">
        {post?.imageUrl ? (
          <img src={post.imageUrl} alt="Generert bilde" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <ImageIcon className="w-12 h-12 text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-500">Foreslått bilde:</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">{post?.image_prompt}</p>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
              <button
                onClick={handleGenerateImage}
                disabled={generatingImage}
                className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-50 hover:text-indigo-600 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Genererer bilde...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generer bilde med AI</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => post?.image_prompt && copyPromptToClipboard(post.image_prompt)}
                className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-50 hover:text-emerald-600 transition-colors flex items-center space-x-2 shadow-sm"
              >
                {copiedPrompt ? (
                  <>
                    <CircleCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kopier prompt</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center space-x-4">
          <button className="text-neutral-500 hover:text-red-500 transition-colors">
            <Heart className="w-6 h-6" />
          </button>
          <button className="text-neutral-500 hover:text-indigo-500 transition-colors">
            <MessageSquare className="w-6 h-6" />
          </button>
          <button className="text-neutral-500 hover:text-indigo-500 transition-colors">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        <button className="text-neutral-500 hover:text-indigo-500 transition-colors">
          <Bookmark className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
  };

  const originalText = post ? (post.content_type === 'article' ? `# ${post.article_title}\n\n**Meta-tittel:** ${post.meta_title}\n**Meta-beskrivelse:** ${post.meta_description}\n\n${post.article_body}` : `${post.hook}\n\n${post.main_caption}\n\n${(post.hashtag_suggestions || []).map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`) : '';
  const hasEdited = post && editedText !== originalText;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-neutral-900">Innstillinger</h3>
              {post && (
                <button
                  type="button"
                  onClick={() => {
                    setPost(null);
                    setEditedText('');
                    setFormData({
                      contentType: 'post',
                      channel: 'Instagram',
                      theme: '',
                      goal: 'Engasjement',
                      format: 'Bilde',
                      angle: 'Inspirerande',
                      tone: 'Engasjerande og uformell',
                      cta: 'Del tankane dine i kommentarfeltet!',
                      visualStyle: 'Fotorealistisk',
                      modification: ''
                    });
                    if (onPostUpdate) {
                      onPostUpdate(null); // Clear selected post in parent
                    }
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nytt innlegg</span>
                </button>
              )}
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              
              {!analysisData && !initialPlanItem && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="bg-amber-100 p-1.5 rounded-full flex-shrink-0">
                      <Wand2 className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900">Starta frå blanke ark?</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        Du har verken ei nettsideanalyse eller eit planlagt innlegg å ta utgangspunkt i. 
                        Fyll inn felta manuelt, eller gå tilbake til steg 1 for å få AI-en til å lære om bedrifta di først.
                      </p>
                    </div>
                  </div>
                  {onGoToAnalysis && (
                    <button
                      type="button"
                      onClick={onGoToAnalysis}
                      className="whitespace-nowrap px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Gå til Analyse
                    </button>
                  )}
                </div>
              )}

              {initialPlanItem && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start space-x-3 mb-6">
                  <CalendarIcon className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-indigo-900">Basert på plan: {initialPlanItem.day}</h4>
                    <p className="text-xs text-indigo-700 mt-1">Format: {initialPlanItem.format}</p>
                  </div>
                </div>
              )}

              <div className="flex bg-neutral-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contentType: 'post' })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    formData.contentType === 'post'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Sosiale Medier
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contentType: 'article' })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    formData.contentType === 'article'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Artikkel
                </button>
              </div>

              <div className="space-y-1.5 mb-6">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.status || 'draft'}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="draft">Kladd</option>
                  <option value="ready">Klar til publisering</option>
                  <option value="published">Publisert</option>
                </select>
              </div>

              {formData.contentType === 'post' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700 flex items-center">
                    Kanal
                    <HelpTooltip content="Vel kva for kanal innlegget skal publiserast på. AI-en tilpassar lengde, hashtags og format etter kva som fungerer best på akkurat denne plattforma." />
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    value={formData.channel}
                    onChange={e => setFormData({...formData, channel: e.target.value})}
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="TikTok">TikTok</option>
                    <option value="X/Twitter">X/Twitter</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Tema for {formData.contentType === 'post' ? 'innlegget' : 'artikkelen'}
                  <HelpTooltip content={`Kva handlar ${formData.contentType === 'post' ? 'dette innlegget' : 'denne artikkelen'} om? Ver spesifikk. I staden for 'Sko', skriv 'Nye joggesko for hausten med vanntett membran'.`} />
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Kva handlar ${formData.contentType === 'post' ? 'innlegget' : 'artikkelen'} om?`}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.theme}
                  onChange={e => setFormData({...formData, theme: e.target.value})}
                />
                <p className="text-xs text-neutral-500">Kort beskriving av kva {formData.contentType === 'post' ? 'innlegget' : 'artikkelen'} skal handle om.</p>
              </div>

              {formData.contentType === 'post' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700 flex items-center">
                    Format
                    <HelpTooltip content="Kva slags innhald er dette? T.d. 'Karusell med 5 bilde', 'Kort video/Reel', 'Enkeltbilde' eller 'Tekstinnlegg'." />
                  </label>
                  <input
                    type="text"
                    placeholder="T.d. Bilde, Karusell, Video, Reel"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    value={formData.format}
                    onChange={e => setFormData({...formData, format: e.target.value})}
                  />
                  <p className="text-xs text-neutral-500">Kva type innhald er dette?</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Mål for innlegget
                  <HelpTooltip content="Kva vil du at brukaren skal gjere etter å ha lese dette? T.d. 'Klikke på lenke i bio', 'Lagre innlegget', 'Kjøpe produktet' eller 'Kommentere si meining'." />
                </label>
                <input
                  type="text"
                  placeholder="T.d. Skape debatt, informere, selje"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                />
                <p className="text-xs text-neutral-500">Kva vil de at brukaren skal gjere eller føle?</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Vinkel / Tilnærming
                  <HelpTooltip content="Korleis skal bodskapen formidlast? T.d. 'Personleg historie', '3 konkrete tips', 'Myteknusing', eller 'Før/etter-historie'." />
                </label>
                <input
                  type="text"
                  placeholder="T.d. Personleg historie, 3 tips, myteknusing"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.angle}
                  onChange={e => setFormData({...formData, angle: e.target.value})}
                />
                <p className="text-xs text-neutral-500">Korleis skal bodskapen vinklast for å fange merksemd?</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Tone og stil
                  <HelpTooltip content="Korleis skal de høyrast ut? T.d. 'Entusiastisk og uformell', 'Fagleg og trygg', eller 'Provoserande og direkte'." />
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.tone}
                  onChange={e => setFormData({...formData, tone: e.target.value})}
                />
                <p className="text-xs text-neutral-500">Kva stemme skal innlegget ha?</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Visuell stil
                  <HelpTooltip content="Kva slags visuelt uttrykk ønskjer du på bildet? Dette hjelper AI-en med å generere ein meir presis bildeidé." />
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.visualStyle}
                  onChange={e => setFormData({...formData, visualStyle: e.target.value})}
                >
                  <option value="Ingen spesifikk stil">Ingen spesifikk stil (AI-en velger)</option>
                  <option value="Minimalistisk">Minimalistisk</option>
                  <option value="Retro/Vintage">Retro/Vintage</option>
                  <option value="Moderne grafisk">Moderne grafisk</option>
                  <option value="Fotorealistisk">Fotorealistisk</option>
                  <option value="Illustrasjon">Illustrasjon</option>
                  <option value="Pop-art">Pop-art</option>
                  <option value="Bedriftsk/Corporate">Bedriftsk/Corporate</option>
                  <option value="Leken og fargerik">Leken og fargerik</option>
                </select>
                <p className="text-xs text-neutral-500">Styrer utsjånaden på bildeidéen.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700 flex items-center">
                  Call to Action (CTA)
                  <HelpTooltip content="Den konkrete oppfordringa til slutt. T.d. 'Les meir på nettsida vår', 'Kva meiner du? Kommenter under!', eller 'Tag ein ven som treng dette'." />
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  value={formData.cta}
                  onChange={e => setFormData({...formData, cta: e.target.value})}
                />
                <p className="text-xs text-neutral-500">Kva er den konkrete handlinga de ber om på slutten?</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  id="generate-post-btn"
                  disabled={loading || !formData.theme || !selectedBrand}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Genererer innlegg...</span>
                    </>
                  ) : (
                    <>
                      {post ? <RefreshCw className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
                      <span>{post ? `Lag nytt innlegg for ${selectedBrand ? selectedBrand.name : 'kunde'}` : `Lag innlegg for ${selectedBrand ? selectedBrand.name : 'kunde'}`}</span>
                    </>
                  )}
                </button>
              </div>
              {!selectedBrand && (
                <p className="text-sm text-amber-600 mt-2">Du må velge en kunde øverst på siden før du kan generere et innlegg.</p>
              )}
              
              <ErrorMessage error={error} />
            </form>
          </div>
        </div>

        {/* Result Column */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden relative"
            >
              {/* Header Skeleton */}
              <div className="p-4 flex items-center justify-between border-b border-neutral-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-neutral-100 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
              {/* Content Skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-4 w-full bg-neutral-100 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-neutral-100 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-neutral-100 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-neutral-100 rounded animate-pulse mt-4"></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-4 w-16 bg-blue-50 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-blue-50 rounded animate-pulse"></div>
                  <div className="h-4 w-14 bg-blue-50 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Image Skeleton */}
              <div className="w-full aspect-square bg-neutral-100 animate-pulse flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-neutral-200" />
              </div>
              {/* Action Bar Skeleton */}
              <div className="p-4 flex justify-between border-t border-neutral-100">
                <div className="flex space-x-4">
                  <div className="w-6 h-6 rounded-full bg-neutral-200 animate-pulse"></div>
                  <div className="w-6 h-6 rounded-full bg-neutral-200 animate-pulse"></div>
                  <div className="w-6 h-6 rounded-full bg-neutral-200 animate-pulse"></div>
                </div>
                <div className="w-6 h-6 rounded-full bg-neutral-200 animate-pulse"></div>
              </div>
              {/* Loading Text Overlay */}
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-indigo-50 text-indigo-600 p-4 rounded-full">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  {loadingSteps[loadingStep]}
                </h3>
                <p className="text-neutral-500 mb-6">Dette tek vanlegvis 10-15 sekund...</p>
                
                {/* Progress indicators */}
                <div className="flex space-x-2">
                  {loadingSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === loadingStep ? 'w-8 bg-indigo-600' : 
                        i < loadingStep ? 'w-4 bg-indigo-300' : 'w-4 bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : post ? (
            <motion.div 
              key="post"
              ref={resultRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Main Post Card - Social Media Mockup */}
              <div className="flex flex-col items-center space-y-4">
                {hasEdited && (
                  <div className="flex justify-end w-full max-w-lg xl:max-w-none">
                    <button 
                      onClick={() => setShowComparison(!showComparison)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                    >
                      <Columns className="w-4 h-4" />
                      <span>{showComparison ? 'Skjul original' : 'Samanlikn med original'}</span>
                    </button>
                  </div>
                )}
                
                <div className={`w-full grid ${showComparison ? 'grid-cols-1 xl:grid-cols-2 gap-8' : 'grid-cols-1'} justify-items-center`}>
                  {showComparison && (
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden relative opacity-75 grayscale-[20%]">
                      <div className="absolute top-0 inset-x-0 bg-neutral-800 text-white text-xs font-bold text-center py-1 z-10">
                        ORIGINAL AI-VERSJON
                      </div>
                      <div className="pt-6">
                        {renderMockupContent(originalText, true)}
                      </div>
                    </div>
                  )}

                  <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden relative">
                    {showComparison && (
                      <div className="absolute top-0 inset-x-0 bg-indigo-600 text-white text-xs font-bold text-center py-1 z-10">
                        DIN REDIGERTE VERSJON
                      </div>
                    )}
                    
                    {/* The actual mockup we export */}
                    <div ref={mockupRef} className={showComparison ? "pt-6" : ""}>
                      {renderMockupContent(editedText, false)}
                    </div>
                    
                    {/* Actions */}
                    <div className="p-4 bg-neutral-50 flex flex-col sm:flex-row gap-3 border-t border-neutral-200">
                      <button
                        onClick={() => copyToClipboard(editedText)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                          copied 
                            ? 'bg-emerald-500 text-white shadow-emerald-200' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                      >
                        {copied ? (
                          <>
                            <CircleCheck className="w-4 h-4" />
                            <span>Kopiert til utklippstavla!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Kopier tekst</span>
                          </>
                        )}
                      </button>
                      {post.content_type !== 'article' && (
                        <button
                          onClick={handleExportImage}
                          disabled={exporting}
                          className={`sm:w-auto px-6 py-3 border border-neutral-200 font-medium rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow-sm bg-white text-neutral-700 hover:bg-neutral-50`}
                        >
                          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          <span className="hidden sm:inline">Last ned bilde</span>
                        </button>
                      )}
                      {post.content_type === 'article' && (
                        <button
                          onClick={handleExportHtml}
                          className={`sm:w-auto px-6 py-3 border border-neutral-200 font-medium rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow-sm bg-white text-neutral-700 hover:bg-neutral-50`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Last ned HTML</span>
                        </button>
                      )}
                      {user && (
                        <button
                          onClick={handleSave}
                          disabled={saving || saveSuccess}
                          className={`sm:w-auto px-6 py-3 border font-medium rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow-sm ${
                            saveSuccess 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : saveSuccess ? (
                            <CircleCheck className="w-4 h-4" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>{saveSuccess ? 'Lagra!' : 'Lagre'}</span>
                        </button>
                      )}
                    </div>

                    {/* Brand voice fidelity (Grep 2): on-demand stemme-treff-score */}
                    <div className="px-4 pb-4">
                      <FidelityScore content={editedText} brandVoice={brandVoice} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Trigger */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-indigo-900">Fornøgd med resultatet?</h4>
                  <p className="text-sm text-indigo-700">Del SoMe-assistenten med teamet ditt så dei også kan spare tid.</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                >
                  {copiedLink ? 'Kopiert!' : 'Kopier lenke'}
                </button>
              </div>

              {/* Extra Ideas Card - Only for posts */}
              {post.content_type !== 'article' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 space-y-3 flex flex-col">
                    <div className="flex items-center space-x-2 text-emerald-600 mb-1">
                      <div className="bg-emerald-50 p-1.5 rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-neutral-900">Kort versjon</h4>
                    </div>
                    <p className="text-neutral-600 text-sm italic flex-grow">"{post.short_version}"</p>
                    <button 
                      onClick={() => copyToClipboard(post.short_version)}
                      className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 w-fit"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Kopier kort versjon</span>
                    </button>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 space-y-3 flex flex-col">
                    <div className="flex items-center space-x-2 text-amber-600 mb-1">
                      <div className="bg-amber-50 p-1.5 rounded-lg">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-neutral-900">Bildeidé</h4>
                    </div>
                    <p className="text-neutral-600 text-sm flex-grow">{post.image_prompt}</p>
                    <button 
                      onClick={() => post?.image_prompt && copyPromptToClipboard(post.image_prompt)}
                      className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center space-x-1 w-fit"
                    >
                      {copiedPrompt ? (
                        <>
                          <CircleCheck className="w-3 h-3" />
                          <span>Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopier bilde-prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 space-y-3 md:col-span-2 flex flex-col">
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                      <div className="bg-indigo-50 p-1.5 rounded-lg">
                        <Wand2 className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-sm text-neutral-900">Alternativ vinkel</h4>
                    </div>
                    <p className="text-neutral-600 text-sm flex-grow">{post.alternative_variant}</p>
                  </div>
                </div>
              )}

              {/* Refinement Actions */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
                <div className="flex items-center space-x-2 text-neutral-900 mb-4">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-semibold text-sm">Tilpass og gjer endringar</h4>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleGenerate(undefined, "Gjer teksten kortare og meir konsis")}
                    disabled={loading}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-100 transition-all disabled:opacity-50"
                  >
                    Kortare
                  </button>
                  <button
                    onClick={() => handleGenerate(undefined, "Gjer teksten meir salgsretta og overtydande")}
                    disabled={loading}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-100 transition-all disabled:opacity-50"
                  >
                    Meir selskapsretta
                  </button>
                  <button
                    onClick={() => handleGenerate(undefined, "Gjer teksten meir vennleg, varm og imøtekomande")}
                    disabled={loading}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-100 transition-all disabled:opacity-50"
                  >
                    Meir vennleg
                  </button>
                  <button
                    onClick={() => handleGenerate(undefined, "Lag ein heilt ny variant med same tema")}
                    disabled={loading}
                    className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-100 transition-all disabled:opacity-50"
                  >
                    Ny variant
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-neutral-100 flex space-x-3">
                  <input
                    type="text"
                    placeholder="Eller skriv di eiga tilpassing (t.d. 'legg til ein vits')"
                    className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    value={formData.modification}
                    onChange={e => setFormData({...formData, modification: e.target.value})}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && formData.modification) {
                        e.preventDefault();
                        handleGenerate(undefined, formData.modification);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleGenerate(undefined, formData.modification)}
                    disabled={loading || !formData.modification}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50 text-sm"
                  >
                    Bruk
                  </button>
                </div>
              </div>
              
              {onGoToPlan && (
                <div className="flex justify-center pt-8 pb-4">
                  <button
                    onClick={onGoToPlan}
                    className="px-8 py-4 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-all flex items-center space-x-3 shadow-sm hover:shadow-md transform hover:-translate-y-1"
                  >
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    <span>Tilbake til innhaldsplanen</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-400 bg-white rounded-2xl border border-neutral-200 border-dashed p-8 text-center"
            >
              <PenTool className="w-12 h-12 mb-4 text-neutral-300" />
              <p className="text-lg font-medium text-neutral-600">Ingen innlegg laga enno</p>
              <p className="text-sm mt-2 max-w-sm">Fyll ut skjemaet til venstre for å lage eit skreddarsydd innlegg for sosiale medium.</p>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
