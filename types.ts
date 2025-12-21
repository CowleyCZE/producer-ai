export interface Variant {
  id: string;
  text: string;
  type: string; // e.g., "Flow", "Rhyme", "Meaning"
}

export interface LyricSegment {
  id: string;
  originalText: string;
  isProblematic: boolean;
  issueDescription?: string; // e.g., "Rushing flow", "Weak rhyme"
  variants: Variant[];
  selectedVariantId: string | null; // null means original is selected
}

export interface AnalysisResult {
  segments: LyricSegment[];
  mode: string;
}

export interface FinalOutput {
  lyrics: string;
  musicDescription: string;
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
  MODE_1 = 'MODE_1', // Adaptace podle Žánru
  MODE_2 = 'MODE_2', // Adaptace podle Interpreta
  MODE_3 = 'MODE_3', // Generování Promptu
  MODE_4 = 'MODE_4', // Překlad a Analýza
  MODE_5 = 'MODE_5', // Interaktivní Editace
  MODE_6 = 'MODE_6', // Kompozice k Vokálu
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