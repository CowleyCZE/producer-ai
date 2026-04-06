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
import { testGeminiKey, testProviderConnection } from '../features/editor/lyricsAi';
import { ModelProvider } from '../features/editor/editorTypes';

const geminiMock = geminiModule as typeof geminiModule & {
  __mockGenerateContent: ReturnType<typeof vi.fn>;
};

describe('Provider connection probes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('accepts OpenAI-compatible providers only when they return valid analyze JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                lines: [
                  {
                    line_index: 0,
                    original: 'Makám celej den',
                    needs_fix: false,
                    alternatives: null,
                  },
                  {
                    line_index: 1,
                    original: 'Hlava plná stresu',
                    needs_fix: false,
                    alternatives: null,
                  },
                ],
              }),
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

  it('rejects OpenAI-compatible providers when JSON contract is invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"unexpected":true}',
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
          response: JSON.stringify({
            lines: [
              {
                line_index: 0,
                original: 'Makám celej den',
                needs_fix: false,
                alternatives: null,
              },
              {
                line_index: 1,
                original: 'Hlava plná stresu',
                needs_fix: false,
                alternatives: null,
              },
            ],
          }),
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

  it('requires Gemini to return valid analyze JSON during key verification', async () => {
    geminiMock.__mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          lines: [
            {
              line_index: 0,
              original: 'Makám celej den',
              needs_fix: false,
              alternatives: null,
            },
            {
              line_index: 1,
              original: 'Hlava plná stresu',
              needs_fix: false,
              alternatives: null,
            },
          ],
        }),
      },
    });

    const isValid = await testGeminiKey('gemini-key', 'gemini-2.0-flash-exp');

    expect(isValid).toBe(true);
    expect(geminiMock.__mockGenerateContent).toHaveBeenCalled();
  });
});
