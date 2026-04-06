import { describe, expect, it, vi } from 'vitest';
import { __testing as themeTesting } from '../shared/theme/ThemeContext';

describe('ThemeContext helpers', () => {
  it('uses light theme when system preference is not dark', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    expect(themeTesting.getPreferredTheme()).toBe('light');
  });

  it('ignores invalid stored theme values', () => {
    localStorage.setItem('producer-ai-theme', 'neon' as unknown as string);
    expect(themeTesting.getStoredTheme()).toBeNull();
    expect(themeTesting.isTheme('neon')).toBe(false);
  });

  it('does not throw when localStorage is unavailable', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => themeTesting.persistTheme('dark')).not.toThrow();
    expect(() => themeTesting.getStoredTheme()).not.toThrow();
    expect(themeTesting.getStoredTheme()).toBeNull();
    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });
});
