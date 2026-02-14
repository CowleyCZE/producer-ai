import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AnalysisResult, FinalOutput, LyricSegment, Variant, SmartSuggestion, AiMode } from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash-exp';

interface CacheEntry {
  result: any;
  timestamp: number;
}

class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 1000 * 60 * 30;

  private hashKey(text: string, context: string, mode: string): string {
    const str = `${text}:${context}:${mode}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  get(text: string, context: string, mode: string): any | null {
    const key = this.hashKey(text, context, mode);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('[CACHE] Cache hit!');
    return entry.result;
  }

  set(text: string, context: string, mode: string, result: any): void {
    const key = this.hashKey(text, context, mode);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const semanticCache = new SemanticCache();

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

const SCHEMAS = {
  analysisResult: {
    type: 'object',
    properties: {
      mode: { type: 'string' },
      segments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            originalText: { type: 'string' },
            isProblematic: { type: 'boolean' },
            issueDescription: { type: 'string' },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  type: { type: 'string', enum: ['Flow', 'Rhyme', 'Meaning', 'Hybrid'] },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['id', 'text', 'type']
              }
            }
          },
          required: ['id', 'originalText', 'isProblematic', 'variants']
        }
      }
    },
    required: ['mode', 'segments']
  },
  finalOutput: {
    type: 'object',
    properties: {
      lyrics: { type: 'string' },
      musicDescription: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      metaTags: { type: 'array', items: { type: 'string' } }
    },
    required: ['lyrics', 'musicDescription']
  }
};

function validateResponse(data: any, schema: keyof typeof SCHEMAS): ValidationResult {
  const errors: string[] = [];
  const schemaDef = SCHEMAS[schema];

  try {
    if (schema === 'analysisResult') {
      if (!data.segments || !Array.isArray(data.segments)) {
        errors.push('Missing or invalid segments array');
      } else {
        data.segments.forEach((seg: any, idx: number) => {
          if (!seg.id) errors.push(`Segment ${idx}: missing id`);
          if (!seg.originalText) errors.push(`Segment ${idx}: missing originalText`);
          if (typeof seg.isProblematic !== 'boolean') errors.push(`Segment ${idx}: isProblematic must be boolean`);
          if (!seg.variants || !Array.isArray(seg.variants)) {
            errors.push(`Segment ${idx}: missing variants array`);
          }
        });
      }
    }

    if (schema === 'finalOutput') {
      if (!data.lyrics || typeof data.lyrics !== 'string') {
        errors.push('Missing or invalid lyrics');
      }
      if (!data.musicDescription || typeof data.musicDescription !== 'string') {
        errors.push('Missing or invalid musicDescription');
      }
    }
  } catch (e: any) {
    errors.push(`Validation error: ${e.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined
  };
}

function parseJSONResponse(responseText: string): any {
  let jsonStr = responseText.trim();
  
  const markdownMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    jsonStr = markdownMatch[1];
  }
  
  jsonStr = jsonStr.replace(/```[\s\S]*?```/g, '');
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const jsonLike = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    try {
      return JSON.parse(jsonLike);
    } catch (e2) {
      console.error('JSON parse failed:', jsonStr.substring(0, 200));
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
};

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function setApiKey(apiKey: string): void {
  localStorage.setItem('gemini_api_key', apiKey);
  genAI = new GoogleGenerativeAI(apiKey);
}

export function hasApiKey(): boolean {
  return !!(import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key'));
}

export async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      safetySettings: SAFETY_SETTINGS
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: GENERATION_CONFIG,
    });

    const response = result.response;
    if (!response) {
      throw new Error('Empty response from Gemini');
    }

    const text = response.text();
    if (!text) {
      throw new Error('No text in Gemini response');
    }

    return text;
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export const analyzeLyrics = async (text: string, context: string, selectedMode: AiMode): Promise<AnalysisResult> => {
  const cached = semanticCache.get(text, context, selectedMode);
  if (cached) {
    return cached;
  }

  const systemPrompt = getSystemPrompt(selectedMode, 'analyze');
  const prompt = `Context: ${context}\n\nLyrics to analyze:\n${text}`;

  try {
    const responseText = await callGemini(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    const validation = validateResponse(parsed, 'analysisResult');
    if (!validation.isValid) {
      console.warn('Validation errors:', validation.errors);
    }

    const result: AnalysisResult = {
      mode: parsed.mode || selectedMode,
      segments: (parsed.segments || []).map((seg: any, idx: number) => ({
        ...seg,
        id: seg.id || `seg-${idx}`,
        selectedVariantId: null,
        variants: (seg.variants || []).map((v: any, vIdx: number) => ({
          ...v,
          id: v.id || `v-${vIdx}`,
          confidence: v.confidence || Math.random() * 0.3 + 0.7
        }))
      }))
    };

    semanticCache.set(text, context, selectedMode, result);
    return result;
  } catch (error: any) {
    console.error('Analysis Error:', error);
    return {
      mode: selectedMode,
      segments: text.split('\n').filter(l => l.trim()).map((line, idx) => ({
        id: `line-${idx}`,
        originalText: line,
        isProblematic: false,
        variants: [],
        selectedVariantId: null
      }))
    };
  }
};

export const regenerateSegment = async (allSegments: LyricSegment[], currentIndex: number): Promise<Variant[]> => {
  const segment = allSegments[currentIndex];
  const systemPrompt = getSystemPrompt(AiMode.AUTO, 'regenerate');
  const prompt = `Original text: ${segment.originalText}\n\nOther lyrics for context:\n${allSegments.map(s => s.originalText).join('\n')}`;

  try {
    const responseText = await callGemini(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    return (parsed.variants || []).map((v: any, idx: number) => ({
      id: v.id || `new-v-${idx}`,
      text: v.text,
      type: v.type || 'Flow',
      confidence: v.confidence || Math.random() * 0.3 + 0.7
    }));
  } catch (e) {
    return [];
  }
};

export const generateFinalOutput = async (segments: LyricSegment[], context: string): Promise<FinalOutput> => {
  const assembledText = segments.map(seg => {
    if (seg.selectedVariantId) {
      const v = seg.variants.find(v => v.id === seg.selectedVariantId);
      return v ? v.text : seg.originalText;
    }
    return seg.originalText;
  }).join("\n");

  const systemPrompt = getSystemPrompt(AiMode.AUTO, 'finalize');
  const prompt = `Lyrics:\n${assembledText}\n\nContext: ${context}`;

  try {
    const responseText = await callGemini(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    const validation = validateResponse(parsed, 'finalOutput');
    if (!validation.isValid) {
      console.warn('Final output validation errors:', validation.errors);
    }

    return {
      lyrics: parsed.lyrics || assembledText,
      musicDescription: parsed.musicDescription || 'Music description not generated.',
      confidence: parsed.confidence || 0.8,
      metaTags: parsed.metaTags || []
    };
  } catch (error) {
    return {
      lyrics: assembledText,
      musicDescription: 'Generování popisu selhalo.',
      confidence: 0,
      metaTags: []
    };
  }
};

export const getSmartSuggestions = async (
  segment: LyricSegment,
  allSegments: LyricSegment[],
  context: string
): Promise<SmartSuggestion[]> => {
  const systemPrompt = `You are a creative lyric assistant. For the given lyric segment that has no problems, suggest creative enhancements. Focus on: mood improvements, alternative phrasings, rhyme enhancements, flow variations, emotional depth. Return JSON: { "suggestions": [{ "id": "s1", "type": "enhancement|alternative|rhyme|flow|mood", "text": "...", "description": "...", "confidence": 0.0-1.0 }] }`;

  const prompt = `Current segment: ${segment.originalText}

Other lyrics for context:
${allSegments.map(s => s.originalText).join('\n')}

Context: ${context}`;

  try {
    const responseText = await callGemini(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    return (parsed.suggestions || []).map((s: any, idx: number) => ({
      id: s.id || `suggestion-${idx}`,
      type: s.type || 'enhancement',
      text: s.text,
      description: s.description || '',
      confidence: s.confidence || Math.random() * 0.3 + 0.6
    }));
  } catch (e) {
    console.error('Smart suggestions error:', e);
    return [];
  }
};

export const suggestMetaTags = async (segments: LyricSegment[], context: string): Promise<string[]> => {
  const lyricsText = segments.map(s => s.originalText).join('\n');
  
  const systemPrompt = `You are a music producer expert. Analyze the lyrics structure and suggest appropriate meta tags (Intro, Verse, Pre-Chorus, Chorus, Hook, Bridge, Drop, Outro, Break, Ad-Lib, Harmony, Melody). Return JSON: { "metaTags": ["[Verse]", "[Chorus]", ...] }`;

  const prompt = `Lyrics:\n${lyricsText}\n\nContext: ${context}`;

  try {
    const responseText = await callGemini(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    return parsed.metaTags || [];
  } catch (e) {
    console.error('Meta tags suggestion error:', e);
    return [];
  }
};

function getSystemPrompt(mode: AiMode, task: 'analyze' | 'regenerate' | 'finalize' | 'suggest' | 'metatags'): string {
  const prompts = {
    analyze: {
      [AiMode.AUTO]: `You are an expert lyric analyst and music producer. Analyze the song lyrics and divide them into logical segments. Mark problematic segments (rhythm, rhyme issues) and suggest 2-3 fix variants. Always respond with valid JSON matching: { "mode": "string", "segments": [...] }`,
      [AiMode.MODE_1]: `You are a genre adaptation expert. Analyze lyrics and adapt them to match the specified genre (rhythm, flow, syllable count). Always respond with valid JSON: { "mode": "MODE_1", "segments": [...] }`,
      [AiMode.MODE_2]: `You are a style mimic expert. Rewrite lyrics in the style of a specific artist while preserving meaning. Always respond with valid JSON: { "mode": "MODE_2", "segments": [...] }`,
      [AiMode.MODE_3]: `You are a music prompt generator. Focus on creating detailed, massive music prompts for AI music generators. Always respond with valid JSON: { "mode": "MODE_3", "segments": [...] }`,
      [AiMode.MODE_4]: `You are a translator and lyric analyst. Provide artistic translation while preserving rhythm. Always respond with valid JSON: { "mode": "MODE_4", "segments": [...] }`,
      [AiMode.MODE_5]: `You are an interactive editor. Make specific structural or mood changes as requested. Always respond with valid JSON: { "mode": "MODE_5", "segments": [...] }`,
      [AiMode.MODE_6]: `You are a composition expert for acappella. Suggest musical composition that supports the vocal. Always respond with valid JSON: { "mode": "MODE_6", "segments": [...] }`
    },
    regenerate: `You are a lyric engineer. Suggest 3 new variants for this lyric segment. Each variant should focus on different aspect: Flow (rhythm), Rhyme (better rhymes), Meaning (better semantics). Always respond with valid JSON: { "variants": [{ "id": "s1", "text": "...", "type": "Flow|Rhyme|Meaning", "confidence": 0.0-1.0 }] }`,
    finalize: `You are a music producer. Based on the lyrics, create a detailed music production description (genre, instruments, mood, tempo). Also suggest appropriate meta tags. Always respond with valid JSON: { "lyrics": "...", "musicDescription": "...", "confidence": 0.0-1.0, "metaTags": ["[Intro]", "[Verse]", ...] }`
  };

  if (task === 'regenerate' || task === 'finalize') {
    return prompts[task];
  }

  return prompts.analyze[mode] || prompts.analyze[AiMode.AUTO];
}

export const clearCache = () => semanticCache.clear();
