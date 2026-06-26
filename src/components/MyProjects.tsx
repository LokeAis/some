import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses, getUserPlans, getUserPosts, deleteAnalysis, deletePlan, deletePost, AnalysisData, PlanData, PostData, BrandData } from '../lib/db';
import { getArticlesByBrand, deleteArticle } from '../features/articles/services/articleDb';
import { ArticleData } from '../features/articles/types';
import { FolderOpen, CalendarDays, PenTool, LayoutDashboard, Clock, ExternalLink, LogIn, ArrowRight, Trash2, Download, FileText } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onLoadAnalysis?: (analysis: AnalysisData) => void;
  onLoadPlan?: (plan: PlanData) => void;
  onLoadPost?: (post: PostData) => void;
  onLoadArticle?: (article: ArticleData) => void;
  selectedBrand: BrandData | null;
}

export function MyProjects({ onLoadAnalysis, onLoadPlan, onLoadPost, onLoadArticle, selectedBrand }: Props) {
  const { user, signIn } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'analyses' | 'plans' | 'posts' | 'articles'>('analyses');
  
  const [deleteItem, setDeleteItem] = useState<{ id: string, type: 'analysis' | 'plan' | 'post' | 'article' } | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user || !selectedBrand) {
        setLoading(false);
        setAnalyses([]);
        setPlans([]);
        setPosts([]);
        return;
      }
      
      setLoading(true);
      try {
        const [fetchedAnalyses, fetchedPlans, fetchedPosts, fetchedArticles] = await Promise.all([
          getUserAnalyses(user.uid, selectedBrand.id!),
          getUserPlans(user.uid, selectedBrand.id!),
          getUserPosts(user.uid, selectedBrand.id!),
          getArticlesByBrand(selectedBrand.id!)
        ]);
        
        setAnalyses(fetchedAnalyses || []);
        setPlans(fetchedPlans || []);
        setPosts(fetchedPosts || []);
        setArticles(fetchedArticles || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, selectedBrand]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Ukjent dato';
    try {
      // Handle Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('no-NO', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Ugyldig dato';
    }
  };

  const handleDeleteAnalysis = (id: string | undefined) => {
    if (id) setDeleteItem({ id, type: 'analysis' });
  };

  const handleDeletePlan = (id: string | undefined) => {
    if (id) setDeleteItem({ id, type: 'plan' });
  };

  const handleDeletePost = (id: string | undefined) => {
    if (id) setDeleteItem({ id, type: 'post' });
  };

  const handleDeleteArticle = (id: string | undefined) => {
    if (id) setDeleteItem({ id, type: 'article' });
  };

  const exportPostsToCSV = () => {
    if (!posts || posts.length === 0) return;
    
    const headers = ['Dato', 'Overskrift', 'Brødtekst', 'Emojier', 'Hashtags'];
    
    const csvContent = [
      headers.join(','),
      ...posts.map(post => {
        const date = formatDate(post.createdAt);
        const headline = post.hook || post.article_title || '';
        const body = post.main_caption || post.article_body || '';
        
        // Extract emojis from body text
        const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
        const emojis = (body.match(emojiRegex) || []).join('');
        
        const hashtags = (post.hashtag_suggestions || []).join(' ');
        
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
        
        return [
          escapeCSV(date),
          escapeCSV(headline),
          escapeCSV(body),
          escapeCSV(emojis),
          escapeCSV(hashtags)
        ].join(',');
      })
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'innlegg_eksport.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = async () => {
    if (!deleteItem || !user || !selectedBrand) return;
    
    try {
      if (deleteItem.type === 'analysis') {
        await deleteAnalysis(user.uid, selectedBrand.id!, deleteItem.id);
        setAnalyses(analyses.filter(a => a.id !== deleteItem.id));
      } else if (deleteItem.type === 'plan') {
        await deletePlan(user.uid, selectedBrand.id!, deleteItem.id);
        setPlans(plans.filter(p => p.id !== deleteItem.id));
      } else if (deleteItem.type === 'post') {
        await deletePost(user.uid, selectedBrand.id!, deleteItem.id);
        setPosts(posts.filter(p => p.id !== deleteItem.id));
      } else if (deleteItem.type === 'article') {
        await deleteArticle(deleteItem.id);
        setArticles(articles.filter(a => a.id !== deleteItem.id));
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setDeleteItem(null);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-neutral-50/50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Mine prosjekt</h2>
          <p className="text-neutral-600 mb-6">
            Logg inn for å sjå tidlegare analysar, innhaldsplanar og innlegg du har laga.
          </p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span>Logg inn med Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 p-6 md:p-10">
      <ConfirmModal
        isOpen={!!deleteItem}
        title={`Slett ${deleteItem?.type === 'analysis' ? 'analyse' : deleteItem?.type === 'plan' ? 'innhaldsplan' : deleteItem?.type === 'post' ? 'innlegg' : 'artikkel'}`}
        message={`Er du sikker på at du vil slette ${deleteItem?.type === 'analysis' ? 'denne analysen' : deleteItem?.type === 'plan' ? 'denne innhaldsplanen' : deleteItem?.type === 'post' ? 'dette innlegget' : 'denne artikkelen'}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-indigo-600" />
            Mine prosjekt
          </h1>
          <p className="text-neutral-600 mt-2">
            Her finn du historikken over alt du har generert med SoMe-assistenten.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex space-x-2 bg-white p-1.5 rounded-xl border border-neutral-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveView('analyses')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'analyses' 
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Analysar ({analyses.length})</span>
            </button>
            <button
              onClick={() => setActiveView('plans')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'plans' 
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Innhaldsplanar ({plans.length})</span>
            </button>
            <button
              onClick={() => setActiveView('posts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'posts' 
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Innlegg ({posts.length})</span>
            </button>
            <button
              onClick={() => setActiveView('articles')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'articles' 
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Artiklar ({articles.length})</span>
            </button>
          </div>
          
          {activeView === 'posts' && posts.length > 0 && (
            <button
              onClick={exportPostsToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Eksporter til CSV</span>
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-5 w-32 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-5 w-24 bg-neutral-100 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-neutral-100 rounded animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-neutral-100 rounded animate-pulse"></div>
                  <div className="h-4 w-4/6 bg-neutral-100 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-neutral-100">
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-neutral-100 rounded animate-pulse"></div>
                    <div className="h-6 w-16 bg-neutral-100 rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-24 bg-indigo-50 rounded-lg animate-pulse"></div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeView === 'analyses' && (
              analyses.length === 0 ? (
                <EmptyState title="Ingen analysar enno" icon={<LayoutDashboard className="w-8 h-8 text-neutral-400" />} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-neutral-900 truncate pr-4">
                          {analysis.url ? new URL(analysis.url).hostname : 'Manuell tekst'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center text-xs text-neutral-500 whitespace-nowrap bg-neutral-100 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(analysis.createdAt)}
                          </span>
                          <button 
                            onClick={() => handleDeleteAnalysis(analysis.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                        {analysis.company_summary}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-auto pt-4">
                        {analysis.target_audience?.slice(0, 2).map((aud, i) => (
                          <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md truncate max-w-[150px]">
                            {aud}
                          </span>
                        ))}
                        {onLoadAnalysis && (
                          <button 
                            onClick={() => onLoadAnalysis(analysis)}
                            className="ml-auto flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Bruk denne</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeView === 'plans' && (
              plans.length === 0 ? (
                <EmptyState title="Ingen innhaldsplanar enno" icon={<CalendarDays className="w-8 h-8 text-neutral-400" />} />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-neutral-900">
                          Innhaldsplan ({plan.posts?.length || 0} postar)
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center text-xs text-neutral-500 whitespace-nowrap bg-neutral-100 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(plan.createdAt)}
                          </span>
                          <button 
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 mb-4">
                        {plan.plan_summary}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {Array.from(new Set(plan.posts?.map(p => p.channel))).map((channel, i) => (
                            <span key={i} className="text-xs font-medium bg-neutral-100 text-neutral-700 px-2 py-1 rounded-md">
                              {channel as string}
                            </span>
                          ))}
                        </div>
                        {onLoadPlan && (
                          <button 
                            onClick={() => onLoadPlan(plan)}
                            className="flex-shrink-0 flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Bruk denne</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeView === 'posts' && (
              posts.length === 0 ? (
                <EmptyState title="Ingen innlegg enno" icon={<PenTool className="w-8 h-8 text-neutral-400" />} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                          {post.channel}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center text-xs text-neutral-500 whitespace-nowrap bg-neutral-100 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(post.createdAt)}
                          </span>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-semibold text-neutral-900 mb-2 line-clamp-2">
                        {post.hook}
                      </h4>
                      <p className="text-sm text-neutral-600 line-clamp-3 mb-4 flex-1">
                        {post.main_caption}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
                        {post.hashtag_suggestions && post.hashtag_suggestions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {post.hashtag_suggestions.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs text-neutral-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div />
                        )}
                        {onLoadPost && (
                          <button 
                            onClick={() => onLoadPost(post)}
                            className="flex-shrink-0 flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Bruk denne</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {activeView === 'articles' && (
              articles.length === 0 ? (
                <EmptyState title="Ingen artiklar enno" icon={<FileText className="w-8 h-8 text-neutral-400" />} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {articles.map((article) => (
                    <div key={article.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          article.status === 'published' ? 'bg-green-100 text-green-700' : 
                          article.status === 'ready' ? 'bg-blue-100 text-blue-700' : 
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {article.status}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center text-xs text-neutral-500 whitespace-nowrap bg-neutral-100 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(article.updatedAt)}
                          </span>
                          <button 
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-semibold text-neutral-900 mb-2 line-clamp-2">
                        {article.topic}
                      </h4>
                      <p className="text-sm text-neutral-600 line-clamp-3 mb-4 flex-1">
                        {article.content.replace(/[#*]/g, '').substring(0, 200)}...
                      </p>
                      <div className="flex items-center justify-end mt-auto pt-3 border-t border-neutral-100">
                        <button 
                          onClick={() => onLoadArticle?.(article)}
                          className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Sjå artikkel</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-neutral-900 mb-1">{title}</h3>
      <p className="text-neutral-500 text-sm">
        Når du genererer innhald, vil det dukke opp her.
      </p>
    </div>
  );
}
