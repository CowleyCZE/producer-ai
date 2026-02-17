import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AnalysisResult, FinalOutput, LyricSegment, Variant, SmartSuggestion, AiMode, ModelProvider } from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const OLLAMA_BASE_URL = 'http://localhost:11434';

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
let currentProvider: ModelProvider = ModelProvider.GEMINI;
let ollamaModelName: string = 'qwen2.5:3b';

export function getProvider(): ModelProvider {
  const saved = localStorage.getItem('ai_provider');
  if (saved === 'ollama') return ModelProvider.OLLAMA;
  return ModelProvider.GEMINI;
}

export function setProvider(provider: ModelProvider): void {
  currentProvider = provider;
  localStorage.setItem('ai_provider', provider);
}

export function getOllamaModel(): string {
  return localStorage.getItem('ollama_model') || 'qwen2.5:3b';
}

export function setOllamaModel(modelName: string): void {
  ollamaModelName = modelName;
  localStorage.setItem('ollama_model', modelName);
}

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

export function isOllamaConnected(): boolean {
  return localStorage.getItem('ai_provider') === 'ollama';
}

export async function testApiKey(): Promise<boolean> {
  try {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return false;
    
    const testAI = new GoogleGenerativeAI(apiKey);
    const model = testAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 10 }
    });
    
    return !!result.response;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}

export async function testOllama(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) return false;
    const data = await response.json();
    const models = data.models || [];
    if (models.length === 0) return false;
    const defaultModel = models.find((m: any) => m.name.includes('qwen')) || models[0];
    if (defaultModel) {
      setOllamaModel(defaultModel.name);
    }
    return true;
  } catch (error) {
    console.error('Ollama test failed:', error);
    return false;
  }
}

async function callOllama(prompt: string, systemPrompt: string): Promise<string> {
  const model = getOllamaModel();
  
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error: any) {
    console.error('Ollama API Error:', error);
    throw error;
  }
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

export async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const provider = getProvider();
  
  if (provider === ModelProvider.OLLAMA) {
    return callOllama(prompt, systemPrompt);
  }
  
  return callGemini(prompt, systemPrompt);
}

function getSystemPrompt(mode: AiMode, task: 'analyze' | 'regenerate' | 'finalize'): string {
  const prompts: Record<string, string> = {
    analyze: `You are an expert lyric analyst and music producer. Analyze the song lyrics and divide them into logical segments. Mark problematic segments (rhythm, rhyme issues) and suggest 2-3 fix variants. For EACH segment that has issues, you MUST provide variants. Return valid JSON: { "mode": "string", "segments": [{ "id": "1", "originalText": "...", "isProblematic": true/false, "issueDescription": "...", "variants": [{ "id": "v1", "text": "...", "type": "Flow|Rhyme|Meaning" }] }]}`,
    regenerate: `You are a lyric engineer. Suggest 3 new variants for this lyric segment. Each variant should focus on different aspect. Always respond with valid JSON: { "variants": [{ "id": "s1", "text": "...", "type": "Flow|Rhyme|Meaning" }] }`,
    finalize: `You are a music producer. Based on the lyrics, create a detailed music production description. Always respond with valid JSON: { "lyrics": "...", "musicDescription": "..." }`
  };

  return prompts[task] || prompts.analyze;
}

function analyzeLocally(text: string, selectedMode: AiMode): AnalysisResult {
  const lines = text.split('\n').filter(l => l.trim());
  
  const problemPatterns = [
    { pattern: /(\w+)\1+/gi, description: 'Repeated words' },
    { pattern: /\b(the|and|a|to|of|in|is|it|for|on|at|you|we|they)\b.*\b(the|and|a|to|of|in|is|it|for|on|at|you|we|they)\b/gi, description: 'Repeated filler words' },
  ];
  
  const segments: LyricSegment[] = lines.map((line, idx) => {
    let isProblematic = false;
    let issueDescription = '';
    
    for (const { pattern, description } of problemPatterns) {
      if (pattern.test(line)) {
        isProblematic = true;
        issueDescription = description;
        break;
      }
    }
    
    if (line.split(/\s+/).length > 12) {
      isProblematic = true;
      issueDescription = issueDescription ? issueDescription + '; Long line' : 'Long line - consider splitting';
    }
    
    const variants: Variant[] = [];
    if (isProblematic) {
      variants.push({
        id: `v-${idx}-1`,
        text: line.replace(/\b(\w+)\1+\b/gi, '$1'),
        type: 'Flow',
        confidence: 0.8
      });
      variants.push({
        id: `v-${idx}-2`,
        text: line,
        type: 'Meaning',
        confidence: 0.7
      });
    }
    
    return {
      id: `seg-${idx}`,
      originalText: line,
      isProblematic,
      issueDescription: isProblematic ? issueDescription : undefined,
      variants,
      selectedVariantId: null
    };
  });
  
  return {
    mode: selectedMode,
    segments
  };
}

export const analyzeLyrics = async (text: string, context: string, selectedMode: AiMode): Promise<AnalysisResult> => {
  if (!text.trim()) {
    return { mode: selectedMode, segments: [] };
  }
  
  const provider = getProvider();
  const hasGeminiKey = hasApiKey();
  
  if (provider === ModelProvider.OLLAMA || !hasGeminiKey) {
    try {
      const cached = semanticCache.get(text, context, selectedMode);
      if (cached) {
        return cached;
      }

      const systemPrompt = getSystemPrompt(selectedMode, 'analyze');
      const prompt = `Context: ${context}\n\nAnalyze these lyrics and find problematic segments. For EACH problematic segment, you MUST provide at least 2 variant suggestions.\n\nLyrics:\n${text}`;

      const responseText = await callAI(prompt, systemPrompt);
      const parsed = parseJSONResponse(responseText);
      
      const segments = (parsed.segments || []).map((seg: any, idx: number) => ({
        id: seg.id || `seg-${idx}`,
        originalText: seg.originalText || '',
        isProblematic: seg.isProblematic || false,
        issueDescription: seg.issueDescription || seg.issueDescription,
        variants: (seg.variants || []).map((v: any, vIdx: number) => ({
          id: v.id || `v-${idx}-${vIdx}`,
          text: v.text || '',
          type: v.type || 'Flow',
          confidence: v.confidence || Math.random() * 0.3 + 0.7
        })),
        selectedVariantId: null
      }));

      const result: AnalysisResult = {
        mode: parsed.mode || selectedMode,
        segments
      };

      semanticCache.set(text, context, selectedMode, result);
      return result;
    } catch (error: any) {
      console.error('Analysis Error, using local fallback:', error);
      return analyzeLocally(text, selectedMode);
    }
  }

  try {
    const cached = semanticCache.get(text, context, selectedMode);
    if (cached) {
      return cached;
    }

    const systemPrompt = getSystemPrompt(selectedMode, 'analyze');
    const prompt = `Context: ${context}\n\nAnalyze these lyrics and find problematic segments. For EACH problematic segment, you MUST provide at least 2 variant suggestions.\n\nLyrics:\n${text}`;

    const responseText = await callAI(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    const segments = (parsed.segments || []).map((seg: any, idx: number) => ({
      id: seg.id || `seg-${idx}`,
      originalText: seg.originalText || '',
      isProblematic: seg.isProblematic || false,
      issueDescription: seg.issueDescription || seg.issueDescription,
      variants: (seg.variants || []).map((v: any, vIdx: number) => ({
        id: v.id || `v-${idx}-${vIdx}`,
        text: v.text || '',
        type: v.type || 'Flow',
        confidence: v.confidence || Math.random() * 0.3 + 0.7
      })),
      selectedVariantId: null
    }));

    const result: AnalysisResult = {
      mode: parsed.mode || selectedMode,
      segments
    };

    semanticCache.set(text, context, selectedMode, result);
    return result;
  } catch (error: any) {
    console.error('Analysis Error, using local fallback:', error);
    return analyzeLocally(text, selectedMode);
  }
};

export const regenerateSegment = async (allSegments: LyricSegment[], currentIndex: number): Promise<Variant[]> => {
  const provider = getProvider();
  const hasGeminiKey = hasApiKey();
  
  if ((provider === ModelProvider.OLLAMA || !hasGeminiKey) && provider !== ModelProvider.GEMINI) {
    const segment = allSegments[currentIndex];
    const words = segment.originalText.split(/\s+/);
    return [
      { id: 'v-local-1', text: segment.originalText.toUpperCase(), type: 'Flow', confidence: 0.6 },
      { id: 'v-local-2', text: segment.originalText.toLowerCase(), type: 'Meaning', confidence: 0.5 },
      { id: 'v-local-3', text: words.reverse().join(' '), type: 'Rhyme', confidence: 0.4 }
    ];
  }
  
  const segment = allSegments[currentIndex];
  const systemPrompt = getSystemPrompt(AiMode.AUTO, 'regenerate');
  const prompt = `Original text: ${segment.originalText}\n\nOther lyrics for context:\n${allSegments.map(s => s.originalText).join('\n')}`;

  try {
    const responseText = await callAI(prompt, systemPrompt);
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

  const provider = getProvider();
  const hasGeminiKey = hasApiKey();
  
  if (provider === ModelProvider.OLLAMA || !hasGeminiKey) {
    try {
      const systemPrompt = getSystemPrompt(AiMode.AUTO, 'finalize');
      const prompt = `Lyrics:\n${assembledText}\n\nContext: ${context}`;
      
      const responseText = await callAI(prompt, systemPrompt);
      const parsed = parseJSONResponse(responseText);
      
      return {
        lyrics: parsed.lyrics || assembledText,
        musicDescription: parsed.musicDescription || 'Music description generated by Ollama',
        confidence: 0.8
      };
    } catch (error) {
      return {
        lyrics: assembledText,
        musicDescription: 'Music description requires API key',
        confidence: 0
      };
    }
  }

  const systemPrompt = getSystemPrompt(AiMode.AUTO, 'finalize');
  const prompt = `Lyrics:\n${assembledText}\n\nContext: ${context}`;

  try {
    const responseText = await callAI(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    return {
      lyrics: parsed.lyrics || assembledText,
      musicDescription: parsed.musicDescription || 'Music description not generated.',
      confidence: parsed.confidence || 0.8
    };
  } catch (error) {
    return {
      lyrics: assembledText,
      musicDescription: 'Generování popisu selhalo.',
      confidence: 0
    };
  }
};

export const getSmartSuggestions = async (
  segment: LyricSegment,
  allSegments: LyricSegment[],
  context: string
): Promise<SmartSuggestion[]> => {
  const provider = getProvider();
  const hasGeminiKey = hasApiKey();
  
  if (provider === ModelProvider.OLLAMA || !hasGeminiKey) {
    try {
      const systemPrompt = `You are a creative lyric assistant. Suggest enhancements. Return JSON: { "suggestions": [{ "id": "s1", "type": "enhancement|alternative|rhyme|flow|mood", "text": "...", "description": "..." }] }`;
      const prompt = `Segment: ${segment.originalText}\n\nContext: ${context}`;
      
      const responseText = await callAI(prompt, systemPrompt);
      const parsed = parseJSONResponse(responseText);
      
      return (parsed.suggestions || []).map((s: any, idx: number) => ({
        id: s.id || `suggestion-${idx}`,
        type: s.type || 'enhancement',
        text: s.text,
        description: s.description || '',
        confidence: s.confidence || 0.6
      }));
    } catch (e) {
      return [
        { id: 's-1', type: 'enhancement', text: segment.originalText + ' 💫', description: 'Add emoji for emphasis', confidence: 0.5 },
        { id: 's-2', type: 'alternative', text: segment.originalText.replace(/lyrics/gi, 'verses'), description: 'Alternative wording', confidence: 0.4 }
      ];
    }
  }
  
  const systemPrompt = `You are a creative lyric assistant. Suggest enhancements. Return JSON: { "suggestions": [{ "id": "s1", "type": "enhancement|alternative|rhyme|flow|mood", "text": "...", "description": "..." }] }`;
  const prompt = `Segment: ${segment.originalText}\n\nContext: ${context}`;

  try {
    const responseText = await callAI(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    
    return (parsed.suggestions || []).map((s: any, idx: number) => ({
      id: s.id || `suggestion-${idx}`,
      type: s.type || 'enhancement',
      text: s.text,
      description: s.description || '',
      confidence: s.confidence || 0.6
    }));
  } catch (e) {
    return [];
  }
};

export const suggestMetaTags = async (segments: LyricSegment[], context: string): Promise<string[]> => {
  const provider = getProvider();
  const hasGeminiKey = hasApiKey();
  
  if (provider === ModelProvider.OLLAMA || !hasGeminiKey) {
    try {
      const lyricsText = segments.map(s => s.originalText).join('\n');
      const systemPrompt = `Analyze lyrics structure and suggest meta tags. Return JSON: { "metaTags": ["[Verse]", "[Chorus]", ...] }`;
      const prompt = `Lyrics:\n${lyricsText}\n\nContext: ${context}`;
      
      const responseText = await callAI(prompt, systemPrompt);
      const parsed = parseJSONResponse(responseText);
      return parsed.metaTags || [];
    } catch (e) {
      const tags: string[] = [];
      let hasMultipleLines = segments.length > 8;
      
      if (hasMultipleLines) {
        tags.push('[Intro]', '[Verse 1]', '[Chorus]', '[Verse 2]', '[Chorus]', '[Bridge]', '[Outro]');
      } else {
        tags.push('[Verse]', '[Chorus]');
      }
      
      return tags;
    }
  }
  
  const lyricsText = segments.map(s => s.originalText).join('\n');
  const systemPrompt = `Analyze lyrics structure and suggest meta tags. Return JSON: { "metaTags": ["[Verse]", "[Chorus]", ...] }`;
  const prompt = `Lyrics:\n${lyricsText}\n\nContext: ${context}`;

  try {
    const responseText = await callAI(prompt, systemPrompt);
    const parsed = parseJSONResponse(responseText);
    return parsed.metaTags || [];
  } catch (e) {
    return [];
  }
};

export const clearCache = () => semanticCache.clear();
