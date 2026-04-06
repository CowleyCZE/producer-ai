import React, { useEffect, useState } from 'react';
import { DEFAULT_MODELS, ModelProvider } from '../editor/editorTypes';
import {
  getAvailableOllamaModels,
  getModelForProvider,
  getProvider,
  getProviderApiKey,
  setModelForProvider,
  setProvider,
  setProviderApiKey,
  testProviderConnection,
} from '../editor/lyricsAi';
import { useToast } from '../../shared/toast/ToastContext';

type ModelStatus = 'not_loaded' | 'loading' | 'loaded' | 'error' | 'testing' | 'ready';

interface AiProviderPanelProps {
  onStatusChange?: (status: ModelStatus, message: string) => void;
}

interface ProviderMeta {
  provider: ModelProvider;
  label: string;
  description: string;
  apiKeyLabel?: string;
  apiKeyUrl?: string;
  connectLabel: string;
  modelLabel: string;
  modelHelp: string;
}

const PROVIDER_OPTIONS: ProviderMeta[] = [
  {
    provider: ModelProvider.GEMINI,
    label: 'Google Gemini',
    description: 'Google API key + Gemini model',
    apiKeyLabel: 'Gemini API key',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    connectLabel: 'Připojit Gemini',
    modelLabel: 'Gemini model',
    modelHelp: 'Výchozí je rychlý model pro jedno-request analýzu textu.',
  },
  {
    provider: ModelProvider.OPENAI,
    label: 'OpenAI',
    description: 'OpenAI API key + textový model',
    apiKeyLabel: 'OpenAI API key',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    connectLabel: 'Připojit OpenAI',
    modelLabel: 'OpenAI model',
    modelHelp: 'Můžeš ponechat default nebo zadat vlastní model dostupný pod svým účtem.',
  },
  {
    provider: ModelProvider.OPENROUTER,
    label: 'OpenRouter',
    description: 'OpenRouter API key + routed model',
    apiKeyLabel: 'OpenRouter API key',
    apiKeyUrl: 'https://openrouter.ai/keys',
    connectLabel: 'Připojit OpenRouter',
    modelLabel: 'OpenRouter model',
    modelHelp: 'Použij název ve formátu provider/model, například openai/gpt-4.1-mini.',
  },
  {
    provider: ModelProvider.GROQ,
    label: 'Groq',
    description: 'Groq API key + rychlý open model',
    apiKeyLabel: 'Groq API key',
    apiKeyUrl: 'https://console.groq.com/keys',
    connectLabel: 'Připojit Groq',
    modelLabel: 'Groq model',
    modelHelp: 'Groq běží přes OpenAI-compatible endpoint, stačí klíč a model.',
  },
  {
    provider: ModelProvider.OLLAMA,
    label: 'Lokální Ollama',
    description: 'Modely dostupné přímo v telefonu',
    connectLabel: 'Připojit k Ollama',
    modelLabel: 'Stažený Ollama model',
    modelHelp: 'Po přepnutí se načte seznam modelů, které má lokální Ollama na zařízení.',
  },
];

const REMOTE_PROVIDERS = new Set<ModelProvider>([
  ModelProvider.GEMINI,
  ModelProvider.OPENAI,
  ModelProvider.OPENROUTER,
  ModelProvider.GROQ,
]);

const AiProviderPanel: React.FC<AiProviderPanelProps> = ({ onStatusChange }) => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('not_loaded');
  const [statusMessage, setStatusMessage] = useState<string>('Nastavení AI modelu');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>(getProvider());
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [modelInput, setModelInput] = useState<string>(getModelForProvider(getProvider()));
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);
  const { success, error: showError } = useToast();

  const activeProviderMeta = PROVIDER_OPTIONS.find((option) => option.provider === selectedProvider) || PROVIDER_OPTIONS[0];

  const updateStatus = (status: ModelStatus, message: string) => {
    setModelStatus(status);
    setStatusMessage(message);
    onStatusChange?.(status, message);
  };

  const hydrateProviderFields = (provider: ModelProvider) => {
    setApiKeyInput(getProviderApiKey(provider) || '');
    setModelInput(getModelForProvider(provider));
  };

  const loadOllamaModels = async (preferStoredModel = true): Promise<string[]> => {
    setIsLoadingOllamaModels(true);

    try {
      const models = Array.from(new Set(await getAvailableOllamaModels()));
      setOllamaModels(models);

      if (models.length > 0) {
        const currentModel = modelInput.trim();
        const storedModel = getModelForProvider(ModelProvider.OLLAMA);
        const nextModel = (
          (currentModel && models.includes(currentModel) && currentModel) ||
          (preferStoredModel && models.includes(storedModel) ? storedModel : '') ||
          models[0]
        );
        setModelInput(nextModel);
      }

      return models;
    } finally {
      setIsLoadingOllamaModels(false);
    }
  };

  useEffect(() => {
    hydrateProviderFields(selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedProvider !== ModelProvider.OLLAMA) {
      return;
    }

    void loadOllamaModels();
  }, [selectedProvider]);

  useEffect(() => {
    const initialize = async () => {
      const savedProvider = getProvider();
      setSelectedProvider(savedProvider);
      hydrateProviderFields(savedProvider);

      if (savedProvider === ModelProvider.OLLAMA) {
        const models = await loadOllamaModels();
        if (models.length > 0) {
          const storedModel = getModelForProvider(ModelProvider.OLLAMA);
          const activeModel = models.includes(storedModel) ? storedModel : models[0];
          const isValid = await testProviderConnection(ModelProvider.OLLAMA, { modelName: activeModel });
          if (!isValid) {
            setIsExpanded(true);
            updateStatus('error', 'Ollama nedostupná');
            return;
          }

          setModelForProvider(ModelProvider.OLLAMA, activeModel);
          setModelInput(activeModel);
          setIsExpanded(false);
          updateStatus('ready', '✓ Ollama připravena');
          return;
        }
      }

      if (REMOTE_PROVIDERS.has(savedProvider)) {
        const apiKey = getProviderApiKey(savedProvider);
        if (apiKey) {
          const isValid = await testProviderConnection(savedProvider, {
            apiKey,
            modelName: getModelForProvider(savedProvider),
          });

          if (isValid) {
            setIsExpanded(false);
            updateStatus('ready', `✓ ${activeProviderLabel(savedProvider)} připravena`);
            return;
          }
        }
      }

      setIsExpanded(true);
      updateStatus('not_loaded', 'Nastavení AI modelu');
    };

    void initialize();
  }, [onStatusChange]);

  const handleConnect = async () => {
    const provider = selectedProvider;
    const remoteProvider = REMOTE_PROVIDERS.has(provider);
    const trimmedApiKey = apiKeyInput.trim();
    const trimmedModel = modelInput.trim() || DEFAULT_MODELS[provider].modelName;

    if (remoteProvider && !trimmedApiKey) {
      showError('Prosím zadejte API klíč');
      return;
    }

    try {
      updateStatus('loading', `Ověřuji ${activeProviderMeta.label}...`);

      if (provider === ModelProvider.OLLAMA) {
        const models = await loadOllamaModels(false);
        if (!models.length) {
          throw new Error('Ollama not responding');
        }

        const nextModel = models.includes(trimmedModel) ? trimmedModel : models[0];
        const isValid = await testProviderConnection(provider, { modelName: nextModel });
        if (!isValid) {
          throw new Error('Invalid API configuration');
        }

        setModelForProvider(provider, nextModel);
        setProvider(provider);
        setModelInput(nextModel);
        setIsExpanded(false);
        updateStatus('ready', '✓ Ollama připravena');
        success('Ollama úspěšně připojena!');
        return;
      }

      const isValid = await testProviderConnection(provider, {
        apiKey: trimmedApiKey,
        modelName: trimmedModel,
      });

      if (!isValid) {
        throw new Error('Invalid API configuration');
      }

      setProviderApiKey(provider, trimmedApiKey);
      setModelForProvider(provider, trimmedModel);
      setProvider(provider);
      setIsExpanded(false);
      updateStatus('ready', `✓ ${activeProviderLabel(provider)} připravena`);
      success(`${activeProviderMeta.label} úspěšně připojena!`);
    } catch (error: any) {
      console.error(`${activeProviderMeta.label} connection error:`, error);
      updateStatus('error', `${activeProviderMeta.label} nedostupná`);
      showError(buildConnectionErrorMessage(provider, error?.message));
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('ai_provider');
    setModelStatus('not_loaded');
    setStatusMessage('Nastavení AI modelu');
    setIsExpanded(true);
    updateStatus('not_loaded', 'AI odpojeno');
    success('Aktivní AI backend odpojen');
  };

  const handleRefreshOllamaModels = async () => {
    const models = await loadOllamaModels(false);
    if (models.length > 0) {
      success(`Načetl jsem ${models.length} Ollama modelů.`);
      return;
    }

    showError('V Ollama teď není dostupný žádný stažený model.');
  };

  const getStatusColor = () => {
    switch (modelStatus) {
      case 'ready':
        return 'text-success';
      case 'loading':
        return 'text-warning animate-pulse';
      case 'error':
        return 'text-error';
      default:
        return 'text-surface-500';
    }
  };

  const showOllamaEmptyState = selectedProvider === ModelProvider.OLLAMA && !isLoadingOllamaModels && ollamaModels.length === 0;
  const activeProviderName = modelStatus === 'ready' ? activeProviderMeta.label : null;
  const activeModelName = modelStatus === 'ready' ? getModelForProvider(selectedProvider) : '';

  return (
    <div className="card border-surface-700 mb-6 overflow-hidden transition-all duration-300">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center justify-between bg-surface-950 p-4 select-none"
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full border border-surface-700 bg-surface-900 text-lg font-bold ${getStatusColor()}`}>
            {modelStatus === 'ready' ? '✓' : modelStatus === 'loading' ? '◌' : modelStatus === 'error' ? '!' : '○'}
          </span>
          <div>
            <div className="text-xs font-bold text-surface-400 uppercase tracking-widest">
              AI Backend
            </div>
            <div className={`font-semibold ${getStatusColor()}`}>
              {statusMessage}
            </div>
          </div>
        </div>
        <span className="text-surface-500 text-xl">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-surface-700 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {PROVIDER_OPTIONS.map((option) => (
              <button
                key={option.provider}
                onClick={() => setSelectedProvider(option.provider)}
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${
                  selectedProvider === option.provider
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                }`}
              >
                <div>{option.label}</div>
                <div className={`mt-1 text-xs ${selectedProvider === option.provider ? 'text-primary-100' : 'text-surface-500'}`}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-surface-700 bg-surface-900/60 p-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-surface-100">{activeProviderMeta.label}</div>
              <p className="text-xs text-surface-400">{activeProviderMeta.modelHelp}</p>
            </div>

            {REMOTE_PROVIDERS.has(selectedProvider) && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-surface-400">
                  {activeProviderMeta.apiKeyLabel}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder="Zadejte API key..."
                  className="input"
                />
              </div>
            )}

            {selectedProvider === ModelProvider.OLLAMA ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold text-surface-400">
                    {activeProviderMeta.modelLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleRefreshOllamaModels()}
                    disabled={isLoadingOllamaModels}
                    className="text-xs font-semibold text-primary-300 transition hover:text-primary-200 disabled:cursor-not-allowed disabled:text-surface-500"
                  >
                    {isLoadingOllamaModels ? 'Načítám...' : 'Obnovit seznam'}
                  </button>
                </div>
                <select
                  value={modelInput}
                  onChange={(event) => setModelInput(event.target.value)}
                  className="input cursor-pointer"
                  disabled={isLoadingOllamaModels || ollamaModels.length === 0}
                >
                  {ollamaModels.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
                {isLoadingOllamaModels ? (
                  <p className="mt-2 text-xs text-surface-500">Načítám lokální Ollama modely...</p>
                ) : null}
                {showOllamaEmptyState ? (
                  <p className="mt-2 text-xs text-warning">
                    V telefonu jsem zatím nenašel žádný dostupný model. Zkontrolujte `ollama serve` a stažené modely.
                  </p>
                ) : null}
                {ollamaModels.length > 0 ? (
                  <p className="mt-2 text-xs text-surface-500">
                    Vybrat můžeš kterýkoliv model, který je v Ollama stažený.
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-semibold text-surface-400">
                  {activeProviderMeta.modelLabel}
                </label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={(event) => setModelInput(event.target.value)}
                  placeholder={DEFAULT_MODELS[selectedProvider].modelName}
                  className="input"
                />
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                onClick={handleConnect}
                disabled={modelStatus === 'loading'}
                className="btn-primary flex-1"
              >
                {modelStatus === 'loading' ? 'Ověřuji...' : activeProviderMeta.connectLabel}
              </button>

              {modelStatus === 'ready' && (
                <button
                  onClick={handleDisconnect}
                  className="btn-ghost text-error"
                  title="Odpojit aktivní provider"
                >
                  ✕
                </button>
              )}
            </div>

            {activeProviderMeta.apiKeyUrl ? (
              <p className="text-xs text-surface-500">
                API key získáte na:{' '}
                <a href={activeProviderMeta.apiKeyUrl} target="_blank" rel="noopener" className="text-primary-400 hover:underline">
                  {new URL(activeProviderMeta.apiKeyUrl).hostname}
                </a>
              </p>
            ) : null}
          </div>

          {modelStatus === 'ready' && activeProviderName && (
            <div className="flex items-center gap-2 text-sm text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span>Aktivní: {activeProviderName}{activeModelName ? ` • ${activeModelName}` : ''}</span>
            </div>
          )}

          {modelStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-error">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span>Chyba připojení. Zkontrolujte klíč, model nebo dostupnost lokální Ollama.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function activeProviderLabel(provider: ModelProvider): string {
  switch (provider) {
    case ModelProvider.GEMINI:
      return 'Gemini API';
    case ModelProvider.OPENAI:
      return 'OpenAI';
    case ModelProvider.OPENROUTER:
      return 'OpenRouter';
    case ModelProvider.GROQ:
      return 'Groq';
    case ModelProvider.OLLAMA:
      return 'Ollama';
    default:
      return 'AI backend';
  }
}

function buildConnectionErrorMessage(provider: ModelProvider, detail?: string): string {
  if (provider === ModelProvider.OLLAMA) {
    return 'Ollama není dostupná. Ujistěte se, že běží `ollama serve` a že je v telefonu stažený alespoň jeden model.';
  }

  if (detail === 'Invalid API configuration') {
    return 'Nepodařilo se ověřit API klíč nebo model. Zkontrolujte hodnoty a zkuste to znovu.';
  }

  return 'Nepodařilo se připojit provider. Zkontrolujte API klíč, model a síťové připojení.';
}

export default AiProviderPanel;
