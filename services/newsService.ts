
import { Article, CategoryID } from '../types';
import { RSS_FEED_URLS, CATEGORY_FALLBACKS } from '../constants';
import { getArticlesFromDB, saveArticlesToDB } from './storageService';
import { supabase } from './supabaseClient';

// Proxies for RSS Fetching
const PROXY_LIST = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// CACHE SETTINGS
// 6 Hours - Data older than this will trigger a fresh fetch attempt
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; 

// --- Helper Functions ---

const generateStableId = (link: string, category: string): string => {
    try {
        const str = `${category}-${link}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; 
        }
        return `art-${Math.abs(hash)}`;
    } catch (e) {
        return `art-${Date.now()}`;
    }
};

const fetchUrlViaProxy = async (targetUrl: string): Promise<string> => {
    let lastError;
    for (const createProxyUrl of PROXY_LIST) {
        try {
            const url = createProxyUrl(targetUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.text();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("All proxies failed");
};

// Dynamic Feed URL Fetcher (Supabase -> Constants)
const getFeedUrls = async (category: CategoryID): Promise<string[]> => {
    if (supabase) {
        try {
            const { data } = await supabase
                .from('feed_sources')
                .select('url')
                .eq('category_id', category)
                .eq('is_active', true);
            
            if (data && data.length > 0) {
                return data.map(d => d.url);
            }
        } catch (e) {
            console.warn("Error fetching feed config from DB, falling back to constants");
        }
    }
    return RSS_FEED_URLS[category as string] || [];
};

const parseRSS = (xmlText: string, category: CategoryID, sourceNameFallback: string): Article[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) return [];
    
    const items = Array.from(xmlDoc.querySelectorAll("item"));
    
    return items.map((item) => {
        const title = item.querySelector("title")?.textContent?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() || "No Title";
        const link = item.querySelector("link")?.textContent || "#";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
        let source = item.querySelector("source")?.textContent || sourceNameFallback;
        
        let imageUrl: string | null | undefined = null;
        const mediaContent = item.getElementsByTagNameNS("*", "content"); 
        if (mediaContent.length > 0) imageUrl = mediaContent[0].getAttribute("url");
        if (!imageUrl) {
             const enclosure = item.querySelector("enclosure");
             if (enclosure) imageUrl = enclosure.getAttribute("url");
        }
        if (!imageUrl && description) {
            const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) imageUrl = imgMatch[1];
        }

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = description;
        const cleanDesc = tempDiv.textContent || description;
        const shortDesc = cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + '...' : cleanDesc;

        return {
            id: generateStableId(link, category), // STABLE ID
            title, 
            description: shortDesc.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
            content: cleanDesc, 
            link,
            source,
            pubDate,
            category,
            imageUrl: imageUrl || undefined
        };
    });
};

const fetchViaRSS2JSON = async (rssUrl: string, category: CategoryID): Promise<Article[]> => {
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        const data = await response.json();
        if (data.status !== 'ok') return [];
        return data.items.map((item: any) => ({
            id: generateStableId(item.link, category),
            title: item.title,
            description: item.description?.substring(0, 150) || "",
            content: item.description || "",
            link: item.link,
            source: 'RSS Feed',
            pubDate: item.pubDate,
            category: category,
            imageUrl: item.thumbnail || item.enclosure?.link
        }));
    } catch (e) { return []; }
}

// --- Main Fetch Function ---

export const fetchCategoryNews = async (category: CategoryID): Promise<Article[]> => {
    // 1. CHECK SUPABASE DB & FRESHNESS
    try {
        const dbArticles = await getArticlesFromDB(category);
        
        if (dbArticles.length > 0) {
            // Check freshness
            const newestDate = new Date(dbArticles[0].pubDate).getTime();
            const now = Date.now();
            
            // If data is fresh (less than 6 hours old), return it.
            if ((now - newestDate) < STALE_THRESHOLD_MS) {
                return applyCategoryLimits(dbArticles, category);
            }
            // Data is stale, proceed to fetch new data
        }
    } catch (e) { console.warn("DB Read Fail", e); }


    // 2. FETCH FROM RSS SOURCES (No NewsAPI)
    const rssUrls = await getFeedUrls(category);
    let fetchedArticles: Article[] = [];
    let fetchSuccessful = false;

    // Iterate through all RSS URLs for this category
    for (const rssUrl of rssUrls) {
        try {
            const xmlText = await fetchUrlViaProxy(rssUrl);
            if (xmlText) {
                const articles = parseRSS(xmlText, category, 'RSS Feed');
                if (articles.length > 0) {
                    fetchedArticles = articles;
                    fetchSuccessful = true;
                    break; // Success!
                }
            }
        } catch (e) { }
        
        // Secondary Fallback: RSS2JSON API
        if (!fetchSuccessful) {
                const jsonArticles = await fetchViaRSS2JSON(rssUrl, category);
                if (jsonArticles.length > 0) {
                    fetchedArticles = jsonArticles;
                    fetchSuccessful = true;
                    break;
                }
        }
    }

    // 3. SAVE & RETURN
    if (fetchSuccessful && fetchedArticles.length > 0) {
        const limited = applyCategoryLimits(fetchedArticles, category);
        
        // UPSERT new articles. We DO NOT clear the cache here.
        // The cleanupOldArticles function (called in App.tsx) handles removing old items.
        // This ensures shared translations persist for active articles.
        await saveArticlesToDB(category, limited);
        
        return limited;
    }

    // 4. FINAL FALLBACK: Static content (Zero Empty Cards Policy)
    const fallback = CATEGORY_FALLBACKS[category as string];
    if (fallback) return fallback;

    return [];
};

const applyCategoryLimits = (articles: Article[], category: CategoryID): Article[] => {
    let limit = 10;
    if (['international', 'sports', 'breaking'].includes(category)) limit = 5;
    return articles.slice(0, limit);
}

export const fetchBreakingNewsTicker = async (): Promise<Article[]> => {
    try {
        const results = await Promise.all([
            fetchCategoryNews('breaking'),
            fetchCategoryNews('hyderabad'),
            fetchCategoryNews('india')
        ]);
        const all = results.flat();
        // Deduplicate
        const unique = Array.from(new Map(all.map(item => [item.title, item])).values());
        unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        return unique.slice(0, 20);
    } catch (error) {
        return fetchCategoryNews('breaking'); 
    }
}
