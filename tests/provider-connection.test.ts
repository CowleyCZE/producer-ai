import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@google/generative-ai', () => {
  const generateContent = vi.fn();

  class GoogleGenerativeAI {
    constructor(_apiKey: string) {}

    getGenerativeModel() {
      return { generateContent };
    }
  }

  return {
    GoogleGenerativeAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'harassment',
      HARM_CATEGORY_HATE_SPEECH: 'hate-speech',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexually-explicit',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'dangerous-content',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'block-medium-and-above',
    },
    __mockGenerateContent: generateContent,
  };
});

import * as geminiModule from '@google/generative-ai';
import { getAvailableOllamaModels, testGeminiKey, testProviderConnection } from '../features/editor/lyricsAi';
import { ModelProvider } from '../features/editor/editorTypes';

const geminiMock = geminiModule as typeof geminiModule & {
  __mockGenerateContent: ReturnType<typeof vi.fn>;
};

describe('Provider connection probes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('accepts OpenAI-compatible providers when they answer the lightweight connection ping', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'OK',
            },
          },
        ],
      }),
    } as Response);

    const isValid = await testProviderConnection(ModelProvider.OPENAI, {
      apiKey: 'openai-key',
      modelName: 'gpt-4.1-mini',
    });

    expect(isValid).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('rejects OpenAI-compatible providers when the ping answer does not confirm readiness', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'not-ready',
            },
          },
        ],
      }),
    } as Response);

    const isValid = await testProviderConnection(ModelProvider.OPENAI, {
      apiKey: 'openai-key',
      modelName: 'gpt-4.1-mini',
    });

    expect(isValid).toBe(false);
  });

  it('checks the real Ollama generate path instead of only listing models', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen2.5:3b' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'OK',
        }),
      } as Response);

    const isValid = await testProviderConnection(ModelProvider.OLLAMA, {
      modelName: 'qwen2.5:3b',
    });

    expect(isValid).toBe(true);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:11434/api/tags',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:11434/api/generate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('filters Ollama embedding models out of the selectable model list', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'all-minilm:22m',
            details: { family: 'bert', families: ['bert'] },
          },
          {
            name: 'llama3.2:1b',
            details: { family: 'llama', families: ['llama'] },
          },
          {
            name: 'tinyllama:latest',
            details: { family: 'llama', families: ['llama'] },
          },
        ],
      }),
    } as Response);

    const models = await getAvailableOllamaModels('http://localhost:11434');

    expect(models).toEqual(['llama3.2:1b', 'tinyllama:latest']);
  });

  it('uses the configured Ollama base URL instead of a hardcoded localhost endpoint', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen2.5:3b' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'OK',
        }),
      } as Response);

    const isValid = await testProviderConnection(ModelProvider.OLLAMA, {
      modelName: 'qwen2.5:3b',
      baseUrl: 'http://192.168.1.10:11434/',
    });

    expect(isValid).toBe(true);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://192.168.1.10:11434/api/tags',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://192.168.1.10:11434/api/generate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('requires Gemini to return the lightweight connection ping confirmation', async () => {
    geminiMock.__mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'OK',
      },
    });

    const isValid = await testGeminiKey('gemini-key', 'gemini-2.0-flash-exp');

    expect(isValid).toBe(true);
    expect(geminiMock.__mockGenerateContent).toHaveBeenCalled();
  });
});
