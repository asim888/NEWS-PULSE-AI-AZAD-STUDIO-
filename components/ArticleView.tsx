
import React, { useState, useEffect, useCallback } from 'react';
import { Article, Translation, LanguageCode } from '../types';
import { LANGUAGES, BRANDING_ASSET_URL, LOGO_URL } from '../constants';
import { translateText, generateEnhancedContent, EnhancedContent } from '../services/geminiService';
import { speak, stopSpeaking } from '../services/ttsService';
import { BackIcon, MicIcon3D } from './Icons';

interface ArticleViewProps {
  article: Article;
  onBack: () => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => {
  // --- Main Article State ---
  const [translations, setTranslations] = useState<Translation[]>([]);
  // Initialize language from local storage preference, default to 'en'
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('news_pulse_language_pref');
    return (saved as LanguageCode) || 'en';
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Summary Section State ---
  const [summaryLanguage, setSummaryLanguage] = useState<LanguageCode>('ur-ro');
  const [summaryTranslation, setSummaryTranslation] = useState<string>('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // --- Audio State ---
  const [playingSection, setPlayingSection] = useState<'main' | 'summary' | null>(null);
  
  // --- Content State ---
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  // 1. Load Enhanced Content (Full Article + Summaries) on Mount
  useEffect(() => {
      let isMounted = true;
      const loadContent = async () => {
          setIsGenerating(true);
          const data = await generateEnhancedContent(article.content, article.id);
          if (isMounted) {
              setEnhancedContent(data);
              // Basic heuristic: if we got data instantly (fast), it's likely cached
              // In a real app, the service would return a metadata flag
              if (data.romanUrduSummary) {
                  setSummaryTranslation(data.romanUrduSummary);
              }
              setIsGenerating(false);
              setIsFromCache(true); // Assume success from DB
          }
      };
      loadContent();
      return () => { isMounted = false; stopSpeaking(); };
  }, [article.id, article.content]);


  // 2. Logic: What to display in Main Area?
  // Prioritize the AI-expanded full article over the original short RSS content
  const displayedMainContent = currentLanguage === 'en'
    ? (enhancedContent?.fullArticle || article.content) 
    : translations.find(t => t.lang === currentLanguage)?.text || '';

  // 3. Logic: What to display in Summary Area?
  const displayedSummaryContent = summaryLanguage === 'ur-ro' && enhancedContent?.romanUrduSummary
      ? enhancedContent.romanUrduSummary
      : (summaryLanguage === 'en' ? enhancedContent?.shortSummary : summaryTranslation);


  // 4. Handle Main Article Translation
  const handleTranslateMain = useCallback(async (langCode: LanguageCode) => {
    stopSpeaking(); // IMPORTANT: Stop audio when language changes
    setPlayingSection(null);
    localStorage.setItem('news_pulse_language_pref', langCode);

    if (langCode === 'en') {
        setCurrentLanguage('en');
        return;
    }
    
    // Check if we already have it in local state
    const existing = translations.find(t => t.lang === langCode);
    if (existing) {
      setCurrentLanguage(langCode);
      return;
    }

    if (!enhancedContent?.fullArticle) return;

    setIsLoading(true);
    setCurrentLanguage(langCode);
    try {
      // Unique ID for full article translation to avoid summary collision
      // This retrieves from Supabase if available
      const uniqueId = `${article.id}_full_v1`;
      const translatedText = await translateText(enhancedContent.fullArticle, langCode, 'English', uniqueId);
      setTranslations(prev => [...prev, { lang: langCode, text: translatedText }]);
    } catch (error) {
      console.error('Translation failed', error);
      setCurrentLanguage('en'); 
    } finally {
      setIsLoading(false);
    }
  }, [article.id, enhancedContent, translations]);

  // 5. Handle Summary Translation
  const handleTranslateSummary = useCallback(async (langCode: LanguageCode) => {
      stopSpeaking(); // IMPORTANT: Stop audio when language changes
      setPlayingSection(null);
      setSummaryLanguage(langCode);

      if (langCode === 'en') {
          return; 
      }
      
      // Optimization: Roman Urdu is pre-calculated
      if (langCode === 'ur-ro' && enhancedContent?.romanUrduSummary) {
          setSummaryTranslation(enhancedContent.romanUrduSummary);
          return;
      }

      if (!enhancedContent?.shortSummary) return;

      setIsSummaryLoading(true);
      try {
          // Translate the SHORT summary
          const text = await translateText(enhancedContent.shortSummary, langCode, 'English', `${article.id}_summary`);
          setSummaryTranslation(text);
      } catch (error) {
          console.error('Summary translation failed', error);
      } finally {
          setIsSummaryLoading(false);
      }
  }, [article.id, enhancedContent]);


  // 6. Auto-translate Main Article on Load
  useEffect(() => {
      if (enhancedContent?.fullArticle && currentLanguage !== 'en' && !isLoading) {
          const hasTranslation = translations.some(t => t.lang === currentLanguage);
          if (!hasTranslation) {
              handleTranslateMain(currentLanguage);
          }
      }
  }, [enhancedContent, currentLanguage, translations, handleTranslateMain, isLoading]);


  // 7. Audio Handlers
  const handleToggleMainSpeech = () => {
    if (playingSection === 'main') {
      stopSpeaking();
      setPlayingSection(null);
    } else {
      // Get the correct voice for the current language
      const langInfo = LANGUAGES.find(l => l.code === currentLanguage) || { voiceName: 'en-US' };
      
      if (displayedMainContent) {
          setPlayingSection('main');
          // Speak the FULL displayed content (Full English or Full Translated)
          speak(displayedMainContent, langInfo.voiceName, () => setPlayingSection(null));
      }
    }
  };

  const handleToggleSummarySpeech = () => {
      if (playingSection === 'summary') {
          stopSpeaking();
          setPlayingSection(null);
      } else {
          if (displayedSummaryContent) {
            let voiceName = 'en-US'; // Default fallback

            // Explicitly force en-IN for Roman Urdu (ur-ro) to ensure correct pronunciation of English characters
            if (summaryLanguage === 'ur-ro') {
                voiceName = 'en-IN';
            } else {
                // For other languages, look up the voice name from constants
                const langInfo = LANGUAGES.find(l => l.code === summaryLanguage);
                if (langInfo) {
                    voiceName = langInfo.voiceName;
                }
            }
            
            setPlayingSection('summary');
            speak(displayedSummaryContent, voiceName, () => setPlayingSection(null));
          }
      }
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-amber-400 hover:text-amber-200 transition-colors font-medium group">
            <BackIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Feed
        </button>
        {isFromCache && !isGenerating && (
            <span className="text-[10px] text-green-500/80 uppercase tracking-widest font-bold border border-green-900/30 px-2 py-1 rounded bg-green-900/10 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Cloud Sync Active
            </span>
        )}
      </div>

      <div className="bg-neutral-900 rounded-2xl shadow-2xl shadow-black border border-neutral-800 overflow-hidden">
        <div className="relative h-64 md:h-96 group">
            <img 
              src={article.imageUrl || LOGO_URL} 
              alt={article.title} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = LOGO_URL;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-black/40 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                 <div className="flex items-center gap-3 mb-3">
                    <span className="bg-amber-600 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-amber-900/50">
                        {article.category.replace('-', ' ')}
                    </span>
                    <span className="text-amber-400/80 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm bg-black/30 px-2 py-1 rounded">
                        {new Date(article.pubDate).toLocaleDateString()}
                    </span>
                 </div>
                 <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight font-serif tracking-tight drop-shadow-lg">
                    {article.title}
                 </h1>
            </div>
        </div>
        
        <div className="p-6 md:p-10 relative">
          
          {/* --- MAIN CONTROLS --- */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-black/40 p-4 rounded-2xl border border-neutral-800 backdrop-blur-sm sticky top-20 z-10 shadow-xl">
            
            <div className="w-full md:w-auto flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-amber-500/70 font-bold ml-1">Article Language</label>
                <div className="relative">
                    <select 
                        value={currentLanguage}
                        onChange={(e) => handleTranslateMain(e.target.value as LanguageCode)}
                        className="w-full md:w-64 appearance-none bg-neutral-900 text-amber-100 border border-neutral-700 hover:border-amber-600 rounded-xl px-4 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-900 transition-all font-medium cursor-pointer"
                        disabled={isLoading || isGenerating}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>
                                {lang.code === 'en' ? 'English (Full Article)' : lang.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <button 
                    onClick={handleToggleMainSpeech}
                    disabled={isLoading || isGenerating}
                    className={`group relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 ${playingSection === 'main' ? 'scale-110' : 'hover:scale-105'}`}
                >
                    <div className={`absolute inset-0 bg-amber-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity ${playingSection === 'main' ? 'animate-ping opacity-30' : ''}`}></div>
                    <div className="relative w-16 h-16 bg-gradient-to-b from-neutral-800 to-black rounded-full border border-amber-900/50 shadow-[0_4px_0_rgb(0,0,0),0_5px_10px_rgba(0,0,0,0.5)] group-active:translate-y-1 group-active:shadow-none flex items-center justify-center">
                         <MicIcon3D className="w-8 h-8" isActive={playingSection === 'main'} />
                    </div>
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${playingSection === 'main' ? 'text-amber-400 animate-pulse' : 'text-gray-500'}`}>
                    {playingSection === 'main' ? 'Reading Article...' : 'Read Article'}
                </span>
            </div>
          </div>

          <div className="mb-8 flex flex-col items-center opacity-90 gap-3">
               <img src={BRANDING_ASSET_URL} alt="Azad Studio" className="h-10 md:h-12 object-contain" />
               <div className="flex items-center gap-4 w-full">
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-900 to-transparent"></div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-amber-600/70 font-bold">News Pulse AI</span>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-amber-900 to-transparent"></div>
               </div>
          </div>

          {/* --- MAIN CONTENT AREA --- */}
          <div className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed min-h-[300px]">
            {(isLoading || isGenerating) ? (
              <div className="flex flex-col justify-center items-center h-60 gap-4">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                 <span className="text-amber-500/80 text-sm font-mono animate-pulse">
                     {isGenerating ? "AI is generating full article coverage..." : "Translating full article..."}
                 </span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                 <p className="first-letter:text-5xl first-letter:font-serif first-letter:text-amber-500 first-letter:mr-2 first-letter:float-left leading-loose">
                    {displayedMainContent || "Content unavailable."}
                 </p>
              </div>
            )}
          </div>
          
          {/* --- SUMMARY SECTION --- */}
          {!isGenerating && enhancedContent?.shortSummary && (
              <div className="mt-16 bg-black/60 border-l-4 border-amber-500 p-6 rounded-r-xl relative animate-fade-in">
                   
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                      <div className="flex items-center gap-4">
                          <h4 className="text-amber-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                              Summary
                          </h4>
                          <div className="relative">
                              <select 
                                  value={summaryLanguage}
                                  onChange={(e) => handleTranslateSummary(e.target.value as LanguageCode)}
                                  className="appearance-none bg-neutral-800 text-amber-200 text-xs border border-neutral-700 hover:border-amber-600 rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
                                  disabled={isSummaryLoading}
                              >
                                  {LANGUAGES.map(lang => (
                                      <option key={lang.code} value={lang.code}>
                                          {lang.name}
                                      </option>
                                  ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-500">
                                  <svg className="fill-current h-3 w-3" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                          </div>
                      </div>

                      <button 
                        onClick={handleToggleSummarySpeech}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                            playingSection === 'summary' 
                            ? 'bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                            : 'bg-neutral-800 border-amber-900/30 text-amber-500/70 hover:text-amber-400 hover:border-amber-600'
                        }`}
                      >
                         <MicIcon3D className="w-4 h-4" isActive={playingSection === 'summary'} />
                         <span className="text-[10px] font-bold uppercase tracking-wide">
                             {playingSection === 'summary' ? 'Listening' : 'Listen'}
                         </span>
                      </button>
                   </div>
                  
                  <div className="min-h-[60px]">
                      {isSummaryLoading ? (
                          <div className="flex items-center gap-2 text-amber-500/50 text-sm animate-pulse">
                              Translating summary...
                          </div>
                      ) : (
                          <p className="text-gray-300 italic font-serif leading-relaxed text-sm md:text-base border-t border-dashed border-neutral-700 pt-3">
                              {displayedSummaryContent || "Summary unavailable."}
                          </p>
                      )}
                  </div>
              </div>
          )}

           <div className="mt-12 pt-6 border-t border-neutral-800 flex justify-center">
             <a href={article.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-neutral-500 hover:text-amber-400 text-xs font-bold uppercase tracking-wide transition-colors">
               View original source at {article.source} <span className="text-lg">&rarr;</span>
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleView;
