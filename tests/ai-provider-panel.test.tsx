import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiProviderPanel from '../features/settings/AiProviderPanel';
import { ModelProvider } from '../features/editor/editorTypes';
import { ToastProvider } from '../shared/toast/ToastContext';

const providerMocks = vi.hoisted(() => ({
  getProvider: vi.fn(),
  getProviderApiKey: vi.fn(),
  getModelForProvider: vi.fn(),
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
    getProvider: providerMocks.getProvider,
    getProviderApiKey: providerMocks.getProviderApiKey,
    getModelForProvider: providerMocks.getModelForProvider,
    testProviderConnection: providerMocks.testProviderConnection,
    getAvailableOllamaModels: providerMocks.getAvailableOllamaModels,
    setModelForProvider: providerMocks.setModelForProvider,
    setProvider: providerMocks.setProvider,
    setProviderApiKey: providerMocks.setProviderApiKey,
  };
});

describe('AiProviderPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    providerMocks.getProvider.mockReturnValue(ModelProvider.GEMINI);
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
});
