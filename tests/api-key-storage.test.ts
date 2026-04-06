import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearProviderApiKey, getProviderApiKey, setProviderApiKey } from '../features/editor/lyricsAi';
import { ModelProvider } from '../features/editor/editorTypes';

const GEMINI_ENV_KEY = 'VITE_GEMINI_API_KEY';
const originalGeminiEnvKey = import.meta.env.VITE_GEMINI_API_KEY;

describe('API key storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    (import.meta.env as Record<string, string | undefined>)[GEMINI_ENV_KEY] = originalGeminiEnvKey;
    localStorage.removeItem('gemini_env_api_key_disabled');
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

  it('keeps Gemini disconnected after clear even when env key exists', () => {
    (import.meta.env as Record<string, string | undefined>)[GEMINI_ENV_KEY] = 'env-gemini-key';

    expect(getProviderApiKey(ModelProvider.GEMINI)).toBe('env-gemini-key');

    clearProviderApiKey(ModelProvider.GEMINI);

    expect(getProviderApiKey(ModelProvider.GEMINI)).toBeNull();
    expect(localStorage.setItem).toHaveBeenCalledWith('gemini_env_api_key_disabled', '1');
  });

  it('prefers manually set Gemini key over env key after reconnect', () => {
    (import.meta.env as Record<string, string | undefined>)[GEMINI_ENV_KEY] = 'env-gemini-key';
    clearProviderApiKey(ModelProvider.GEMINI);

    setProviderApiKey(ModelProvider.GEMINI, 'manual-key');

    expect(localStorage.removeItem).toHaveBeenCalledWith('gemini_env_api_key_disabled');
    expect(getProviderApiKey(ModelProvider.GEMINI)).toBe('manual-key');
  });
});
