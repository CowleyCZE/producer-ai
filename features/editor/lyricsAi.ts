import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  AnalysisResult,
  EditableLine,
  EnergyOption,
  LineAlternatives,
  ModelProvider,
  StyleOption,
} from './editorTypes';

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MAX_LINES = 30;
const MAX_LINE_LENGTH_DELTA = 0.3;
const MIN_VARIANT_LENGTH = 3;
const KEYWORDS_TO_PRESERVE = ['panelák', 'makám', 'děti'];

export const AI_ANALYZE_LINE_LIMIT = MAX_LINES;

interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

interface AnalyzeOptions {
  style: StyleOption;
  energy: EnergyOption;
}

class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly ttl = 1000 * 60 * 30;

  private hashKey(text: string, style: StyleOption, energy: EnergyOption): string {
    const source = `${text}:${style}:${energy}`;
    let hash = 0;

    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(index);
      hash |= 0;
    }

    return hash.toString(16);
  }

  get(text: string, style: StyleOption, energy: EnergyOption): AnalysisResult | null {
    const key = this.hashKey(text, style, energy);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(text: string, style: StyleOption, energy: EnergyOption, result: AnalysisResult): void {
    const key = this.hashKey(text, style, energy);
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}

export const semanticCache = new SemanticCache();

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
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key'));
}

export function getProvider(): ModelProvider {
  const saved = localStorage.getItem('ai_provider');
  if (saved === ModelProvider.OLLAMA) {
    return ModelProvider.OLLAMA;
  }
  return ModelProvider.GEMINI;
}

export function setProvider(provider: ModelProvider): void {
  localStorage.setItem('ai_provider', provider);
}

export function getOllamaModel(): string {
  return localStorage.getItem('ollama_model') || 'qwen2.5:3b';
}

export function setOllamaModel(modelName: string): void {
  localStorage.setItem('ollama_model', modelName);
}

export function isOllamaConnected(): boolean {
  return localStorage.getItem('ai_provider') === ModelProvider.OLLAMA;
}

export async function testApiKey(): Promise<boolean> {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    return false;
  }

  return testGeminiKey(apiKey);
}

export async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const testAI = new GoogleGenerativeAI(apiKey);
    const model = testAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 10 },
    });

    return Boolean(result.response);
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}

export async function testOllama(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const models = data.models || [];
    if (models.length === 0) {
      return false;
    }

    const defaultModel = models.find((model: { name: string }) => model.name.includes('qwen')) || models[0];
    if (defaultModel) {
      setOllamaModel(defaultModel.name);
    }

    return true;
  } catch (error) {
    console.error('Ollama test failed:', error);
    return false;
  }
}

function parseJSONResponse(responseText: string): unknown {
  let jsonText = responseText.trim();
  const fencedMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    jsonText = fencedMatch[1].trim();
  }

  return JSON.parse(jsonText);
}

function getAnalyzeSystemPrompt(): string {
  return `Jsi profesionální český textař a český rapový editor.

Tvůj úkol:
- analyzovat text po jednotlivých řádcích
- najít slabé rýmy, nesourodý rytmus, klišé nebo příliš generické formulace
- nepřepisovat celý text, upravovat jen označené řádky

Pro každý problémový řádek vrať přesně 3 varianty:
1. **balanced** – nejbližší verze, která drží význam, rytmus i length
2. **flow** – varianta se zlepšeným rytmem a průrazností bez ztráty obsahu
3. **rhyme** – varianta se silnější rýmovou strukturou (multislabiční rýmy, asonance, konsonance)

Pravidla pro varianty:
- zachovej význam originálu
- drž podobný počet slabik (±2)
- nevracej slangové nebo generické rýmy jako den/sen/ven/jen/ten
- flow varianta může upravit strukturu pro lepší těžiště akcentů
- rhyme varianta má přidat víc rýmů a zároveň zůstat přirozená
- balanced varianta vrací nejpřirozenější výsledek, který těží z původního rytmu
- pokud se řádek nemění, napiš "needs_fix: false" a "alternatives": null

Pro varianty detailně:
- **balanced** zůstává co nejblíže originálu, ale lehce uhladí rytmus a vyhne se klišé
- **flow** cíleně posouvá akcenty (kratší pauzy, lehčí spojky), aby řádek lépe seděl na beat
- **rhyme** vytváří silnější rýmovou strukturu (multislabičná rýma, asonance, konsonance), ale zůstává přirozená

Výstup musí být STRICTNÍ JSON:
{
  "lines": [
    {
      "original": "text puvodniho radku",
      "needs_fix": true,
      "alternatives": {
        "balanced": "text",
        "flow": "text",
        "rhyme": "text"
      }
    }
  ]
}
`;
}

function getRegenerateSystemPrompt(): string {
  return `Jsi český rapový editor.

Uživatel chce opravit jeden konkrétní řádek, ale zachovej kontext celého textu.
Vrať přesně 3 varianty ve STRICTNÍM JSON:
{
  "alternatives": {
    "balanced": "text",
    "flow": "text",
    "rhyme": "text"
  }
}

Tvoje odpovědi musí:
- vysvětlit, proč se má každý typ změnit (např. "Flow: zkrátit pauzy a natlačit přízvuky")
- zachovat význam a přirozenost
- držet délku ±2 slabiky
- flow varianta zlepšuje rytmus a dynamiku
- rhyme varianta přidává silnější nebo vícbarevné rýmy
- balanced varianta zůstává nejvíc podobná originálu`;
}

function buildAnalyzePrompt(text: string, options: AnalyzeOptions): string {
  return `Text:
${text}

Styl:
${options.style}

Energie:
${options.energy}

Instrukce:
Zaměř se hlavně na:
- rytmus (flow)
- kvalitu rýmů
- přirozenost textu`;
}

function buildRegeneratePrompt(text: string, line: EditableLine, options: AnalyzeOptions): string {
  return `Celý text:
${text}

Řádek k opravě:
${line.original}

Styl:
${options.style}

Energie:
${options.energy}`;
}

async function callOllama(prompt: string, systemPrompt: string): Promise<string> {
  const model = getOllamaModel();
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\n${prompt}`,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.7,
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

export async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
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
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  if (getProvider() === ModelProvider.OLLAMA) {
    return callOllama(prompt, systemPrompt);
  }

  return callGemini(prompt, systemPrompt);
}

function countSyllables(text: string): number {
  return (text.match(/[aeiouyáéíóúůýě]/gi) || []).length;
}

function sanitizeAlternativeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}\n]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCompareText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

function normalizeAlternatives(source: unknown, original: string): LineAlternatives | null {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const alternatives = source as Record<string, unknown>;
  const normalized: LineAlternatives = {
    balanced: sanitizeAlternativeText(alternatives.balanced),
    flow: sanitizeAlternativeText(alternatives.flow),
    rhyme: sanitizeAlternativeText(alternatives.rhyme),
  };

  const originalLength = Math.max(original.trim().length, 1);
  const allValues = Object.values(normalized);
  const normalizedOriginal = normalizeCompareText(original);
  const distinctNormalizedValues = new Set(allValues.map((value) => normalizeCompareText(value)).filter(Boolean));
  const hasEmptyValue = allValues.some((value) => !value);
  const tooShortValue = allValues.some((value) => value.length < MIN_VARIANT_LENGTH);
  const exceedsDelta = allValues.some((value) => Math.abs(value.length - originalLength) / originalLength > MAX_LINE_LENGTH_DELTA);
  const matchesOriginalTooClosely = allValues.some((value) => normalizeCompareText(value) === normalizedOriginal);
  const hasDuplicateAlternatives = distinctNormalizedValues.size !== allValues.length;

  if (hasEmptyValue || tooShortValue || exceedsDelta || matchesOriginalTooClosely || hasDuplicateAlternatives) {
    return null;
  }

  if (!preservesKeywords(original, allValues)) {
    logHeuristic('keyword', { original, allValues });
    return null;
  }

  return normalized;
}

function preservesKeywords(original: string, alternatives: string[]): boolean {
  const normalizedOriginal = original.toLowerCase();
  for (const keyword of KEYWORDS_TO_PRESERVE) {
    if (!normalizedOriginal.includes(keyword)) {
      continue;
    }
    if (!alternatives.some((value) => value.toLowerCase().includes(keyword))) {
      return false;
    }
  }
  return true;
}

export function computeRhymeDensity(lines: string[]): number {
  if (!lines.length) {
    return 0;
  }
  const endings = lines.map((line) => (line.trim().split(/\s+/).pop() || '').toLowerCase());
  const rhymed = endings.filter((ending, idx) => idx > 0 && ending && endings[idx - 1] === ending).length;
  return Math.min(1, rhymed / Math.max(1, lines.length - 1));
}

export function scoreLineStructure(line: EditableLine): number {
  if (!line.needsFix) {
    return 100;
  }
  const originalLength = Math.max(line.original.trim().length, 1);
  const selectedText =
    line.selectedOption && line.alternatives ? line.alternatives[line.selectedOption] : line.original;
  const lengthDelta = Math.min(1, Math.abs(selectedText.length - originalLength) / originalLength);
  const rhythmScore = Math.max(0, 1 - lengthDelta);
  const naturalScore = Math.min(1, selectedText.length / Math.max(1, originalLength));
  const rhymeScore = /[aeiouyáéíóúůýě]+$/.test(selectedText) ? 1 : 0.6;
  return Math.round((rhythmScore * 0.45 + naturalScore * 0.25 + rhymeScore * 0.3) * 100);
}

function logHeuristic(tag: string, payload: unknown): void {
  if (process.env.NODE_ENV !== 'test') {
    console.debug(`[heuristic:${tag}]`, payload);
  }
}

function fallbackAlternatives(original: string): LineAlternatives {
  const trimmed = original.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const withoutLastWord = words.length > 3 ? words.slice(0, -1).join(' ') : trimmed;

  return {
    balanced: trimmed,
    flow: withoutLastWord || trimmed,
    rhyme: trimmed,
  };
}

function needsHeuristicFix(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const words = trimmed.split(/\s+/);
  const normalized = words.map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
  const uniqueWords = new Set(normalized.filter(Boolean));
  const syllables = countSyllables(trimmed);

  return (
    words.length <= 2 ||
    words.length >= 12 ||
    uniqueWords.size <= Math.max(1, normalized.length - 2) ||
    syllables <= 4 ||
    syllables >= 18
  );
}

function createFallbackLines(text: string): EditableLine[] {
  return text.split('\n').slice(0, MAX_LINES).map((line, index) => {
    const needsFix = needsHeuristicFix(line);
    return {
      id: `line-${index}`,
      original: line,
      needsFix,
      alternatives: needsFix ? fallbackAlternatives(line) : null,
      selectedOption: null,
    };
  });
}

function normalizeAnalysisResponse(parsed: unknown, originalText: string): AnalysisResult {
  const originalLines = originalText.split('\n').slice(0, MAX_LINES);
  const payload = parsed as { lines?: Array<Record<string, unknown>> };

  if (!payload.lines || !Array.isArray(payload.lines)) {
    return {
      lines: createFallbackLines(originalText),
      usedFallback: true,
      fallbackMessage: 'AI nevrátila validní strukturu, proto jsem použil bezpečný fallback.',
    };
  }

  const normalizedLines = originalLines.map((fallbackOriginal, index) => {
    const source = payload.lines?.[index];
    const original = fallbackOriginal;
    const aiNeedsFix = Boolean(source?.needs_fix);
    const heuristicNeedsFix = needsHeuristicFix(original);
    const alternatives = normalizeAlternatives(source?.alternatives, original);
    const needsFix = aiNeedsFix || (heuristicNeedsFix && Boolean(original.trim()));

    return {
      id: `line-${index}`,
      original,
      needsFix,
      alternatives: needsFix ? (alternatives || fallbackAlternatives(original)) : null,
      selectedOption: null,
    };
  });

  const problematicCount = normalizedLines.filter((line) => line.needsFix).length;
  if (problematicCount === 0) {
    const forcedLines = normalizedLines.map((line) => {
      if (!line.original.trim() || !needsHeuristicFix(line.original)) {
        return line;
      }

      return {
        ...line,
        needsFix: true,
        alternatives: line.alternatives || fallbackAlternatives(line.original),
      };
    });

    if (forcedLines.some((line) => line.needsFix)) {
      return {
        lines: forcedLines,
        usedFallback: true,
        fallbackMessage: 'AI označila vše jako bez problému, proto jsem zapnul základní heuristickou kontrolu.',
      };
    }
  }

  return { lines: normalizedLines };
}

export function assembleLyrics(lines: EditableLine[]): string {
  return lines.map((line) => {
    if (!line.alternatives || !line.selectedOption) {
      return line.original;
    }
    return line.alternatives[line.selectedOption];
  }).join('\n');
}

export async function analyzeLyrics(text: string, options: AnalyzeOptions): Promise<AnalysisResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { lines: [] };
  }

  const originalLineCount = text.split('\n').length;
  const limitedText = text.split('\n').slice(0, MAX_LINES).join('\n');
  const wasTruncated = originalLineCount > MAX_LINES;
  const cached = semanticCache.get(limitedText, options.style, options.energy);
  if (cached) {
    if (!wasTruncated) {
      return cached;
    }

    return {
      ...cached,
      usedFallback: true,
      fallbackMessage: `Text je delší než ${MAX_LINES} řádků, proto jsem zpracoval jen prvních ${MAX_LINES}.`,
    };
  }

  try {
    const prompt = buildAnalyzePrompt(limitedText, options);
    const responseText = await callAI(prompt, getAnalyzeSystemPrompt());
    const parsed = parseJSONResponse(responseText);
    const result = normalizeAnalysisResponse(parsed, limitedText);
    const finalResult = wasTruncated
      ? {
          ...result,
          usedFallback: true,
          fallbackMessage: `Text je delší než ${MAX_LINES} řádků, proto jsem zpracoval jen prvních ${MAX_LINES}.`,
        }
      : result;
    semanticCache.set(limitedText, options.style, options.energy, result);
    return finalResult;
  } catch (error) {
    console.error('Analysis failed, using fallback:', error);
    return {
      lines: createFallbackLines(limitedText),
      usedFallback: true,
      fallbackMessage: wasTruncated
        ? `AI odpověď selhala a text je delší než ${MAX_LINES} řádků, proto jsem použil lokální fallback jen pro prvních ${MAX_LINES} řádků.`
        : 'AI odpověď selhala, proto jsem použil lokální fallback.',
    };
  }
}

export async function regenerateLine(
  allLines: EditableLine[],
  lineId: string,
  options: AnalyzeOptions,
): Promise<LineAlternatives> {
  const line = allLines.find((entry) => entry.id === lineId);
  if (!line) {
    throw new Error('Řádek nebyl nalezen.');
  }

  const fullText = assembleLyrics(allLines);

  try {
    const responseText = await callAI(
      buildRegeneratePrompt(fullText, line, options),
      getRegenerateSystemPrompt(),
    );

    const parsed = parseJSONResponse(responseText) as { alternatives?: unknown };
    return normalizeAlternatives(parsed.alternatives, line.original) || fallbackAlternatives(line.original);
  } catch (error) {
    console.error('Regenerate failed, using fallback:', error);
    return fallbackAlternatives(line.original);
  }
}

export const __testing = {
  normalizeAlternatives,
  normalizeAnalysisResponse,
  computeRhymeDensity,
  scoreLineStructure,
  preservesKeywords,
};
