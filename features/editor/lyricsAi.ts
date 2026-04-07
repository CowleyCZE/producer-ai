import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  AnalysisResult,
  DEFAULT_MODELS,
  EditableLine,
  EnergyOption,
  LineSelection,
  LineAlternatives,
  ModelProvider,
  StyleOption,
} from './editorTypes';
import {
  ANALYZE_INSTRUCTION_BLOCK,
  ANALYZE_SYSTEM_PROMPT,
  REGENERATE_SYSTEM_PROMPT,
  getAnalyzeResponseContract,
} from './promptTemplates';

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const MAX_LINES = 30;
const MAX_LINE_LENGTH_DELTA = 0.3;
const MAX_SYLLABLE_DELTA = 2;
const MIN_VARIANT_LENGTH = 3;
const KEYWORDS_TO_PRESERVE = ['panelák', 'makám', 'děti'];
const GEMINI_ENV_API_KEY_DISABLED_KEY = 'gemini_env_api_key_disabled';
const NETWORK_TIMEOUT_MS = 12000;
const OLLAMA_REQUEST_TIMEOUT_MS = 120000;
const OLLAMA_PROBE_TIMEOUT_MS = 45000;

export const AI_ANALYZE_LINE_LIMIT = MAX_LINES;

interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

interface AnalyzeOptions {
  style: StyleOption;
  energy: EnergyOption;
}

type OpenAiCompatibleProvider = ModelProvider.OPENAI | ModelProvider.OPENROUTER | ModelProvider.GROQ;

interface RawAnalysisLine {
  line_index?: unknown;
  original?: unknown;
  needs_fix?: unknown;
  alternatives?: unknown;
}

interface OllamaModelTag {
  name?: string;
  details?: {
    family?: string;
    families?: string[];
  };
}

const CONNECTION_PROBE_PROMPT = 'Odpověz přesně textem OK.';
const CONNECTION_PROBE_SYSTEM_PROMPT = 'Jsi test dostupnosti AI modelu. Odpovídej stručně a bez formátování.';
const OLLAMA_EMBEDDING_NAME_HINTS = ['embed', 'embedding', 'minilm', 'bge', 'e5'];
const OLLAMA_NON_GENERATIVE_FAMILIES = new Set(['bert']);

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
let genAIKey: string | null = null;
const volatileApiKeyCache = new Map<ModelProvider, string>();

const API_KEY_STORAGE_KEYS: Partial<Record<ModelProvider, string>> = {
  [ModelProvider.GEMINI]: 'gemini_api_key',
  [ModelProvider.OPENAI]: 'openai_api_key',
  [ModelProvider.OPENROUTER]: 'openrouter_api_key',
  [ModelProvider.GROQ]: 'groq_api_key',
};

const MODEL_STORAGE_KEYS: Partial<Record<ModelProvider, string>> = {
  [ModelProvider.GEMINI]: 'gemini_model',
  [ModelProvider.OPENAI]: 'openai_model',
  [ModelProvider.OPENROUTER]: 'openrouter_model',
  [ModelProvider.GROQ]: 'groq_model',
  [ModelProvider.OLLAMA]: 'ollama_model',
};

const BASE_URL_STORAGE_KEYS: Partial<Record<ModelProvider, string>> = {
  [ModelProvider.OLLAMA]: 'ollama_base_url',
};

const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<ModelProvider, string>> = {
  [ModelProvider.OPENAI]: OPENAI_BASE_URL,
  [ModelProvider.OPENROUTER]: OPENROUTER_BASE_URL,
  [ModelProvider.GROQ]: GROQ_BASE_URL,
};
const DEV_PROXY_BASE_URLS: Partial<Record<ModelProvider, string>> = {
  [ModelProvider.OPENAI]: '/api/openai/v1',
  [ModelProvider.OPENROUTER]: '/api/openrouter/api/v1',
  [ModelProvider.GROQ]: '/api/groq/openai/v1',
  [ModelProvider.OLLAMA]: '/api/ollama',
};

const REMOTE_PROVIDER_SET = new Set<ModelProvider>([
  ModelProvider.GEMINI,
  ModelProvider.OPENAI,
  ModelProvider.OPENROUTER,
  ModelProvider.GROQ,
]);
const SUPPORTED_PROVIDER_SET = new Set<ModelProvider>([
  ModelProvider.GEMINI,
  ModelProvider.OPENAI,
  ModelProvider.OPENROUTER,
  ModelProvider.GROQ,
  ModelProvider.OLLAMA,
]);

export type ApiKeySource = 'session' | 'env' | null;

function isKnownProvider(value: string | null): value is ModelProvider {
  return SUPPORTED_PROVIDER_SET.has(value as ModelProvider);
}

function getApiKeyStorageKey(provider: ModelProvider): string | null {
  return API_KEY_STORAGE_KEYS[provider] || null;
}

function getModelStorageKey(provider: ModelProvider): string | null {
  return MODEL_STORAGE_KEYS[provider] || null;
}

function getProviderDefaultModel(provider: ModelProvider): string {
  return DEFAULT_MODELS[provider]?.modelName || GEMINI_MODEL;
}

function getProviderDefaultBaseUrl(provider: ModelProvider): string {
  return DEFAULT_MODELS[provider]?.baseUrl || '';
}

function getBaseUrlStorageKey(provider: ModelProvider): string | null {
  return BASE_URL_STORAGE_KEYS[provider] || null;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  return `http://${withoutTrailingSlash}`;
}

function shouldUseDevProxy(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test';
}

function isLocalOllamaBaseUrl(baseUrl: string): boolean {
  const normalized = normalizeBaseUrl(baseUrl);
  return (
    normalized === 'http://localhost:11434'
    || normalized === 'http://127.0.0.1:11434'
  );
}

function getOllamaRequestBaseUrl(baseUrl: string): string {
  if (shouldUseDevProxy() && isLocalOllamaBaseUrl(baseUrl)) {
    return DEV_PROXY_BASE_URLS[ModelProvider.OLLAMA] || '/api/ollama';
  }

  return normalizeBaseUrl(baseUrl);
}

function getOpenAiCompatibleRequestBaseUrl(provider: OpenAiCompatibleProvider): string {
  if (shouldUseDevProxy()) {
    return DEV_PROXY_BASE_URLS[provider] || OPENAI_COMPATIBLE_BASE_URLS[provider] || '';
  }

  return OPENAI_COMPATIBLE_BASE_URLS[provider] || '';
}

function getSessionStorageOrNull(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function getLocalStorageOrNull(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeLocalStorageGetItem(key: string): string | null {
  try {
    return getLocalStorageOrNull()?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeLocalStorageSetItem(key: string, value: string): void {
  try {
    getLocalStorageOrNull()?.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function safeLocalStorageRemoveItem(key: string): void {
  try {
    getLocalStorageOrNull()?.removeItem(key);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function safeSessionStorageGetItem(key: string): string | null {
  try {
    return getSessionStorageOrNull()?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeSessionStorageSetItem(key: string, value: string): void {
  try {
    getSessionStorageOrNull()?.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function safeSessionStorageRemoveItem(key: string): void {
  try {
    getSessionStorageOrNull()?.removeItem(key);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function isGeminiEnvApiKeyDisabled(): boolean {
  return safeLocalStorageGetItem(GEMINI_ENV_API_KEY_DISABLED_KEY) === '1';
}

function setGeminiEnvApiKeyDisabled(disabled: boolean): void {
  if (disabled) {
    safeLocalStorageSetItem(GEMINI_ENV_API_KEY_DISABLED_KEY, '1');
    return;
  }

  safeLocalStorageRemoveItem(GEMINI_ENV_API_KEY_DISABLED_KEY);
}

export function getProviderApiKey(provider: ModelProvider): string | null {
  const cached = volatileApiKeyCache.get(provider);
  if (cached) {
    return cached;
  }

  const key = getApiKeyStorageKey(provider);
  if (!key) {
    return null;
  }

  const sessionValue = safeSessionStorageGetItem(key);
  if (sessionValue) {
    volatileApiKeyCache.set(provider, sessionValue);
    return sessionValue;
  }

  if (
    provider === ModelProvider.GEMINI
    && import.meta.env.VITE_GEMINI_API_KEY
    && !isGeminiEnvApiKeyDisabled()
  ) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }

  return null;
}

export function getProviderApiKeySource(provider: ModelProvider): ApiKeySource {
  if (volatileApiKeyCache.get(provider)) {
    return 'session';
  }

  const key = getApiKeyStorageKey(provider);
  if (!key) {
    return null;
  }

  const sessionValue = safeSessionStorageGetItem(key);
  if (sessionValue) {
    volatileApiKeyCache.set(provider, sessionValue);
    return 'session';
  }

  if (
    provider === ModelProvider.GEMINI
    && import.meta.env.VITE_GEMINI_API_KEY
    && !isGeminiEnvApiKeyDisabled()
  ) {
    return 'env';
  }

  return null;
}

export function setProviderApiKey(provider: ModelProvider, apiKey: string): void {
  const key = getApiKeyStorageKey(provider);
  if (!key) {
    return;
  }

  volatileApiKeyCache.set(provider, apiKey);
  safeSessionStorageSetItem(key, apiKey);
  if (provider === ModelProvider.GEMINI) {
    setGeminiEnvApiKeyDisabled(false);
    genAI = new GoogleGenerativeAI(apiKey);
    genAIKey = apiKey;
  }
}

export function clearProviderApiKey(provider: ModelProvider): void {
  const key = getApiKeyStorageKey(provider);
  if (!key) {
    return;
  }

  volatileApiKeyCache.delete(provider);
  safeSessionStorageRemoveItem(key);
  if (provider === ModelProvider.GEMINI) {
    setGeminiEnvApiKeyDisabled(true);
    genAI = null;
    genAIKey = null;
  }
}

function getGenAI(): GoogleGenerativeAI {
  const apiKey = getProviderApiKey(ModelProvider.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  if (!genAI || genAIKey !== apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    genAIKey = apiKey;
  }

  return genAI;
}

export function setApiKey(apiKey: string): void {
  setProviderApiKey(ModelProvider.GEMINI, apiKey);
}

export function hasApiKey(): boolean {
  return REMOTE_PROVIDER_SET.has(getProvider()) && Boolean(getProviderApiKey(getProvider()));
}

export function getProvider(): ModelProvider {
  const saved = safeLocalStorageGetItem('ai_provider');
  if (isKnownProvider(saved)) {
    return saved;
  }
  return ModelProvider.GEMINI;
}

export function setProvider(provider: ModelProvider): void {
  if (!SUPPORTED_PROVIDER_SET.has(provider)) {
    return;
  }
  safeLocalStorageSetItem('ai_provider', provider);
}

export function getModelForProvider(provider: ModelProvider): string {
  const storageKey = getModelStorageKey(provider);
  if (!storageKey) {
    return getProviderDefaultModel(provider);
  }

  return safeLocalStorageGetItem(storageKey) || getProviderDefaultModel(provider);
}

export function setModelForProvider(provider: ModelProvider, modelName: string): void {
  const storageKey = getModelStorageKey(provider);
  if (!storageKey) {
    return;
  }

  safeLocalStorageSetItem(storageKey, modelName);
}

export function getBaseUrlForProvider(provider: ModelProvider): string {
  const storageKey = getBaseUrlStorageKey(provider);
  if (!storageKey) {
    return getProviderDefaultBaseUrl(provider);
  }

  return normalizeBaseUrl(safeLocalStorageGetItem(storageKey) || getProviderDefaultBaseUrl(provider));
}

export function setBaseUrlForProvider(provider: ModelProvider, baseUrl: string): void {
  const storageKey = getBaseUrlStorageKey(provider);
  if (!storageKey) {
    return;
  }

  const valueToStore = normalizeBaseUrl(baseUrl) || getProviderDefaultBaseUrl(provider);
  safeLocalStorageSetItem(storageKey, valueToStore);
}

export function getOllamaModel(): string {
  return getModelForProvider(ModelProvider.OLLAMA);
}

export function setOllamaModel(modelName: string): void {
  setModelForProvider(ModelProvider.OLLAMA, modelName);
}

export function getOllamaBaseUrl(): string {
  return getBaseUrlForProvider(ModelProvider.OLLAMA);
}

export function setOllamaBaseUrl(baseUrl: string): void {
  setBaseUrlForProvider(ModelProvider.OLLAMA, baseUrl);
}

export function isOllamaConnected(): boolean {
  return safeLocalStorageGetItem('ai_provider') === ModelProvider.OLLAMA;
}

export async function testApiKey(): Promise<boolean> {
  const provider = getProvider();
  if (provider === ModelProvider.OLLAMA) {
    return testOllama(getModelForProvider(ModelProvider.OLLAMA), getOllamaBaseUrl());
  }

  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return false;
  }

  return testProviderConnection(provider, { apiKey, modelName: getModelForProvider(provider) });
}

export async function testGeminiKey(apiKey: string, modelName = getModelForProvider(ModelProvider.GEMINI)): Promise<boolean> {
  try {
    const responseText = await callGeminiWithConfig(
      apiKey,
      modelName || GEMINI_MODEL,
      CONNECTION_PROBE_PROMPT,
      CONNECTION_PROBE_SYSTEM_PROMPT,
      {
        temperature: 0.2,
        maxOutputTokens: 32,
      },
    );
    return responseText.trim().toUpperCase().includes('OK');
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}

export async function getAvailableOllamaModels(baseUrl = getOllamaBaseUrl()): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(`${getOllamaRequestBaseUrl(baseUrl)}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.models || [])
      .filter((model: OllamaModelTag) => isLikelyGenerativeOllamaModel(model))
      .map((model: OllamaModelTag) => model?.name?.trim())
      .filter((name: string | undefined): name is string => Boolean(name));
  } catch (error) {
    console.error('Ollama test failed:', error);
    return [];
  }
}

function isLikelyGenerativeOllamaModel(model: OllamaModelTag): boolean {
  const name = model.name?.trim().toLowerCase() || '';
  const families = [
    model.details?.family,
    ...(model.details?.families || []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  if (families.some((family) => OLLAMA_NON_GENERATIVE_FAMILIES.has(family))) {
    return false;
  }

  if (OLLAMA_EMBEDDING_NAME_HINTS.some((hint) => name.includes(hint))) {
    return false;
  }

  return Boolean(name);
}

function pickDefaultOllamaModel(models: string[]): string | null {
  if (!models.length) {
    return null;
  }

  return (
    models.find((model) => /qwen/i.test(model))
    || models.find((model) => /(llama|mistral|gemma|phi|deepseek|mixtral)/i.test(model))
    || models[0]
  );
}

export async function testOllama(modelName = getOllamaModel(), baseUrl = getOllamaBaseUrl()): Promise<boolean> {
  const models = await getAvailableOllamaModels(baseUrl);
  if (!models.length) {
    return false;
  }

  const requestedModel = modelName.trim();
  const selectedModel = (requestedModel && models.includes(requestedModel) ? requestedModel : pickDefaultOllamaModel(models));
  if (!selectedModel) {
    return false;
  }

  try {
    const responseText = await callOllamaWithConfig(
      selectedModel,
      baseUrl,
      CONNECTION_PROBE_PROMPT,
      CONNECTION_PROBE_SYSTEM_PROMPT,
      {
        temperature: 0.2,
        numPredict: 8,
        timeoutMs: OLLAMA_PROBE_TIMEOUT_MS,
      },
    );
    return responseText.trim().toUpperCase().includes('OK');
  } catch (error) {
    console.error('Ollama probe failed:', error);
    return false;
  }
}

async function testOpenAiCompatibleProvider(
  provider: OpenAiCompatibleProvider,
  apiKey: string,
  modelName: string,
): Promise<boolean> {
  try {
    const responseText = await callOpenAiCompatibleWithConfig(
      provider,
      apiKey,
      modelName,
      CONNECTION_PROBE_PROMPT,
      CONNECTION_PROBE_SYSTEM_PROMPT,
      {
        temperature: 0.2,
        maxTokens: 32,
      },
    );
    return responseText.trim().toUpperCase().includes('OK');
  } catch (error) {
    console.error('OpenAI-compatible provider test failed:', error);
    return false;
  }
}

export async function testProviderConnection(
  provider: ModelProvider,
  options: { apiKey?: string; modelName?: string; baseUrl?: string } = {},
): Promise<boolean> {
  const modelName = options.modelName?.trim() || getModelForProvider(provider);

  switch (provider) {
    case ModelProvider.GEMINI:
      return testGeminiKey(options.apiKey?.trim() || '', modelName);
    case ModelProvider.OPENAI:
    case ModelProvider.OPENROUTER:
    case ModelProvider.GROQ:
      if (!options.apiKey?.trim()) {
        return false;
      }
      return testOpenAiCompatibleProvider(provider, options.apiKey.trim(), modelName);
    case ModelProvider.OLLAMA:
      return testOllama(modelName, options.baseUrl?.trim() || getOllamaBaseUrl());
    default:
      return false;
  }
}

function parseJSONResponse(responseText: string): unknown {
  let jsonText = responseText.trim();
  const fencedMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    jsonText = fencedMatch[1].trim();
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    const extracted = extractLikelyJsonBlock(jsonText);
    if (!extracted) {
      throw new Error('Response does not contain parseable JSON');
    }

    return JSON.parse(extracted);
  }
}

function extractLikelyJsonBlock(input: string): string | null {
  const startIndex = input.search(/[\[{]/);
  if (startIndex < 0) {
    return null;
  }

  const opening = input[startIndex];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(startIndex, index + 1).trim();
      }
    }
  }

  return null;
}

function getAnalyzeSystemPrompt(): string {
  return ANALYZE_SYSTEM_PROMPT;
}

function getRegenerateSystemPrompt(): string {
  return REGENERATE_SYSTEM_PROMPT;
}

function buildLinePayload(text: string): string {
  const lines = text.split('\n').slice(0, MAX_LINES).map((original, line_index) => ({
    line_index,
    original,
  }));

  return JSON.stringify(lines, null, 2);
}

function buildAnalyzePrompt(text: string, options: AnalyzeOptions): string {
  const lineCount = text.split('\n').slice(0, MAX_LINES).length;

  return `Řádky k analýze:
${buildLinePayload(text)}

${getAnalyzeResponseContract(lineCount)}

Styl:
${options.style}

Energie:
${options.energy}

${ANALYZE_INSTRUCTION_BLOCK}`;
}

function buildRegeneratePrompt(text: string, line: EditableLine, options: AnalyzeOptions): string {
  return `Celý text:
${text}

Řádek k opravě:
${JSON.stringify({
  line_index: Number.parseInt(line.id.replace('line-', ''), 10) || 0,
  original: line.original,
}, null, 2)}

Styl:
${options.style}

Energie:
${options.energy}`;
}

async function callOllamaWithConfig(
  modelName: string,
  baseUrl: string,
  prompt: string,
  systemPrompt: string,
  options: { temperature?: number; numPredict?: number; timeoutMs?: number } = {},
): Promise<string> {
  const response = await fetchWithTimeout(`${getOllamaRequestBaseUrl(baseUrl)}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt: `${systemPrompt}\n\n${prompt}`,
      stream: false,
      format: 'json',
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.numPredict ?? 2048,
      },
    }),
  }, options.timeoutMs ?? OLLAMA_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

async function callOllama(prompt: string, systemPrompt: string): Promise<string> {
  return callOllamaWithConfig(getOllamaModel(), getOllamaBaseUrl(), prompt, systemPrompt);
}

function extractOpenAiCompatibleText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

async function callOpenAiCompatibleWithConfig(
  provider: OpenAiCompatibleProvider,
  apiKey: string,
  modelName: string,
  prompt: string,
  systemPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error(`${provider} API key not configured`);
  }

  const baseUrl = OPENAI_COMPATIBLE_BASE_URLS[provider];
  const requestBaseUrl = getOpenAiCompatibleRequestBaseUrl(provider);
  if (!requestBaseUrl) {
    throw new Error(`Missing base URL for provider: ${provider}`);
  }

  const response = await fetchWithTimeout(`${requestBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} API error: ${response.status}`);
  }

  const data = await response.json();
  const text = extractOpenAiCompatibleText(data?.choices?.[0]?.message?.content);
  if (!text) {
    throw new Error(`No text in ${provider} response`);
  }

  return text;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = NETWORK_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiCompatible(
  provider: OpenAiCompatibleProvider,
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`${provider} API key not configured`);
  }

  return callOpenAiCompatibleWithConfig(
    provider,
    apiKey,
    getModelForProvider(provider),
    prompt,
    systemPrompt,
  );
}

async function callGeminiWithConfig(
  apiKey: string,
  modelName: string,
  prompt: string,
  systemPrompt: string,
  generationConfig: Partial<typeof GENERATION_CONFIG> = {},
): Promise<string> {
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: modelName || GEMINI_MODEL,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      ...GENERATION_CONFIG,
      ...generationConfig,
    },
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

export async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = getProviderApiKey(ModelProvider.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  return callGeminiWithConfig(
    apiKey,
    getModelForProvider(ModelProvider.GEMINI) || GEMINI_MODEL,
    prompt,
    systemPrompt,
  );
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const provider = getProvider();

  if (provider === ModelProvider.OLLAMA) {
    return callOllama(prompt, systemPrompt);
  }

  if (
    provider === ModelProvider.OPENAI ||
    provider === ModelProvider.OPENROUTER ||
    provider === ModelProvider.GROQ
  ) {
    return callOpenAiCompatible(provider, prompt, systemPrompt);
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

function isValidLineIndex(value: unknown, lineCount: number): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) < lineCount;
}

function resolveAnalysisPayloadLines(
  payloadLines: RawAnalysisLine[],
  originalLines: string[],
): { resolvedLines: Array<RawAnalysisLine | null>; usedRecovery: boolean } {
  const resolvedLines: Array<RawAnalysisLine | null> = Array.from({ length: originalLines.length }, () => null);
  const usedPayloadIndexes = new Set<number>();
  let usedRecovery = payloadLines.length !== originalLines.length;

  payloadLines.forEach((source, payloadIndex) => {
    if (!isValidLineIndex(source.line_index, originalLines.length)) {
      if (source.line_index !== undefined) {
        usedRecovery = true;
      }
      return;
    }

    const lineIndex = Number(source.line_index);
    if (resolvedLines[lineIndex]) {
      usedRecovery = true;
      return;
    }

    resolvedLines[lineIndex] = source;
    usedPayloadIndexes.add(payloadIndex);
  });

  const byOriginal = new Map<string, Array<{ payloadIndex: number; source: RawAnalysisLine }>>();
  payloadLines.forEach((source, payloadIndex) => {
    if (usedPayloadIndexes.has(payloadIndex)) {
      return;
    }

    const normalizedOriginal = typeof source.original === 'string' ? normalizeCompareText(source.original) : '';
    if (!normalizedOriginal) {
      return;
    }

    const existingQueue = byOriginal.get(normalizedOriginal) || [];
    existingQueue.push({ payloadIndex, source });
    byOriginal.set(normalizedOriginal, existingQueue);
  });

  originalLines.forEach((original, index) => {
    if (resolvedLines[index]) {
      return;
    }

    const queue = byOriginal.get(normalizeCompareText(original));
    const nextMatch = queue?.shift();
    if (!nextMatch) {
      return;
    }

    resolvedLines[index] = nextMatch.source;
    usedPayloadIndexes.add(nextMatch.payloadIndex);
    usedRecovery = true;
  });

  payloadLines.forEach((source, payloadIndex) => {
    if (usedPayloadIndexes.has(payloadIndex) || payloadIndex >= originalLines.length) {
      if (payloadIndex >= originalLines.length) {
        usedRecovery = true;
      }
      return;
    }

    if (!resolvedLines[payloadIndex]) {
      resolvedLines[payloadIndex] = source;
      usedPayloadIndexes.add(payloadIndex);
      usedRecovery = true;
    }
  });

  return { resolvedLines, usedRecovery };
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
  const originalSyllables = countSyllables(original);
  const distinctNormalizedValues = new Set(allValues.map((value) => normalizeCompareText(value)).filter(Boolean));
  const hasEmptyValue = allValues.some((value) => !value);
  const tooShortValue = allValues.some((value) => value.length < MIN_VARIANT_LENGTH);
  const exceedsDelta = allValues.some((value) => Math.abs(value.length - originalLength) / originalLength > MAX_LINE_LENGTH_DELTA);
  const exceedsSyllableDelta = allValues.some((value) => Math.abs(countSyllables(value) - originalSyllables) > MAX_SYLLABLE_DELTA);
  const matchesOriginalTooClosely = allValues.some((value) => normalizeCompareText(value) === normalizedOriginal);
  const hasDuplicateAlternatives = distinctNormalizedValues.size !== allValues.length;

  if (
    hasEmptyValue
    || tooShortValue
    || exceedsDelta
    || exceedsSyllableDelta
    || matchesOriginalTooClosely
    || hasDuplicateAlternatives
  ) {
    return null;
  }

  if (!preservesKeywords(original, allValues)) {
    logHeuristic('keyword', { original, allValues });
    return null;
  }

  return normalized;
}

function validateConnectionProbeResponse(parsed: unknown, originalText: string): boolean {
  const originalLines = originalText.split('\n');
  const payload = parsed as { lines?: RawAnalysisLine[] };
  if (!payload.lines || !Array.isArray(payload.lines) || payload.lines.length !== originalLines.length) {
    return false;
  }

  const seenIndexes = new Set<number>();

  return payload.lines.every((source) => {
    if (!source || typeof source !== 'object') {
      return false;
    }

    if (!isValidLineIndex(source.line_index, originalLines.length)) {
      return false;
    }

    const lineIndex = Number(source.line_index);
    if (seenIndexes.has(lineIndex)) {
      return false;
    }
    seenIndexes.add(lineIndex);

    if (source.original !== originalLines[lineIndex] || typeof source.needs_fix !== 'boolean') {
      return false;
    }

    if (!source.needs_fix) {
      return source.alternatives === null;
    }

    return Boolean(normalizeAlternatives(source.alternatives, source.original));
  });
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
  const selectedText = resolveLineText(line);
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

function fallbackAlternatives(_original: string): null {
  return null;
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
      alternatives: null,
      selectedOption: null,
    };
  });
}

function normalizeAnalysisResponse(parsed: unknown, originalText: string): AnalysisResult {
  const originalLines = originalText.split('\n').slice(0, MAX_LINES);
  const payload = parsed as { lines?: RawAnalysisLine[] };

  if (!payload.lines || !Array.isArray(payload.lines)) {
    return {
      lines: createFallbackLines(originalText),
      usedFallback: true,
      fallbackMessage: 'AI nevrátila validní strukturu, proto jsem použil bezpečný fallback.',
    };
  }

  const payloadLines = payload.lines.filter((line): line is RawAnalysisLine => Boolean(line) && typeof line === 'object');
  const { resolvedLines: sourceLines, usedRecovery } = resolveAnalysisPayloadLines(payloadLines, originalLines);

  const normalizedLines = originalLines.map((fallbackOriginal, index) => {
    const source = sourceLines[index];
    const original = fallbackOriginal;
    const aiNeedsFix = Boolean(source?.needs_fix);
    const heuristicNeedsFix = needsHeuristicFix(original);
    const alternatives = normalizeAlternatives(source?.alternatives, original);
    const needsFix = aiNeedsFix || (heuristicNeedsFix && Boolean(original.trim()));

    return {
      id: `line-${index}`,
      original,
      needsFix,
      alternatives: needsFix ? alternatives : null,
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
        alternatives: line.alternatives,
      };
    });

    if (forcedLines.some((line) => line.needsFix)) {
      return {
        lines: forcedLines,
        usedFallback: true,
        fallbackMessage: usedRecovery
          ? 'AI nevrátila kompletní mapování řádků a zároveň neoznačila žádný problém, proto jsem výsledek dorovnal podle indexů/originálů a zapnul heuristickou kontrolu.'
          : 'AI označila vše jako bez problému, proto jsem zapnul základní heuristickou kontrolu.',
      };
    }
  }

  if (usedRecovery) {
    return {
      lines: normalizedLines,
      usedFallback: true,
      fallbackMessage: 'AI nevrátila kompletní mapování řádků, proto jsem odpověď srovnal podle line_index/originálů a zbytek ponechal bez AI úprav.',
    };
  }

  return { lines: normalizedLines };
}

export function assembleLyrics(lines: EditableLine[]): string {
  return lines.map((line) => resolveLineText(line)).join('\n');
}

export function resolveLineText(line: EditableLine): string {
  if (!line.selectedOption || line.selectedOption === 'original' || !line.alternatives) {
    return line.original;
  }

  return line.alternatives[line.selectedOption];
}

export function isLineResolved(line: EditableLine): boolean {
  return !line.needsFix || line.selectedOption !== null;
}

export function isAlternativeSelection(selection: LineSelection | null): selection is keyof LineAlternatives {
  return selection === 'balanced' || selection === 'flow' || selection === 'rhyme';
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
): Promise<LineAlternatives | null> {
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
    return normalizeAlternatives(parsed.alternatives, line.original);
  } catch (error) {
    console.error('Regenerate failed, using fallback:', error);
    return null;
  }
}

export const __testing = {
  buildAnalyzePrompt,
  buildRegeneratePrompt,
  getAnalyzeSystemPrompt,
  getRegenerateSystemPrompt,
  normalizeAlternatives,
  normalizeAnalysisResponse,
  computeRhymeDensity,
  scoreLineStructure,
  preservesKeywords,
  validateConnectionProbeResponse,
  parseJSONResponse,
};
