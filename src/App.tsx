import { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutDashboard, CalendarDays, PenTool, Sparkles, ChevronRight, LogIn, LogOut, User, Trash2, Share2, CircleCheck, FolderOpen, Menu, X, Target, Building2, TrendingUp, FileText, Activity, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandSelector } from './components/BrandSelector';
import { ConfirmModal } from './components/ConfirmModal';
import { useBrandVoice } from './features/brandVoice/hooks/useBrandVoice';

// Tunge fane-komponentar vert lasta on-demand (kvar fane = eigen chunk) for raskare førstelast.
const SiteAnalysis = lazy(() => import('./components/SiteAnalysis').then(m => ({ default: m.SiteAnalysis })));
const MonthPlan = lazy(() => import('./components/MonthPlan').then(m => ({ default: m.MonthPlan })));
const SinglePost = lazy(() => import('./components/SinglePost').then(m => ({ default: m.SinglePost })));
const MyProjects = lazy(() => import('./components/MyProjects').then(m => ({ default: m.MyProjects })));
const CompetitorAnalysis = lazy(() => import('./components/CompetitorAnalysis').then(m => ({ default: m.CompetitorAnalysis })));
const BrandVoiceForm = lazy(() => import('./features/brandVoice/components/BrandVoiceForm').then(m => ({ default: m.BrandVoiceForm })));
const ArticleWizard = lazy(() => import('./features/articles/components/ArticleWizard').then(m => ({ default: m.ArticleWizard })));
const QualityPanel = lazy(() => import('./features/quality/components/QualityPanel').then(m => ({ default: m.QualityPanel })));
const TrendAnalyzer = lazy(() => import('./components/TrendAnalyzer').then(m => ({ default: m.TrendAnalyzer })));
import { SiteAnalysisData, MonthPlanItem, MonthPlanData, SinglePostData } from './types';
import { useAuth } from './contexts/AuthContext';
import { BrandData, AnalysisData, PlanData, PostData, updateBrand } from './lib/db';
import { ArticleData } from './features/articles/types';

export default function App() {
  const { user, signIn, logOut, isAdmin } = useAuth();
  const [copiedShare, setCopiedShare] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Valider nøkkelen (debounced) så brukaren får svar i det han limer inn –
  // ikkje først når første generering feilar.
  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyStatus('idle');
      setKeyError(null);
      return;
    }
    setKeyStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-key', {
          method: 'POST',
          headers: { 'x-api-key': trimmed }
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.valid) {
          setKeyStatus('valid');
          setKeyError(null);
        } else {
          setKeyStatus('invalid');
          setKeyError(data?.error || 'Nøkkelen ser ikkje ut til å vere gyldig.');
        }
      } catch {
        setKeyStatus('invalid');
        setKeyError('Fekk ikkje kontakt med serveren for å sjekke nøkkelen.');
      }
    }, 800);
    return () => clearTimeout(t);
  }, [apiKey]);

  // Initialize state from localStorage if available
  const [activeTab, setActiveTab] = useState<'analysis' | 'competitor' | 'plan' | 'post' | 'article' | 'projects' | 'voice' | 'trends' | 'quality'>(() => {
    const saved = localStorage.getItem('some_activeTab');
    return (saved as any) || 'analysis';
  });
  
  const [analysisData, setAnalysisData] = useState<SiteAnalysisData | null>(() => {
    const saved = localStorage.getItem('some_analysisData');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse analysisData from localStorage", e);
      return null;
    }
  });
  
  const [selectedPlanItem, setSelectedPlanItem] = useState<MonthPlanItem | null>(() => {
    const saved = localStorage.getItem('some_selectedPlanItem');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPlanItem from localStorage", e);
      return null;
    }
  });

  const [selectedPlan, setSelectedPlan] = useState<MonthPlanData | null>(() => {
    const saved = localStorage.getItem('some_selectedPlan');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPlan from localStorage", e);
      return null;
    }
  });

  const [autoGeneratePlan, setAutoGeneratePlan] = useState(false);

  const [selectedPost, setSelectedPost] = useState<SinglePostData | null>(() => {
    const saved = localStorage.getItem('some_selectedPost');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedPost from localStorage", e);
      return null;
    }
  });

  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(() => {
    const saved = localStorage.getItem('some_selectedArticle');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedArticle from localStorage", e);
      return null;
    }
  });

  const [selectedBrand, setSelectedBrand] = useState<BrandData | null>(() => {
    const saved = localStorage.getItem('some_selectedBrand');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse selectedBrand from localStorage", e);
      return null;
    }
  });

  const { profile: voiceProfile, saveProfile: saveVoiceProfile, loading: voiceProfileLoading } = useBrandVoice(selectedBrand?.id);

  const handleBrandSelect = (brand: BrandData | null) => {
    if (selectedBrand?.id !== brand?.id) {
      setSelectedBrand(brand);
      setAnalysisData(null);
      setSelectedPlanItem(null);
      setSelectedPlan(null);
      setSelectedPost(null);
      setSelectedArticle(null);

      setActiveTab('analysis');
      localStorage.removeItem('some_analysisData');
      localStorage.removeItem('some_selectedPlanItem');
      localStorage.removeItem('some_selectedPlan');
      localStorage.removeItem('some_selectedPost');
      localStorage.removeItem('some_selectedArticle');

      
      // Clear all draft data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('draft_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('some_activeTab', activeTab);
  }, [activeTab]);

  // Kvalitet-fana er berre for admin – flytt andre bort (t.d. om fana låg lagra frå før).
  useEffect(() => {
    if (!isAdmin && activeTab === 'quality') {
      setActiveTab('analysis');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (analysisData) {
      localStorage.setItem('some_analysisData', JSON.stringify(analysisData));
    } else {
      localStorage.removeItem('some_analysisData');
    }
  }, [analysisData]);

  useEffect(() => {
    if (selectedPlanItem) {
      localStorage.setItem('some_selectedPlanItem', JSON.stringify(selectedPlanItem));
    } else {
      localStorage.removeItem('some_selectedPlanItem');
    }
  }, [selectedPlanItem]);

  useEffect(() => {
    if (selectedPlan) {
      localStorage.setItem('some_selectedPlan', JSON.stringify(selectedPlan));
    } else {
      localStorage.removeItem('some_selectedPlan');
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (selectedPost) {
      localStorage.setItem('some_selectedPost', JSON.stringify(selectedPost));
    } else {
      localStorage.removeItem('some_selectedPost');
    }
  }, [selectedPost]);

  useEffect(() => {
    if (selectedArticle) {
      localStorage.setItem('some_selectedArticle', JSON.stringify(selectedArticle));
    } else {
      localStorage.removeItem('some_selectedArticle');
    }
  }, [selectedArticle]);

  useEffect(() => {
    if (selectedBrand) {
      localStorage.setItem('some_selectedBrand', JSON.stringify(selectedBrand));
    } else {
      localStorage.removeItem('some_selectedBrand');
    }
  }, [selectedBrand]);

  const handleUseAnalysisForPlan = () => {
    setActiveTab('plan');
  };

  const handleUsePlanItemForPost = (item: MonthPlanItem) => {
    setSelectedPlanItem(item);
    setSelectedPost(null); // Clear any previously loaded post
    setActiveTab('post');
  };

  const clearSessionData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearSessionData = () => {
    setAnalysisData(null);
    setSelectedPlanItem(null);
    setSelectedPlan(null);
    setSelectedPost(null);
    setSelectedArticle(null);
    setActiveTab('analysis');
    setIsMobileMenuOpen(false);
    localStorage.removeItem('some_analysisData');
    localStorage.removeItem('some_selectedPlanItem');
    localStorage.removeItem('some_selectedPlan');
    localStorage.removeItem('some_selectedPost');
    localStorage.removeItem('some_selectedArticle');
    localStorage.removeItem('some_activeTab');
    
    // Clear all draft data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setShowClearConfirm(false);
  };

  const loadDemoData = () => {
    setAnalysisData({
      company_summary: "FjordKaffe er eit lokalt kaffebrenneri på Vestlandet som brenn spesialkaffe med fokus på berekraft og sporbarheit. Dei tilbyr kaffeabonnement, utstyr og kurs.",
      target_audience: ["Kaffeentusiastar", "Kvalitetsbevisste forbrukarar", "Bedrifter som vil ha god kaffe på kontoret", "Alder 25-55 år"],
      products_services: ["Kaffeabonnement", "Spesialkaffe i lausvekt", "Kaffeutstyr", "Baristakurs for nybyrjarar"],
      tone_of_voice: "Lidenskapeleg, uformell, vestlandsk, jordnær og kunnskapsrik.",
      usp: ["Brent lokalt ved fjorden", "100% sporbare kaffebønner", "Direkte handel med bønder", "Klimanøytral frakt"],
      content_pillars: ["Kaffekunnskap og bryggetips", "Bak kulissane i brenneriet", "Bøndene vi handlar med", "Kundeopplevingar og oppskrifter"],
      cta_suggestions: ["Prøv eit kaffeabonnement", "Sjå utvalet i nettbutikken", "Meld deg på baristakurs", "Les meir om bonden"],
      brand_risks_or_gaps: ["Prisar på abonnement er ikkje tydeleg kommunisert på framsida."],
      golden_nuggets: ["Vi brenner kaffien med utsikt over fjorden", "Kvar bønne kan sporast tilbake til bonden"],
      confidence_notes: "Veldig tydeleg profil, lett å lage innhald for.",
      competitor_analysis: {
        own_summary: "FjordKaffe brenner spesialkaffe med fokus på berekraft og sporbarheit. Dei tilbyr kaffeabonnement og utstyr.",
        competitors: [
          {
            name_or_url: "Kaffebrenneriet.no",
            summary: "Stor kjede som tilbyr eit breitt utval av kaffe, te og bakevarer, med fokus på tilgjengelegheit og kvardagsluksus.",
            positioning: "Den tilgjengelege kvardagskaffien for folk flest.",
            main_topics: ["Nye kaffebønner", "Sesongens drikkar", "Bakevarer", "Gåvetips"]
          }
        ],
        similarities: [
          "Alle snakkar om kvalitet og berekraft."
        ],
        differences: [
          "FjordKaffe har mykje sterkare fokus på sporbarheit heilt ned til bonden."
        ],
        content_gaps: [
          {
            theme: "Bonden si historie og direkte handel",
            description: "Gå i djupna på kven som dyrkar kaffien, korleis dei jobbar, og kva direkte handel betyr for lokalsamfunnet deira.",
            why_it_matters: "Konkurrentane snakkar overordna om berekraft. Ved å vise ansikta til bøndene bygger de mykje sterkare tillit og emosjonell tilknyting.",
            suggested_formats: ["Karusell på Instagram med bilete frå farmen", "Djuptgåande artikkel på nettsida", "Kort video (Reel) som forklarar direkte handel"],
            content_ideas: []
          }
        ]
      }
    });
    setActiveTab('analysis');
    setIsMobileMenuOpen(false);
  };

  const handleLoadAnalysis = (analysis: AnalysisData) => {
    setAnalysisData(analysis as SiteAnalysisData);
    setActiveTab('plan');
  };

  const handleLoadPlan = (plan: PlanData) => {
    setSelectedPlan(plan as MonthPlanData);
    setActiveTab('plan');
  };

  const handleLoadPost = (post: PostData) => {
    setSelectedPost(post as SinglePostData);
    setSelectedPlanItem(null); // Clear plan item to avoid conflicts
    setActiveTab('post');
  };

  const handleLoadArticle = (article: ArticleData) => {
    setSelectedArticle(article);
    setActiveTab('article');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans text-neutral-900">
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Start på nytt"
        message="Er du sikker på at du vil slette all midlertidig data og starte på nytt?"
        onConfirm={confirmClearSessionData}
        onCancel={() => setShowClearConfirm(false)}
      />
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2 text-indigo-600">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold tracking-tight">SoMe-assistenten</span>
        </div>
        <div className="flex items-center gap-2">
          <BrandSelector selectedBrand={selectedBrand} onSelectBrand={handleBrandSelect} />
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Opne meny"
            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 mb-1">
              <Sparkles className="w-6 h-6" />
              <h1 className="text-xl font-bold tracking-tight">SoMe-assistenten</h1>
            </div>
            <p className="text-xs text-neutral-500 mb-4">Din smarte hjelpar for sosiale medium</p>
            <BrandSelector selectedBrand={selectedBrand} onSelectBrand={handleBrandSelect} />
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Lukk meny"
            className="md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="px-4 space-y-1.5 flex-1 mt-4">
          <button
            onClick={() => { setActiveTab('analysis'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'analysis'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'analysis' ? 'text-indigo-100' : 'text-neutral-400'}`} />
            <span>1. Analyse av nettside</span>
          </button>
          <button
            onClick={() => { setActiveTab('competitor'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'competitor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Target className={`w-5 h-5 ${activeTab === 'competitor' ? 'text-indigo-100' : 'text-neutral-400'}`} />
            <span>2. Konkurrentanalyse</span>
          </button>
          <button
            onClick={() => { setActiveTab('plan'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'plan'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <CalendarDays className={`w-5 h-5 ${activeTab === 'plan' ? 'text-indigo-100' : 'text-neutral-400'}`} />
            <span>3. Innhaldsplan</span>
          </button>
          <button
            onClick={() => { setActiveTab('post'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'post'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <PenTool className={`w-5 h-5 ${activeTab === 'post' ? 'text-indigo-100' : 'text-neutral-400'}`} />
            <span>4. Skriv eit innlegg</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('article'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'article'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'article' ? 'text-indigo-100' : 'text-neutral-400'}`} />
            <span>5. Skriv ein artikkel</span>
          </button>
          
          <div className="pt-4 mt-4 border-t border-neutral-100">
            <button
              onClick={() => { setActiveTab('trends'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'trends'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <TrendingUp className={`w-5 h-5 ${activeTab === 'trends' ? 'text-indigo-100' : 'text-neutral-400'}`} />
              <span>Kva skjer i bransjen?</span>
            </button>
          </div>

          <div className="pt-4 mt-4 border-t border-neutral-100">
            <button
              onClick={() => { setActiveTab('voice'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'voice'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${activeTab === 'voice' ? 'text-indigo-100' : 'text-neutral-400'}`} />
              <span>Brand Voice DNA</span>
            </button>
          </div>
          
          <div className="pt-4 mt-4 border-t border-neutral-100">
            <button
              onClick={() => { setActiveTab('projects'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <FolderOpen className={`w-5 h-5 ${activeTab === 'projects' ? 'text-indigo-100' : 'text-neutral-400'}`} />
              <span>Mine prosjekt</span>
            </button>
          </div>

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-neutral-100">
              <button
                onClick={() => { setActiveTab('quality'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'quality'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Activity className={`w-5 h-5 ${activeTab === 'quality' ? 'text-indigo-100' : 'text-neutral-400'}`} />
                <span>Kvalitet & Overvåking</span>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-neutral-100 space-y-2">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                  {user.displayName?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {user.displayName || 'Brukar'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button 
                onClick={logOut}
                className="w-full py-2 px-4 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logg ut</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Logg inn med Google</span>
            </button>
          )}
          {user && (
            <div className="pt-4 mt-4 border-t border-neutral-100">
              <button 
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 flex items-center justify-center font-mono text-xs font-bold">🔑</span>
                  <span>API-nøkkel</span>
                </div>
                <div className="flex items-center space-x-2">
                  {apiKey && keyStatus === 'checking' && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
                  {apiKey && keyStatus === 'valid' && <CircleCheck className="w-4 h-4 text-emerald-600" />}
                  {apiKey && keyStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  <ChevronRight className={`w-4 h-4 transition-transform ${showApiKeyInput ? 'rotate-90' : ''}`} />
                </div>
              </button>
              
              {showApiKeyInput && (
                <div className="mt-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Gemini API-nøkkel
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  <p className="text-[10px] text-neutral-500 mt-2 leading-tight">
                    Lagrast lokalt i nettlesaren din. Brukast til å generere innhald.
                  </p>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={loadDemoData}
            className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sjå eit eksempel</span>
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedShare(true);
              setTimeout(() => setCopiedShare(false), 2000);
            }}
            className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 mt-2"
          >
            {copiedShare ? <CircleCheck className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Lenke kopiert!' : 'Del appen'}</span>
          </button>
          {(analysisData || selectedPlanItem) && (
            <button 
              onClick={clearSessionData}
              className="w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 mt-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Start på nytt</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-neutral-200 px-6 md:px-10 py-6 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {activeTab === 'analysis' && 'Analyse av nettside'}
                {activeTab === 'competitor' && 'Konkurrentanalyse'}
                {activeTab === 'plan' && 'Innhaldsplan'}
                {activeTab === 'post' && 'Skriv eit innlegg'}
                {activeTab === 'article' && 'Skriv ein artikkel'}
                {activeTab === 'trends' && 'Kva skjer i bransjen?'}
                {activeTab === 'voice' && 'Brand Voice DNA'}
                {activeTab === 'quality' && 'Kvalitet & Overvåking'}
              </h1>
              <p className="text-neutral-500 text-sm mt-1">
                {activeTab === 'analysis' && 'Finn ut kven målgruppa er, korleis de bør snakke til dei, og kva som er det viktigaste de tilbyr.'}
                {activeTab === 'competitor' && 'Samanlikn di bedrift med konkurrentar for å finne "content gaps" og unike posisjonar.'}
                {activeTab === 'plan' && 'Lag ein smart og strategisk plan for kva de skal publisere dei neste 30 dagane.'}
                {activeTab === 'post' && 'Skriv engasjerande innlegg som er klare til å publiserast.'}
                {activeTab === 'article' && 'Lag strukturerte artiklar med disposisjon først.'}
                {activeTab === 'trends' && 'Søk etter dagsaktuelle trendar og lag innlegg basert på dei.'}
                {activeTab === 'voice' && 'Analyser skrivestilen din for å la AI-en skrive nøyaktig som deg.'}
                {activeTab === 'quality' && 'Mål AI-prestasjon, spor feil og evaluer utkast.'}
              </p>
            </div>

            {/* Stepper */}
            <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
              <div className={`flex items-center space-x-1.5 ${activeTab === 'analysis' ? 'text-indigo-600' : analysisData ? 'text-emerald-600' : 'text-neutral-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'analysis' ? 'bg-indigo-100' : analysisData ? 'bg-emerald-100' : 'bg-neutral-100'}`}>1</div>
                <span className="hidden lg:inline">Analyse</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300" />
              <div className={`flex items-center space-x-1.5 ${activeTab === 'plan' ? 'text-indigo-600' : 'text-neutral-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'plan' ? 'bg-indigo-100' : 'bg-neutral-100'}`}>2</div>
                <span className="hidden lg:inline">Plan</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300" />
              <div className={`flex items-center space-x-1.5 ${activeTab === 'post' ? 'text-indigo-600' : 'text-neutral-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'post' ? 'bg-indigo-100' : 'bg-neutral-100'}`}>3</div>
                <span className="hidden lg:inline">Innlegg</span>
              </div>
              <div className="w-8 h-px bg-neutral-200"></div>
              <div className={`flex items-center space-x-1.5 ${activeTab === 'article' ? 'text-indigo-600' : 'text-neutral-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'article' ? 'bg-indigo-100' : 'bg-neutral-100'}`}>4</div>
                <span className="hidden lg:inline">Artikkel</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 flex-1">
          <div className="max-w-5xl mx-auto">
          <Suspense fallback={<div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          {/* Velkomst-banneret kan visast samstundes med analyse-fana, så det har eigen AnimatePresence (ikkje mode="wait"). */}
          <AnimatePresence>
          {(!selectedBrand || (activeTab === 'analysis' && !analysisData)) && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-medium mb-6 backdrop-blur-sm border border-white/10">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Din smarte AI-assistent for sosiale medium</span>
                </div>
                
                <h2 className="text-3xl font-bold mb-3">Velkomen til SoMe-assistenten 👋</h2>
                <p className="text-indigo-100 text-lg mb-8">
                  Få ein skreddarsydd innhaldsplan og ferdige innlegg for sosiale medium på under to minutt. 
                  Vår AI-drivne SoMe-assistent analyserer nettsida di, finn målgruppa di, og fungerer som din personlege tekstforfattar.
                </p>
                
                {!user ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Slik kjem du i gang:</span>
                    </h3>
                    <ol className="space-y-4 text-indigo-50">
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">1</div>
                        <div>
                          <strong className="text-white block">Logg inn</strong>
                          <span>Bruk knappen i menyen til venstre for å logge inn med Google-kontoen din.</span>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">2</div>
                        <div>
                          <strong className="text-white block">Hent API-nøkkel</strong>
                          <span>Du treng ein gratis API-nøkkel frå Google for å bruke AI-en. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline underline-offset-2">Hent nøkkelen din her</a>.</span>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">3</div>
                        <div>
                          <strong className="text-white block">Legg inn nøkkelen</strong>
                          <span>Etter innlogging dukkar det opp eit felt for API-nøkkel i menyen til venstre. Lim inn nøkkelen der, og du er klar!</span>
                        </div>
                      </li>
                    </ol>
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <button 
                        onClick={signIn}
                        className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
                      >
                        <LogIn className="w-5 h-5" />
                        <span>Logg inn for å starte</span>
                      </button>
                    </div>
                  </div>
                ) : !apiKey ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-2 flex items-center space-x-2">
                      <span className="text-amber-300">🔑</span>
                      <span>Nesten klar! Manglar API-nøkkel</span>
                    </h3>
                    <p className="text-indigo-100 mb-4">
                      For å generere innhald treng du ein gratis API-nøkkel frå Google. 
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1">Hent nøkkelen din her</a>, 
                      og lim den inn i feltet i menyen til venstre.
                    </p>
                  </div>
                ) : !selectedBrand ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-2 flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-amber-300" />
                      <span>Opprett ein kunde for å starte</span>
                    </h3>
                    <p className="text-indigo-100 mb-4">
                      For å halde orden på analysar og innhald, må du først opprette ein kundeprofil (Brand Profile).
                      Bruk menyen øvst til venstre for å velje eller leggje til ein ny kunde.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button 
                      onClick={() => {
                        const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                        if (input) input.focus();
                      }}
                      className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <span>Start din eigen analyse</span>
                    </button>
                    <button 
                      onClick={loadDemoData}
                      className="px-6 py-3 bg-indigo-500/30 border border-indigo-400/30 text-white font-medium rounded-xl hover:bg-indigo-500/50 transition-colors flex items-center justify-center space-x-2 backdrop-blur-sm"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Prøv med eit eksempel</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm font-medium opacity-80">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</div>
                    <span>Analyser nettside</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</div>
                    <span>Få innhaldsplan</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</div>
                    <span>Generer innlegg</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          {/* Fane-innhaldet: berre éi fane er aktiv om gangen, så mode="wait" gir rein overgang. */}
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' && selectedBrand && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SiteAnalysis 
                  data={analysisData} 
                  onDataUpdate={setAnalysisData} 
                  onGoToPlan={handleUseAnalysisForPlan}
                  onAutoGeneratePlan={() => {
                    setAutoGeneratePlan(true);
                    setActiveTab('plan');
                  }}
                  selectedBrand={selectedBrand}
                />
              </motion.div>
            )}
            {activeTab === 'competitor' && selectedBrand && (
              <motion.div
                key="competitor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CompetitorAnalysis 
                  analysisData={analysisData}
                  onDataUpdate={setAnalysisData}
                  onGoToPlan={() => setActiveTab('plan')}
                  selectedBrand={selectedBrand}
                />
              </motion.div>
            )}
            {activeTab === 'plan' && selectedBrand && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MonthPlan 
                  analysisData={analysisData} 
                  initialPlan={selectedPlan}
                  onSelectPost={handleUsePlanItemForPost} 
                  onGoToAnalysis={() => setActiveTab('analysis')}
                  selectedBrand={selectedBrand}
                  onPlanUpdate={setSelectedPlan}
                  brandVoice={voiceProfile}
                  autoGenerate={autoGeneratePlan}
                  onAutoGenerateComplete={() => setAutoGeneratePlan(false)}
                />
              </motion.div>
            )}
            {activeTab === 'post' && selectedBrand && (
              <motion.div
                key="post"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SinglePost 
                  analysisData={analysisData} 
                  initialPlanItem={selectedPlanItem} 
                  initialPost={selectedPost}
                  onGoToAnalysis={() => setActiveTab('analysis')}
                  onGoToPlan={() => setActiveTab('plan')}
                  selectedBrand={selectedBrand}
                  onPostUpdate={setSelectedPost}
                  brandVoice={voiceProfile}
                />
              </motion.div>
            )}
            {activeTab === 'article' && selectedBrand && user && (
              <motion.div
                key="article"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ArticleWizard
                  apiKey={apiKey}
                  selectedBrand={selectedBrand}
                  voiceProfile={voiceProfile}
                  user={user}
                  initialArticle={selectedArticle}
                />
              </motion.div>
            )}
            {activeTab === 'voice' && selectedBrand && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                {voiceProfileLoading ? (
                  <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                ) : (
                  <BrandVoiceForm
                    brandId={selectedBrand.id!}
                    initialProfile={voiceProfile}
                    apiKey={apiKey}
                    onSave={async (profile) => {
                      const success = await saveVoiceProfile(profile);
                      if (success) {
                        // Optionally update local state if needed
                      }
                      return success;
                    }}
                  />
                )}
              </motion.div>
            )}
            {activeTab === 'trends' && selectedBrand && (
              <motion.div
                key="trends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto"
              >
                <TrendAnalyzer 
                  apiKey={apiKey} 
                  selectedBrand={selectedBrand}
                  brandVoiceDNA={voiceProfile}
                  onPostGenerated={(post, imagePrompt, trendTitle) => {
                    const newPost: SinglePostData = {
                      hook: trendTitle,
                      main_caption: post,
                      hashtag_suggestions: [],
                      image_prompt: imagePrompt,
                      channel: 'LinkedIn',
                      content_type: 'post'
                    };
                    setSelectedPost(newPost);
                    setActiveTab('post');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'projects' && selectedBrand && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MyProjects 
                  onLoadAnalysis={handleLoadAnalysis}
                  onLoadPlan={handleLoadPlan}
                  onLoadPost={handleLoadPost}
                  onLoadArticle={handleLoadArticle}
                  selectedBrand={selectedBrand}
                />
              </motion.div>
            )}
            {activeTab === 'quality' && isAdmin && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <QualityPanel />
              </motion.div>
            )}
          </AnimatePresence>
          </Suspense>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white py-8 px-6 md:px-10 mt-auto pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            <div className="text-sm text-neutral-500">
              © {new Date().getFullYear()} SoMe-assistenten. Alle rettar reservert.
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40 pb-safe">
          <div className="flex justify-around items-center px-2 py-2">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'analysis' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <LayoutDashboard className={`w-6 h-6 mb-1 ${activeTab === 'analysis' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Analyse</span>
            </button>
            <button
              onClick={() => setActiveTab('competitor')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'competitor' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Target className={`w-6 h-6 mb-1 ${activeTab === 'competitor' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Konkurrent</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'plan' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <CalendarDays className={`w-6 h-6 mb-1 ${activeTab === 'plan' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Plan</span>
            </button>
            <button
              onClick={() => setActiveTab('post')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'post' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <PenTool className={`w-6 h-6 mb-1 ${activeTab === 'post' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Innlegg</span>
            </button>
            <button
              onClick={() => setActiveTab('article')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'article' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FileText className={`w-6 h-6 mb-1 ${activeTab === 'article' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Artikkel</span>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'trends' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <TrendingUp className={`w-6 h-6 mb-1 ${activeTab === 'trends' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Trendar</span>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                activeTab === 'projects' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FolderOpen className={`w-6 h-6 mb-1 ${activeTab === 'projects' ? 'fill-indigo-50' : ''}`} />
              <span className="text-[10px] font-medium">Prosjekt</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('quality')}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                  activeTab === 'quality' ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Activity className={`w-6 h-6 mb-1 ${activeTab === 'quality' ? 'fill-indigo-50' : ''}`} />
                <span className="text-[10px] font-medium">Kvalitet</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
