import { beforeEach, describe, expect, it } from 'vitest';
import { clearProviderApiKey, getProviderApiKey, setProviderApiKey } from '../features/editor/lyricsAi';
import { ModelProvider } from '../features/editor/editorTypes';

describe('API key storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores remote API keys only in session storage and not in localStorage', () => {
    setProviderApiKey(ModelProvider.OPENAI, 'secret-key');

    expect(getProviderApiKey(ModelProvider.OPENAI)).toBe('secret-key');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('openai_api_key', 'secret-key');
    expect(localStorage.setItem).not.toHaveBeenCalledWith('openai_api_key', 'secret-key');
  });

  it('clears API keys from session storage', () => {
    setProviderApiKey(ModelProvider.GROQ, 'groq-secret');
    clearProviderApiKey(ModelProvider.GROQ);

    expect(getProviderApiKey(ModelProvider.GROQ)).toBeNull();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('groq_api_key');
  });
});
