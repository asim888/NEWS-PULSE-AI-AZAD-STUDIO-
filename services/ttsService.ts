
import { generateSpeech } from './geminiService';

// Audio Context State
let audioContext: AudioContext | null = null;
let isPlaying = false;
let currentSource: AudioBufferSourceNode | null = null;
let stopRequested = false;

const initAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
};

// Helper to decode Base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to split text into chunks for continuous playback
const splitTextIntoChunks = (text: string): string[] => {
    // Split by punctuation that usually indicates a pause
    const regex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
    const chunks = text.match(regex) || [text];
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
};

// Map locale codes/voices to Gemini Prebuilt Voices
const VOICE_MAP: Record<string, string> = {
    'en-IN': 'Kore',   // Map Indian English to Kore (Female, Clear)
    'hi-IN': 'Zephyr', // Map Hindi to Zephyr (Female)
    'ur-IN': 'Puck',   // Map Urdu to Puck (Male)
    'te-IN': 'Fenrir', // Map Telugu to Fenrir (Male)
    'en-US': 'Kore',
    'default': 'Kore'
};

export const speak = async (text: string, langVoice: string, onEnd?: () => void) => {
    stopSpeaking();
    stopRequested = false;
    isPlaying = true;

    initAudioContext();
    if (audioContext?.state === 'suspended') {
        await audioContext.resume();
    }

    const chunks = splitTextIntoChunks(text);
    const geminiVoice = VOICE_MAP[langVoice] || VOICE_MAP['default'];

    processQueue(chunks, geminiVoice, onEnd);
};

const processQueue = async (chunks: string[], voice: string, onEnd?: () => void) => {
    if (chunks.length === 0) {
        isPlaying = false;
        if (onEnd) onEnd();
        return;
    }

    // "Fetch Ahead" strategy: Start fetching the first chunk
    let nextAudioPromise = generateSpeech(chunks[0], voice);

    for (let i = 0; i < chunks.length; i++) {
        if (stopRequested) break;

        try {
            // Wait for the current chunk's audio data
            const base64Audio = await nextAudioPromise;

            // Start fetching the NEXT chunk while we process/play the current one
            if (i + 1 < chunks.length && !stopRequested) {
                nextAudioPromise = generateSpeech(chunks[i+1], voice);
            }

            if (base64Audio && !stopRequested) {
                await playAudio(base64Audio);
            }
        } catch (e) {
            console.error("Error processing TTS chunk", e);
        }
    }

    isPlaying = false;
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
    isPlaying = false;
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
};

// Helper to Decode Raw PCM (24kHz Mono) from Gemini API
async function decodePCMData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
             // Convert int16 to float (-1.0 to 1.0)
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
