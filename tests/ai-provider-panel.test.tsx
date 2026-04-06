import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiProviderPanel from '../features/settings/AiProviderPanel';
import { ModelProvider } from '../features/editor/editorTypes';
import { ToastProvider } from '../shared/toast/ToastContext';

const providerMocks = vi.hoisted(() => ({
  clearProviderApiKey: vi.fn(),
  getBaseUrlForProvider: vi.fn(),
  getProvider: vi.fn(),
  getProviderApiKey: vi.fn(),
  getModelForProvider: vi.fn(),
  setBaseUrlForProvider: vi.fn(),
  testProviderConnection: vi.fn(),
  getAvailableOllamaModels: vi.fn(),
  setModelForProvider: vi.fn(),
  setProvider: vi.fn(),
  setProviderApiKey: vi.fn(),
}));

vi.mock('../features/editor/lyricsAi', async () => {
  const actual = (await vi.importActual('../features/editor/lyricsAi')) as Record<string, unknown>;
  return {
    ...actual,
    clearProviderApiKey: providerMocks.clearProviderApiKey,
    getBaseUrlForProvider: providerMocks.getBaseUrlForProvider,
    getProvider: providerMocks.getProvider,
    getProviderApiKey: providerMocks.getProviderApiKey,
    getModelForProvider: providerMocks.getModelForProvider,
    setBaseUrlForProvider: providerMocks.setBaseUrlForProvider,
    testProviderConnection: providerMocks.testProviderConnection,
    getAvailableOllamaModels: providerMocks.getAvailableOllamaModels,
    setModelForProvider: providerMocks.setModelForProvider,
    setProvider: providerMocks.setProvider,
    setProviderApiKey: providerMocks.setProviderApiKey,
  };
});

describe('AiProviderPanel', () => {
  const deferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    providerMocks.getProvider.mockReturnValue(ModelProvider.GEMINI);
    providerMocks.getBaseUrlForProvider.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.OLLAMA ? 'http://localhost:11434' : ''
    ));
    providerMocks.getProviderApiKey.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.GEMINI ? 'stored-key' : ''
    ));
    providerMocks.getModelForProvider.mockImplementation((provider: ModelProvider) => {
      if (provider === ModelProvider.OLLAMA) {
        return 'qwen2.5:3b';
      }
      return 'gemini-2.0-flash-exp';
    });
    providerMocks.testProviderConnection.mockResolvedValue(true);
    providerMocks.getAvailableOllamaModels.mockResolvedValue(['qwen2.5:3b', 'llama3.2:3b']);
  });

  it('reports ready state on mount when a stored remote provider is valid', async () => {
    const onStatusChange = vi.fn();

    render(
      <ToastProvider>
        <AiProviderPanel onStatusChange={onStatusChange} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('ready', '✓ Gemini API připravena');
    });

    expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
  });

  it('reports ready state on mount when Ollama provider is already stored', async () => {
    providerMocks.getProvider.mockReturnValue(ModelProvider.OLLAMA);
    providerMocks.getProviderApiKey.mockReturnValue('');
    providerMocks.getModelForProvider.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.OLLAMA ? 'qwen2.5:3b' : 'gemini-2.0-flash-exp'
    ));

    const onStatusChange = vi.fn();

    render(
      <ToastProvider>
        <AiProviderPanel onStatusChange={onStatusChange} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('ready', '✓ Ollama připravena');
    });

    expect(screen.getByText('✓ Ollama připravena')).toBeInTheDocument();
    expect(providerMocks.getAvailableOllamaModels).toHaveBeenCalledTimes(1);
  });

  it('keeps panel stable when Ollama model loading fails during initialization', async () => {
    providerMocks.getProvider.mockReturnValue(ModelProvider.OLLAMA);
    providerMocks.getProviderApiKey.mockReturnValue('');
    providerMocks.getAvailableOllamaModels
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue([]);
    const onStatusChange = vi.fn();

    render(
      <ToastProvider>
        <AiProviderPanel onStatusChange={onStatusChange} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('error', 'Nepodařilo se načíst konfiguraci AI backendu');
    });

    expect(screen.getByText('Nepodařilo se načíst konfiguraci AI backendu')).toBeInTheDocument();
  });

  it('loads available local models after switching to Ollama', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lokální Ollama')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /Lokální Ollama/i }));

    await waitFor(() => {
      expect(providerMocks.getAvailableOllamaModels).toHaveBeenCalled();
    });

    expect(screen.getByRole('option', { name: 'qwen2.5:3b' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'llama3.2:3b' })).toBeInTheDocument();
    expect(screen.getByText(/Vybrat můžeš kterýkoliv model/i)).toBeInTheDocument();
  });

  it('explains that remote API keys are stored only for the current session', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/API klíč se ukládá jen do aktuální relace/i)).toBeInTheDocument();
    });
  });

  it('stores the exact Ollama model selected by the user', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lokální Ollama')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /Lokální Ollama/i }));

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'llama3.2:3b' } });
    fireEvent.click(screen.getByRole('button', { name: /Připojit k Ollama/i }));

    await waitFor(() => {
      expect(providerMocks.setModelForProvider).toHaveBeenCalledWith(ModelProvider.OLLAMA, 'llama3.2:3b');
    });

    expect(providerMocks.setProvider).toHaveBeenCalledWith(ModelProvider.OLLAMA);
  });

  it('stores the exact Ollama base URL selected by the user', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lokální Ollama')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /Lokální Ollama/i }));

    fireEvent.change(screen.getByRole('textbox', { name: 'URL Ollama serveru' }), {
      target: { value: 'http://192.168.1.10:11434/' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Připojit k Ollama/i }));

    await waitFor(() => {
      expect(providerMocks.setBaseUrlForProvider).toHaveBeenCalledWith(
        ModelProvider.OLLAMA,
        'http://192.168.1.10:11434/',
      );
    });

    expect(providerMocks.testProviderConnection).toHaveBeenCalledWith(
      ModelProvider.OLLAMA,
      expect.objectContaining({
        baseUrl: 'http://192.168.1.10:11434/',
      }),
    );
  });

  it('keeps the active provider badge bound to the connected backend after switching tabs', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));

    expect(screen.getByText(/Aktivní: Google Gemini/)).toBeInTheDocument();
    expect(screen.queryByText(/Aktivní: OpenAI/)).not.toBeInTheDocument();
  });

  it('preserves the current active provider when a switch attempt fails', async () => {
    providerMocks.testProviderConnection.mockImplementation(async (provider: ModelProvider) => (
      provider === ModelProvider.GEMINI
    ));

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));
    fireEvent.change(screen.getByPlaceholderText('Zadejte API key...'), {
      target: { value: 'bad-openai-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Připojit OpenAI/i }));

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    expect(screen.getByText(/Aktivní: Google Gemini/)).toBeInTheDocument();
  });

  it('does not override non-Ollama model input when delayed Ollama load resolves', async () => {
    const modelsDeferred = deferred<string[]>();
    providerMocks.getAvailableOllamaModels.mockReturnValue(modelsDeferred.promise);

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('AI Backend')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Backend'));
    fireEvent.click(screen.getByRole('button', { name: /Lokální Ollama/i }));
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));

    modelsDeferred.resolve(['qwen2.5:3b']);
    await waitFor(() => {
      expect(providerMocks.getAvailableOllamaModels).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('gpt-4.1-mini') as HTMLInputElement;
    expect(input.value).toBe('gemini-2.0-flash-exp');
  });

  it('keeps connect status tied to the provider being connected even if tab changes mid-request', async () => {
    const connectDeferred = deferred<boolean>();
    providerMocks.testProviderConnection.mockReturnValue(connectDeferred.promise);

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('AI Backend')).toBeInTheDocument();
    });

    if (!screen.queryByRole('button', { name: /OpenAI/i })) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));
    fireEvent.change(screen.getByPlaceholderText('Zadejte API key...'), {
      target: { value: 'openai-live-key' },
    });
    fireEvent.change(screen.getByPlaceholderText('gpt-4.1-mini'), {
      target: { value: 'gpt-4.1-mini' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Připojit OpenAI/i }));
    fireEvent.click(screen.getByRole('button', { name: /Google Gemini/i }));

    connectDeferred.resolve(true);
    await waitFor(() => {
      expect(screen.getByText('✓ OpenAI připravena')).toBeInTheDocument();
    });
  });

  it('does not crash during disconnect when localStorage.removeItem throws', async () => {
    const removeSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    if (!screen.queryByTitle('Odpojit aktivní provider')) {
      fireEvent.click(screen.getByText('AI Backend'));
    }

    expect(() => {
      fireEvent.click(screen.getByTitle('Odpojit aktivní provider'));
    }).not.toThrow();

    removeSpy.mockRestore();
  });
});
