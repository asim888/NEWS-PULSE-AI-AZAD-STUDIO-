
import { GoogleGenAI, Modality } from "@google/genai";
import { LanguageCode } from '../types';
import { getCachedTranslation, saveCachedTranslation, getEnhancedContentFromCache, saveEnhancedContentToCache } from './storageService';

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error("Gemini API key not found.");
      throw new Error("API key is missing.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

// Helper for retries
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return retry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

export const translateText = async (text: string, targetLanguage: LanguageCode, originalLanguage: string = 'English', articleId?: string): Promise<string> => {
  if (articleId) {
      // Check Supabase Cache first (Shared across all users)
      const cached = await getCachedTranslation(articleId, targetLanguage);
      if (cached) return cached;
  }

  let prompt = '';
  switch (targetLanguage) {
    case 'hi': prompt = `Translate to Hindi: "${text}"`; break;
    case 'ur': prompt = `Translate to Urdu: "${text}"`; break;
    case 'te': prompt = `Translate to Telugu: "${text}"`; break;
    case 'ur-ro': prompt = `Transliterate to Roman Urdu: "${text}"`; break;
    default: return text;
  }

  try {
    const gemini = getAiClient();
    const resultText = await retry(async () => {
        const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    });

    if (resultText && articleId) {
        // Save to Supabase for future users
        await saveCachedTranslation(articleId, targetLanguage, resultText);
    }

    return resultText || "Translation unavailable.";
  } catch (error) {
    console.error("Translation error:", error);
    return "Translation failed due to network or API limit.";
  }
};

export const generateRomanUrduTitle = async (title: string, articleId: string): Promise<string> => {
    // Check Supabase Shared Cache using a special language code for titles
    // This ensures once generated, ALL users see the Roman Urdu title instantly
    const cacheKey = 'ur-ro-title'; 
    const cached = await getCachedTranslation(articleId, cacheKey as LanguageCode);
    if(cached) return cached;

    try {
        const gemini = getAiClient();
        const text = await retry(async () => {
             const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate headline to Roman Urdu (no quotes, keep it short): "${title}"`,
            });
            return response.text?.trim();
        });
        
        if(text) {
            // Save to Supabase
            await saveCachedTranslation(articleId, cacheKey as LanguageCode, text);
            return text;
        }
        return "";
    } catch (e) { return ""; }
};

export interface EnhancedContent {
    fullArticle: string;
    shortSummary: string;
    romanUrduSummary: string;
}

export const generateEnhancedContent = async (content: string, articleId: string): Promise<EnhancedContent> => {
    // Check Supabase Cache
    const cached = await getEnhancedContentFromCache(articleId);
    if (cached) return cached;

    try {
        const gemini = getAiClient();
        const prompt = `
        You are a senior journalist.
        1. Write a comprehensive full-length news article (approx 300 words) based on: "${content}"
        2. Create a 3-sentence summary.
        3. Translate summary to Roman Urdu.
        
        Return JSON:
        { "fullArticle": "...", "shortSummary": "...", "romanUrduSummary": "..." }
        `;

        const jsonText = await retry(async () => {
             const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return response.text;
        });

        if(jsonText) {
            const parsed = JSON.parse(jsonText);
            // Save to Supabase for all users
            await saveEnhancedContentToCache(articleId, parsed);
            return parsed;
        }
        throw new Error("Empty AI response");
    } catch (error) {
        return {
            fullArticle: content,
            shortSummary: content,
            romanUrduSummary: "Summary unavailable."
        };
    }
};

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<string | undefined> => {
    try {
        const gemini = getAiClient();
        // The gemini-2.5-flash-preview-tts model supports generating speech
        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        // Return raw PCM audio data (base64)
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
        console.error("Gemini TTS error:", error);
        return undefined;
    }
};
