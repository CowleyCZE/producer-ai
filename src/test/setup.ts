import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.fetch = vi.fn();

const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
  key: vi.fn(),
  get length() { return Object.keys(mockStorage).length; }
} as any;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.devicePixelRatio = 1;
