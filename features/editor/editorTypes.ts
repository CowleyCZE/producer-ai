export type VariantType = 'balanced' | 'flow' | 'rhyme';

export interface VariantOption {
  id: string;
  type: VariantType;
  text: string;
}

export interface LineAlternatives {
  balanced: string;
  flow: string;
  rhyme: string;
}

export interface EditableLine {
  id: string;
  original: string;
  needsFix: boolean;
  alternatives: LineAlternatives | null;
  selectedOption: VariantType | null;
}

export interface AnalysisResult {
  lines: EditableLine[];
  usedFallback?: boolean;
  fallbackMessage?: string;
}

export enum AppState {
  INPUT = 'INPUT',
  RESULTS = 'RESULTS',
}

export enum StyleOption {
  BOOMBAP = 'boombap',
  TRAP = 'trap',
  MELODIC = 'melodic',
}

export const STYLE_LABELS: Record<StyleOption, string> = {
  [StyleOption.BOOMBAP]: 'Boombap',
  [StyleOption.TRAP]: 'Trap',
  [StyleOption.MELODIC]: 'Melodic',
};

export const STYLE_OPTIONS: StyleOption[] = [
  StyleOption.BOOMBAP,
  StyleOption.TRAP,
  StyleOption.MELODIC,
];

export enum EnergyOption {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export const ENERGY_LABELS: Record<EnergyOption, string> = {
  [EnergyOption.LOW]: 'Nízká',
  [EnergyOption.MEDIUM]: 'Střední',
  [EnergyOption.HIGH]: 'Vysoká',
};

export const ENERGY_OPTIONS: EnergyOption[] = [
  EnergyOption.LOW,
  EnergyOption.MEDIUM,
  EnergyOption.HIGH,
];

export enum ModelProvider {
  GEMINI = 'gemini',
  OLLAMA = 'ollama',
  LOCAL = 'local',
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
    modelName: 'gemini-2.0-flash-exp',
  },
  [ModelProvider.OLLAMA]: {
    provider: ModelProvider.OLLAMA,
    modelName: 'gemma:2b',
    baseUrl: 'http://localhost:11434',
  },
  [ModelProvider.LOCAL]: {
    provider: ModelProvider.LOCAL,
    modelName: 'local-model',
  },
};
