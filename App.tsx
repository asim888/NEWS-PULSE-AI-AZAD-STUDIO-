
import React, { useState, useEffect, useMemo } from 'react';
import { SubscriptionProvider, useSubscription } from './hooks/useSubscription';
import { MOCK_ARTICLES, CATEGORIES, FOUNDER_BIOS, LOGO_URL, FALLBACK_ARTICLES, BRANDING_ASSET_URL } from './constants';
import { Article, Category, CategoryID } from './types';
import ArticleView from './components/ArticleView';
import SubscriptionModal from './components/SubscriptionModal';
import { CrownIcon, MicIcon3D } from './components/Icons';
import { speak } from './services/ttsService';
import { fetchCategoryNews, fetchBreakingNewsTicker } from './services/newsService';
import { generateRomanUrduTitle } from './services/geminiService';
import { cleanupOldArticles } from './services/storageService';


// --- Child Components ---

const Logo: React.FC = () => (
    <div className="flex items-center gap-3">
        <img 
            src={LOGO_URL} 
            alt="News Pulse AI Logo" 
            className="w-12 h-12 rounded-full border border-amber-300 shadow-lg shadow-amber-500/20 bg-black object-contain"
        />
        <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-wider leading-none">News Pulse <span className="text-amber-400">AI</span></h1>
            <span className="text-[10px] text-amber-500/80 font-medium tracking-wide mt-1">Abu Aimal, Aimal Akram & Azad Studio</span>
        </div>
    </div>
);

interface HeaderProps {
    onFoundersClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onFoundersClick }) => (
    <header className="sticky top-0 bg-black/90 backdrop-blur-md p-4 z-10 flex justify-between items-center border-b border-amber-900/30 shadow-md">
        <Logo />
        <button onClick={onFoundersClick} className="text-sm font-medium text-amber-100/80 hover:text-amber-400 transition-colors border border-amber-900/50 px-3 py-1 rounded-full hover:border-amber-600">
            About Us
        </button>
    </header>
);

const BreakingNewsTicker: React.FC = () => {
    const [breakingNews, setBreakingNews] = useState<Article[]>([]);

    useEffect(() => {
        const fetchBreaking = async () => {
            const news = await fetchBreakingNewsTicker();
            setBreakingNews(news.length > 0 ? news : MOCK_ARTICLES);
        };

        fetchBreaking();
        const interval = setInterval(fetchBreaking, 30 * 60 * 1000); // Update every 30 mins
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-neutral-900 border-y border-amber-800/50 text-white py-2 px-4 flex items-center overflow-hidden shadow-inner">
            <span className="font-bold text-xs md:text-sm uppercase flex-shrink-0 mr-4 px-2 py-1 bg-amber-700 text-black rounded animate-pulse">Breaking News</span>
            <div className="animate-marquee whitespace-nowrap text-amber-100/90">
                {breakingNews.map((news, index) => (
                    <span key={news.id} className="mx-4 text-sm font-medium">{news.title}<span className="text-amber-600 mx-2">✦</span></span>
                ))}
            </div>
        </div>
    );
};

// Welcome Overlay Component
const WelcomeOverlay: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    const handleEnter = () => {
        // Play Welcome Audio (Indian English Voice)
        speak("Welcome to News Pulse AI by Azad Studio. Bringing you news in your language, anytime, anywhere.", "en-IN");
        onDismiss();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 animate-fade-in text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black"></div>
            
            <div className="relative z-10 flex flex-col items-center max-w-md w-full">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-pulse-slow"></div>
                    <img src={LOGO_URL} alt="Logo" className="w-32 h-32 rounded-full border-4 border-amber-500/50 shadow-2xl relative z-10" />
                </div>

                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-500 to-amber-200 mb-2 font-serif">
                    News Pulse AI
                </h1>
                <p className="text-amber-600 font-bold tracking-widest text-xs uppercase mb-8">
                    Presented by Azad Studio
                </p>

                <p className="text-gray-400 mb-10 text-sm leading-relaxed max-w-xs">
                    Experience journalism without barriers. Real-time translation, AI summaries, and voice narration in your preferred language.
                </p>

                <button 
                    onClick={handleEnter}
                    className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-full font-bold text-black shadow-lg shadow-amber-900/40 hover:scale-105 transition-transform w-full sm:w-auto overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative flex items-center justify-center gap-2">
                        <MicIcon3D className="w-5 h-5 text-black" />
                        Enter News Pulse
                    </span>
                </button>
                
                <div className="mt-8 flex gap-4 opacity-50">
                     {FOUNDER_BIOS.slice(0,2).map(f => (
                         <img key={f.name} src={f.imageUrl} className="w-8 h-8 rounded-full border border-neutral-700 grayscale" alt={f.name} />
                     ))}
                </div>
            </div>
        </div>
    );
};


interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onSelect }) => {
    const [ruTitle, setRuTitle] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const fetchRuTitle = async () => {
            const title = await generateRomanUrduTitle(article.title, article.id);
            if (isMounted && title) setRuTitle(title);
        };
        const timeout = setTimeout(fetchRuTitle, 100);
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [article.title, article.id]);

    return (
      <div
        className="group bg-neutral-900 rounded-xl overflow-hidden shadow-lg hover:shadow-amber-500/10 border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        onClick={() => onSelect(article)}
      >
        <div className="relative">
            <img 
                src={article.imageUrl || LOGO_URL} 
                alt={article.title} 
                className="w-full h-44 object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = LOGO_URL; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
            <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/60 text-amber-400 px-2 py-1 rounded backdrop-blur-sm border border-amber-900/50">
                {article.source}
            </span>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-lg text-gray-100 mb-1 h-auto overflow-hidden leading-tight group-hover:text-amber-400 transition-colors">{article.title}</h3>
          {ruTitle && (
              <h4 className="text-amber-600/80 text-sm font-serif italic mb-3 animate-fade-in-fast leading-snug">
                  {ruTitle}
              </h4>
          )}
          <p className="text-gray-400 text-sm h-16 overflow-hidden leading-relaxed line-clamp-3">{article.description}</p>
          <div className="mt-4 text-xs text-gray-500 flex justify-between items-center border-t border-neutral-800 pt-3">
            <span className="text-amber-600/80 font-medium">Read More</span>
            <span>{new Date(article.pubDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
};

const FoundersSection: React.FC<{ onBack: () => void }> = ({ onBack }) => (
    <div className="p-6 animate-fade-in min-h-[80vh] flex flex-col">
         <div className="mb-12 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600 mb-6">Our Vision</h2>
            <p className="text-gray-300 text-lg italic font-serif leading-relaxed">
                "To create a world where language is no longer a barrier to accessing information. News Pulse AI combines cutting-edge AI technology with journalism to deliver news in your preferred language, making global events accessible to everyone."
            </p>
            <div className="mt-6 p-4 bg-amber-900/10 border border-amber-900/30 rounded-lg">
                 <p className="text-sm text-amber-500/90">
                    We believe that everyone deserves access to quality journalism in their native language. Through AI-powered translation and text-to-speech technology, we're breaking down barriers and bringing the world closer together.
                 </p>
            </div>
        </div>

        <h3 className="text-2xl font-bold text-center text-amber-100 mb-8 uppercase tracking-widest">Meet The Team</h3>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {FOUNDER_BIOS.map(founder => (
                <div key={founder.name} className="bg-neutral-900 p-6 rounded-xl flex flex-col items-center text-center shadow-2xl border border-amber-900/30 hover:border-amber-600/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    <div className="p-1 bg-gradient-to-br from-amber-400 to-yellow-700 rounded-full mb-4">
                         <img src={founder.imageUrl} alt={founder.name} className="w-32 h-32 rounded-full border-4 border-black object-cover"/>
                    </div>
                    <h3 className="text-xl font-bold text-amber-50 mb-1">{founder.name}</h3>
                    <span className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-4 block">{founder.role}</span>
                    <p className="text-gray-400 text-sm leading-relaxed">{founder.bio}</p>
                </div>
            ))}
        </div>
        
        <div className="text-center mt-auto">
            <button onClick={onBack} className="bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold px-8 py-3 rounded-full hover:from-amber-500 hover:to-yellow-500 transition-all transform hover:scale-105 shadow-lg shadow-amber-900/20">
                Back to News
            </button>
        </div>
    </div>
);


// --- Main App Content ---

const AppContent: React.FC = () => {
    type View = 'feed' | 'article' | 'founders';

    const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
    const [selectedCategory, setSelectedCategory] = useState<CategoryID>('azad-studio');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [currentView, setCurrentView] = useState<View>('feed');
    const [isFetching, setIsFetching] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const { checkSubscription } = useSubscription();

    // Initial Fetch & Daily Cleanup
    useEffect(() => {
        cleanupOldArticles(24);

        const loadNews = async () => {
            setIsFetching(true);
            const allFetchedArticles: Article[] = [];
            
            // 1. Fetch Azad Studio from RSS
            try {
                const azadNews = await fetchCategoryNews('azad-studio');
                if (azadNews.length > 0) allFetchedArticles.push(...azadNews);
                else allFetchedArticles.push(...MOCK_ARTICLES);
            } catch (e) {
                allFetchedArticles.push(...MOCK_ARTICLES);
            }

            // 2. Fetch others in parallel
            const categoriesToFetch: CategoryID[] = ['hyderabad', 'telangana', 'india', 'international', 'sports'];
            try {
                const promises = categoriesToFetch.map(cat => fetchCategoryNews(cat));
                const results = await Promise.all(promises);
                results.forEach(news => {
                    if (news && news.length > 0) allFetchedArticles.push(...news);
                });
            } catch (e) { console.error(e); }

            setArticles(allFetchedArticles);
            setIsFetching(false);
        };

        loadNews();
    }, []);

    const handleCategorySelect = (category: Category) => {
        if (checkSubscription(category.isPremium)) {
            setSelectedCategory(category.id);
            setCurrentView('feed');
            setSelectedArticle(null);
        }
    };

    const handleArticleSelect = (article: Article) => {
        const category = CATEGORIES.find(c => c.id === article.category);
        if (category && checkSubscription(category.isPremium)) {
            setSelectedArticle(article);
            setCurrentView('article');
        }
    };
    
    const goBackToFeed = () => {
        setSelectedArticle(null);
        setCurrentView('feed');
    }

    const filteredArticles = useMemo(() => {
        const filtered = articles.filter(article => article.category === selectedCategory);
        if (filtered.length === 0 && selectedCategory !== 'azad-studio') return FALLBACK_ARTICLES;
        return filtered.length > 0 ? filtered : (selectedCategory === 'azad-studio' ? MOCK_ARTICLES : []);
    }, [articles, selectedCategory]);

    const renderView = () => {
        switch (currentView) {
            case 'article':
                return selectedArticle && <ArticleView article={selectedArticle} onBack={goBackToFeed} />;
            case 'founders':
                return <FoundersSection onBack={goBackToFeed} />;
            case 'feed':
            default:
                return (
                    <div className="p-4 md:p-8 max-w-7xl mx-auto">
                         <div className="mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-500/80 uppercase tracking-widest text-xs font-bold">
                                <span className="w-8 h-[1px] bg-amber-500/50"></span>
                                {selectedCategory.replace('-', ' ')} Stories
                            </div>
                            {isFetching && (
                                <div className="flex items-center gap-2 text-amber-500 text-xs animate-pulse">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                    Refreshing Feed...
                                </div>
                            )}
                        </div>

                        {/* Azad Studio Exclusive Layout */}
                        {selectedCategory === 'azad-studio' && (
                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                <div className="lg:col-span-2 bg-neutral-900 rounded-2xl overflow-hidden border border-amber-900/30 shadow-2xl h-[500px] md:h-[600px] relative group">
                                    <div className="absolute top-0 left-0 w-full bg-amber-600 text-black text-xs font-bold text-center py-1 z-10 tracking-widest">
                                        OFFICIAL CHANNEL LIVE VIEW
                                    </div>
                                    <iframe 
                                        src="https://t.me/s/AzadStudioOfficial?embed=1" 
                                        className="w-full h-full border-0 mt-5 bg-neutral-900"
                                        title="Azad Studio Telegram"
                                    ></iframe>
                                </div>
                                <div className="lg:col-span-1 h-[500px] md:h-[600px]">
                                    {/* PERSONAL UPDATES WIDGET EMBED */}
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src="https://rss.app/embed/v1/feed/AA6lZH5NppIw7V1B" 
                                        frameBorder="0"
                                        className="rounded-2xl border border-amber-900/30 shadow-2xl bg-neutral-900"
                                        title="Personal Updates Feed"
                                    ></iframe>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredArticles.map(article => (
                                <ArticleCard key={article.id} article={article} onSelect={handleArticleSelect} />
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {showWelcome && <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />}
            
            <Header onFoundersClick={() => setCurrentView('founders')} />
            <BreakingNewsTicker />

            <nav className="bg-black/50 p-4 border-b border-neutral-900 sticky top-[73px] z-10 backdrop-blur-sm">
                <div className="flex justify-start md:justify-center items-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat)}
                            className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center gap-2 border ${selectedCategory === cat.id ? 'bg-amber-600 border-amber-500 text-black shadow-lg shadow-amber-900/40' : 'bg-transparent border-neutral-800 text-gray-400 hover:text-amber-400 hover:border-amber-800'}`}
                        >
                            {cat.isPremium && <CrownIcon className={`w-3 h-3 ${selectedCategory === cat.id ? 'text-black' : 'text-amber-500'}`} />}
                            {cat.name}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-grow">
                {renderView()}
            </main>

            <footer className="p-8 bg-neutral-950 border-t border-neutral-900 text-center">
                <div className="flex flex-col items-center gap-4 mb-8">
                     <img src={LOGO_URL} alt="Logo" className="w-12 h-12 opacity-80 rounded-full border border-neutral-800 grayscale hover:grayscale-0 transition-all" />
                    <div className="max-w-md">
                         <h4 className="text-amber-500 font-bold text-sm mb-2">News Pulse AI</h4>
                         <p className="text-gray-500 text-xs leading-relaxed">
                             Breaking language barriers with AI-powered news translation and text-to-speech.
                         </p>
                    </div>
                </div>
                <p className="text-neutral-700 text-[10px] tracking-wide">
                    © {new Date().getFullYear()} News Pulse AI | By Abu Aimal, Aimal Akram & Azad Studio
                </p>
            </footer>

            <SubscriptionModal />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <SubscriptionProvider>
        <style>{`
            /* Scrollbar Hiding */
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            
            /* Animations */
            .animate-marquee { animation: marquee 120s linear infinite; }
            @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            
            .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
            .animate-fade-in-fast { animation: fadeIn 0.2s ease-in-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .animate-pulse-slow { animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: .8; } }
        `}</style>
      <AppContent />
    </SubscriptionProvider>
  );
};

export default App;
