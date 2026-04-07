import React from 'react';
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
  getProviderApiKeySource: vi.fn(),
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
    getProviderApiKeySource: providerMocks.getProviderApiKeySource,
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
    providerMocks.getProviderApiKeySource.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.GEMINI ? 'session' : null
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

  it('does not prefill Gemini API input when key source is env', async () => {
    providerMocks.getProvider.mockReturnValue(ModelProvider.GEMINI);
    providerMocks.getProviderApiKey.mockReturnValue('env-key');
    providerMocks.getProviderApiKeySource.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.GEMINI ? 'env' : null
    ));

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    if (!screen.queryByPlaceholderText('Zadejte API key...')) {
      fireEvent.click(screen.getByText('AI Backend'));
    }

    const apiInput = screen.getByPlaceholderText('Zadejte API key...') as HTMLInputElement;
    expect(apiInput.value).toBe('');
    expect(screen.getByText(/VITE_GEMINI_API_KEY/)).toBeInTheDocument();
  });

  it('allows Gemini connect with env API key even when input is empty', async () => {
    providerMocks.getProvider.mockReturnValue(ModelProvider.GEMINI);
    providerMocks.getProviderApiKey.mockReturnValue('env-key');
    providerMocks.getProviderApiKeySource.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.GEMINI ? 'env' : null
    ));
    providerMocks.testProviderConnection.mockResolvedValue(true);

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    if (!screen.queryByRole('button', { name: /Připojit Gemini/i })) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByRole('button', { name: /Připojit Gemini/i }));

    await waitFor(() => {
      expect(providerMocks.testProviderConnection).toHaveBeenCalledWith(
        ModelProvider.GEMINI,
        expect.objectContaining({
          apiKey: 'env-key',
        }),
      );
    });

    expect(providerMocks.setProviderApiKey).not.toHaveBeenCalled();
  });

  it('disconnect clears active provider key even when storage provider differs', async () => {
    let currentProvider = ModelProvider.OPENAI;
    providerMocks.getProvider.mockImplementation(() => currentProvider);
    providerMocks.getProviderApiKey.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.OPENAI ? 'openai-key' : ''
    ));
    providerMocks.getProviderApiKeySource.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.OPENAI ? 'session' : null
    ));

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ OpenAI připravena')).toBeInTheDocument();
    });

    currentProvider = ModelProvider.GEMINI;
    if (!screen.queryByTitle('Odpojit aktivní provider')) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByTitle('Odpojit aktivní provider'));

    expect(providerMocks.clearProviderApiKey).toHaveBeenCalledWith(ModelProvider.OPENAI);
  });

  it('exposes remote inputs through accessible labels', async () => {
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

    expect(screen.getByLabelText('OpenAI API key')).toBeInTheDocument();
    expect(screen.getByLabelText('OpenAI model')).toBeInTheDocument();
  });

  it('uses an accessible header button to collapse and expand provider settings', async () => {
    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    const headerButton = screen.getByRole('button', { name: /AI Backend/i });
    expect(headerButton).toBeInTheDocument();
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Google Gemini/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lokální Ollama/i })).toBeInTheDocument();

    fireEvent.click(headerButton);
    await waitFor(() => {
      expect(headerButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: /Lokální Ollama/i })).not.toBeInTheDocument();
    });

    fireEvent.click(headerButton);
    await waitFor(() => {
      expect(headerButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: /Lokální Ollama/i })).toBeInTheDocument();
    });
  });

  it('ignores stale connect success when user disconnects while request is still pending', async () => {
    const connectDeferred = deferred<boolean>();
    providerMocks.testProviderConnection.mockImplementation((provider: ModelProvider) => (
      provider === ModelProvider.GEMINI ? Promise.resolve(true) : connectDeferred.promise
    ));

    render(
      <ToastProvider>
        <AiProviderPanel />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    if (!screen.queryByRole('button', { name: /OpenAI/i })) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));
    fireEvent.change(screen.getByPlaceholderText('Zadejte API key...'), {
      target: { value: 'openai-key' },
    });
    fireEvent.change(screen.getByPlaceholderText('gpt-4.1-mini'), {
      target: { value: 'gpt-4.1-mini' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Připojit OpenAI/i }));
    fireEvent.click(screen.getByTitle('Odpojit aktivní provider'));

    connectDeferred.resolve(true);

    await waitFor(() => {
      expect(screen.getByText('AI odpojeno')).toBeInTheDocument();
    });

    expect(screen.queryByText('✓ OpenAI připravena')).not.toBeInTheDocument();
  });

  it('does not apply delayed Ollama errors after user switches to a different provider', async () => {
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

    if (!screen.queryByRole('button', { name: /Lokální Ollama/i })) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByRole('button', { name: /Lokální Ollama/i }));
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));

    modelsDeferred.reject(new Error('ollama failed late'));

    await waitFor(() => {
      expect(screen.getByLabelText('OpenAI model')).toBeInTheDocument();
    });

    expect(screen.queryByText(/V telefonu jsem zatím nenašel žádný dostupný model/i)).not.toBeInTheDocument();
  });

  it('completes provider connect flow in React StrictMode', async () => {
    render(
      <React.StrictMode>
        <ToastProvider>
          <AiProviderPanel />
        </ToastProvider>
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('✓ Gemini API připravena')).toBeInTheDocument();
    });

    if (!screen.queryByRole('button', { name: /OpenAI/i })) {
      fireEvent.click(screen.getByText('AI Backend'));
    }
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/i }));
    fireEvent.change(screen.getByPlaceholderText('Zadejte API key...'), {
      target: { value: 'openai-key' },
    });
    fireEvent.change(screen.getByPlaceholderText('gpt-4.1-mini'), {
      target: { value: 'gpt-4.1-mini' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Připojit OpenAI/i }));

    await waitFor(() => {
      expect(screen.getByText('✓ OpenAI připravena')).toBeInTheDocument();
    });
  });
});
