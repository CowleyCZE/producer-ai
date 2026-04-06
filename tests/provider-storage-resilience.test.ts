import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProviderApiKey,
  getBaseUrlForProvider,
  getModelForProvider,
  getProvider,
  isOllamaConnected,
  setBaseUrlForProvider,
  setModelForProvider,
  setProvider,
  setProviderApiKey,
} from '../features/editor/lyricsAi';
import { ModelProvider } from '../features/editor/editorTypes';

describe('Provider storage resilience', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('falls back to safe defaults when localStorage reads throw', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(getProvider()).toBe(ModelProvider.GEMINI);
    expect(getModelForProvider(ModelProvider.OPENAI)).toBe('gpt-4.1-mini');
    expect(getBaseUrlForProvider(ModelProvider.OLLAMA)).toBe('http://localhost:11434');
    expect(isOllamaConnected()).toBe(false);

    getItemSpy.mockRestore();
  });

  it('ignores unsupported legacy provider value from storage', () => {
    localStorage.setItem('ai_provider', ModelProvider.LOCAL);
    expect(getProvider()).toBe(ModelProvider.GEMINI);
  });

  it('does not throw when localStorage writes throw', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const removeItemSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => setProvider(ModelProvider.OPENAI)).not.toThrow();
    expect(() => setModelForProvider(ModelProvider.OPENAI, 'gpt-4.1')).not.toThrow();
    expect(() => setBaseUrlForProvider(ModelProvider.OLLAMA, 'http://127.0.0.1:11434')).not.toThrow();
    expect(() => setProviderApiKey(ModelProvider.GEMINI, 'manual-key')).not.toThrow();
    expect(() => clearProviderApiKey(ModelProvider.GEMINI)).not.toThrow();

    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('does not persist unsupported provider values', () => {
    setProvider(ModelProvider.LOCAL);
    expect(localStorage.setItem).not.toHaveBeenCalledWith('ai_provider', ModelProvider.LOCAL);
    expect(getProvider()).toBe(ModelProvider.GEMINI);
  });
});
