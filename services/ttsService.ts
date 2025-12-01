
import { generateSpeech } from './geminiService';
import { getCachedAudio, saveCachedAudio } from './storageService';

// Audio Context State for Gemini (PCM)
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let stopRequested = false;

const initAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
};

// --- HELPER: Gemini PCM Decoding ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCMData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// --- HELPER: Text Chunking ---
const splitTextIntoChunks = (text: string): string[] => {
    const regex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
    const chunks = text.match(regex) || [text];
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
};

// --- HELPER: Device TTS Fallback ---
const speakNative = (text: string, lang: string, onEnd?: () => void) => {
    if (stopRequested) return;
    
    // Cancel any current browser speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map internal codes to standard BCP 47 tags for browser
    // en-IN is standard, but ur-ro needs fallback
    let browserLang = lang;
    if (lang === 'ur-ro') browserLang = 'en-IN'; // Read Roman Urdu as Indian English
    
    utterance.lang = browserLang;
    
    // Try to find a specific Indian voice if possible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        (v.lang === browserLang || v.lang.startsWith(browserLang.split('-')[0])) && 
        (v.name.includes('India') || v.name.includes('Google'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
        if (onEnd) onEnd();
    };
    
    utterance.onerror = (e) => {
        console.warn("Device TTS error", e);
        if (onEnd) onEnd();
    }

    window.speechSynthesis.speak(utterance);
};

// --- MAIN LOGIC ---

// Map locale codes/voices to Gemini Prebuilt Voices
const VOICE_MAP: Record<string, string> = {
    'en-IN': 'Kore',   
    'hi-IN': 'Zephyr', 
    'ur-IN': 'Puck',   
    'te-IN': 'Fenrir', 
    'ur-ro': 'Kore',   
    'en-US': 'Kore',
    'default': 'Kore'
};

export const speak = async (text: string, langVoice: string, onEnd?: () => void) => {
    stopSpeaking(); // Reset everything
    stopRequested = false;

    // We process the queue. Ideally we use Gemini.
    // If Gemini fails, we fallback to Device TTS for the *entire* remaining text 
    // to avoid jarring voice switches, or per chunk. 
    // Here we try per-chunk for maximum cache usage.

    const chunks = splitTextIntoChunks(text);
    const geminiVoice = VOICE_MAP[langVoice] || VOICE_MAP['default'];

    processQueue(chunks, geminiVoice, langVoice, onEnd);
};

const processQueue = async (chunks: string[], geminiVoice: string, langCode: string, onEnd?: () => void) => {
    if (chunks.length === 0) {
        if (onEnd) onEnd();
        return;
    }

    initAudioContext();
    if (audioContext?.state === 'suspended') {
        await audioContext.resume();
    }

    // WATERFALL METHOD FOR AUDIO FETCHING
    const fetchAudio = async (chunkText: string): Promise<{ type: 'gemini' | 'device', data: string | null }> => {
        // 1. Check DB Cache
        const cached = await getCachedAudio(chunkText, geminiVoice);
        if (cached) return { type: 'gemini', data: cached };

        // 2. Call Gemini API
        const generated = await generateSpeech(chunkText, geminiVoice);
        if (generated) {
            // Save to DB (Fire & Forget)
            saveCachedAudio(chunkText, geminiVoice, generated);
            return { type: 'gemini', data: generated };
        }

        // 3. Fallback to Device (Return null data to signal device usage)
        return { type: 'device', data: null };
    };

    // Queue Processing Loop
    for (let i = 0; i < chunks.length; i++) {
        if (stopRequested) break;

        try {
            const result = await fetchAudio(chunks[i]);

            if (stopRequested) break;

            if (result.type === 'gemini' && result.data) {
                // Play Gemini Audio
                await playAudio(result.data);
            } else {
                // Play Device Audio (Synchronous-ish, need to wait for end)
                await new Promise<void>((resolve) => {
                    speakNative(chunks[i], langCode, resolve);
                });
            }

        } catch (e) {
            console.error("Audio Processing Error, falling back to device", e);
            // Emergency fallback for this chunk
            await new Promise<void>((resolve) => {
                speakNative(chunks[i], langCode, resolve);
            });
        }
    }

    if (onEnd && !stopRequested) onEnd();
};

const playAudio = (base64: string): Promise<void> => {
    return new Promise(async (resolve) => {
        if (!audioContext) return resolve();

        try {
            const pcmData = decode(base64);
            const audioBuffer = await decodePCMData(pcmData, audioContext);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            currentSource = source;
            
            source.onended = () => {
                currentSource = null;
                resolve();
            };
            
            source.start();
        } catch (e) {
            console.error("Audio playback error", e);
            resolve();
        }
    });
};

export const stopSpeaking = () => {
    stopRequested = true;
    
    // Stop Gemini Audio
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    
    // Stop Device Audio
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};
