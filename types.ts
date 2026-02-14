export interface Variant {
  id: string;
  text: string;
  type: string;
  confidence?: number;
}

export interface SmartSuggestion {
  id: string;
  type: 'enhancement' | 'alternative' | 'rhyme' | 'flow' | 'mood';
  text: string;
  description: string;
  confidence: number;
}

export interface LyricSegment {
  id: string;
  originalText: string;
  isProblematic: boolean;
  issueDescription?: string;
  variants: Variant[];
  selectedVariantId: string | null;
  smartSuggestions?: SmartSuggestion[];
  metaTags?: string[];
}

export interface AnalysisResult {
  segments: LyricSegment[];
  mode: string;
}

export interface FinalOutput {
  lyrics: string;
  musicDescription: string;
  confidence?: number;
  metaTags?: string[];
}

export interface UserFeedback {
  id: string;
  timestamp: number;
  segmentId?: string;
  variantId?: string;
  rating: 'good' | 'bad' | 'neutral';
  comment?: string;
}

export interface PromptTemplate {
  id: string;
  mode: string;
  name: string;
  systemPrompt: string;
  task: 'analyze' | 'regenerate' | 'finalize' | 'suggest' | 'metatags';
}

export enum AppState {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  GENERATING_FINAL = 'GENERATING_FINAL',
  FINISHED = 'FINISHED',
}

export enum AiMode {
  AUTO = 'AUTO',
  MODE_1 = 'MODE_1',
  MODE_2 = 'MODE_2',
  MODE_3 = 'MODE_3',
  MODE_4 = 'MODE_4',
  MODE_5 = 'MODE_5',
  MODE_6 = 'MODE_6',
}

export const MODE_DESCRIPTIONS: Record<AiMode, string> = {
  [AiMode.AUTO]: "🤖 AUTOMATICKÁ DETEKCE (Doporučeno)",
  [AiMode.MODE_1]: "🎵 MÓD 1: Adaptace podle Žánru",
  [AiMode.MODE_2]: "🎤 MÓD 2: Styl Interpreta",
  [AiMode.MODE_3]: "📝 MÓD 3: Generování Promptu",
  [AiMode.MODE_4]: "🌍 MÓD 4: Překlad a Analýza",
  [AiMode.MODE_5]: "🎛️ MÓD 5: Interaktivní Editace / Remix",
  [AiMode.MODE_6]: "🎼 MÓD 6: Kompozice k Vokálu (Acappella)"
};

export enum ModelProvider {
  GEMINI = 'gemini',
  OLLAMA = 'ollama',
  LOCAL = 'local'
}

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
}

export const DEFAULT_MODELS: Record<ModelProvider, ModelConfig> = {
  [ModelProvider.GEMINI]: {
    provider: ModelProvider.GEMINI,
    modelName: 'gemini-2.0-flash-exp'
  },
  [ModelProvider.OLLAMA]: {
    provider: ModelProvider.OLLAMA,
    modelName: 'gemma:2b',
    baseUrl: 'http://localhost:11434'
  },
  [ModelProvider.LOCAL]: {
    provider: ModelProvider.LOCAL,
    modelName: 'local-model'
  }
};

export const META_TAG_SUGGESTIONS = [
  { tag: '[Intro]', description: 'Úvodní část skladby' },
  { tag: '[Verse]', description: 'Verš - hlavní lyrická část' },
  { tag: '[Pre-Chorus]', description: 'Přechod mezi veršem a refrénem' },
  { tag: '[Chorus]', description: 'Refrén - hlavní téma' },
  { tag: '[Hook]', description: 'Chytlavá část skladby' },
  { tag: '[Bridge]', description: 'Most - kontrastní část' },
  { tag: '[Drop]', description: 'Kulminace - nejsilnější část' },
  { tag: '[Outro]', description: 'Závěrečná část skladby' },
  { tag: '[Break]', description: 'Přestávka - instrumentální část' },
  { tag: '[Ad-Lib]', description: 'Improvizované vokály' },
  { tag: '[Harmony]', description: 'Harmonická vrstva' },
  { tag: '[Melody]', description: 'Melodická linka' },
] as const;
