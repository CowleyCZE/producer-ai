import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiProviderPanel from '../features/settings/AiProviderPanel';
import { ToastProvider } from '../shared/toast/ToastContext';

describe('AiProviderPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('reports ready state on mount when Gemini API key is already stored', async () => {
    localStorage.setItem('gemini_api_key', 'stored-key');
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
    localStorage.setItem('ai_provider', 'ollama');
    localStorage.setItem('ollama_model', 'qwen2.5:3b');
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
});
