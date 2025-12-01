
import { LanguageCode, Article, CategoryID } from '../types';
import { supabase } from './supabaseClient';
import { EnhancedContent } from './geminiService';

// --- ARTICLES (News Feed) ---

export const getArticlesFromDB = async (category: CategoryID): Promise<Article[]> => {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('category_id', category)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return (data || []).map((row: any) => ({
            id: row.id,
            category: row.category_id as CategoryID,
            title: row.title,
            description: row.description,
            content: row.content,
            link: row.link,
            source: row.source,
            imageUrl: row.image_url,
            pubDate: row.pub_date
        }));
    } catch (e) {
        console.warn('Error fetching articles from DB:', e);
        return [];
    }
};

export const saveArticlesToDB = async (category: CategoryID, articles: Article[]) => {
    if (!supabase) return;

    const rows = articles.map(a => ({
        id: a.id,
        category_id: category,
        title: a.title,
        description: a.description,
        content: a.content,
        link: a.link,
        source: a.source,
        image_url: a.imageUrl,
        pub_date: a.pubDate,
        created_at: new Date().toISOString()
    }));

    try {
        const { error } = await supabase.from('articles').upsert(rows);
        if (error) throw error;
    } catch (e) {
        console.warn('Error saving articles to DB:', e);
    }
};

export const clearCategoryCache = async (category: CategoryID) => {
    if (!supabase) return;
    try {
        await supabase.from('articles').delete().eq('category_id', category);
    } catch (e) {
        console.warn('Error clearing category cache:', e);
    }
}

// "Daily Clear" maintenance function
export const cleanupOldArticles = async (hoursOld: number) => {
    if (!supabase) return;
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();
    try {
        // Deleting articles cascades to translations and enhanced_content
        await supabase.from('articles').delete().lt('created_at', cutoff);
    } catch (e) {
        console.warn('Error cleaning up old articles:', e);
    }
};

// --- TRANSLATIONS ---

export const getCachedTranslation = async (articleId: string, lang: LanguageCode): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('translations')
      .select('translated_text')
      .eq('article_id', articleId)
      .eq('language_code', lang)
      .single();
    
    if (data) return data.translated_text;
  } catch (e) { /* ignore missing */ }
  return null;
};

export const saveCachedTranslation = async (articleId: string, lang: LanguageCode, text: string): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase
      .from('translations')
      .upsert(
          { article_id: articleId, language_code: lang, translated_text: text },
          { onConflict: 'article_id,language_code' }
      );
  } catch (e) { console.warn('Supabase save error', e); }
};

// --- ENHANCED CONTENT (AI Summaries) ---

export const getEnhancedContentFromCache = async (articleId: string): Promise<EnhancedContent | null> => {
  if (!supabase) return null;
  try {
      const { data } = await supabase
          .from('enhanced_content')
          .select('full_article, short_summary, roman_urdu_summary')
          .eq('article_id', articleId)
          .single();
      
      if (data) {
          return {
              fullArticle: data.full_article,
              shortSummary: data.short_summary,
              romanUrduSummary: data.roman_urdu_summary
          };
      }
  } catch(e) { /* ignore missing */ }
  return null;
};

export const saveEnhancedContentToCache = async (articleId: string, content: EnhancedContent) => {
    if (!supabase) return;
    try {
        await supabase.from('enhanced_content').upsert({ 
            article_id: articleId, 
            full_article: content.fullArticle,
            short_summary: content.shortSummary,
            roman_urdu_summary: content.romanUrduSummary
        });
    } catch (e) { console.warn('Supabase save error', e); }
};

// --- AUDIO CACHE ---

const hashText = (text: string): string => {
    let hash = 0;
    if (text.length === 0) return hash.toString();
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(36) + text.length;
};

export const getCachedAudio = async (text: string, voiceName: string): Promise<string | null> => {
    if (!supabase) return null;
    const key = hashText(text);

    try {
        const { data } = await supabase
            .from('audio_cache')
            .select('audio_data')
            .eq('text_hash', key)
            .eq('voice_name', voiceName)
            .single();
        
        if (data) return data.audio_data;
    } catch (e) { /* ignore */ }
    return null;
};

export const saveCachedAudio = async (text: string, voiceName: string, audioData: string) => {
    if (!supabase) return;
    const key = hashText(text);

    try {
        await supabase.from('audio_cache').upsert(
            { text_hash: key, voice_name: voiceName, audio_data: audioData },
            { onConflict: 'text_hash,voice_name' }
        );
    } catch (e) { console.warn('Audio cache save error', e); }
};
