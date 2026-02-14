import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        relative inline-flex h-10 w-20 items-center rounded-full
        bg-surface-700 p-1 transition-colors duration-200
        hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900
      "
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span
        className={`
          absolute h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400
          shadow-lg transition-transform duration-300 ease-spring
          ${isDark ? 'translate-x-1' : 'translate-x-11'}
        `}
      />
      <span className="relative flex h-full w-full items-center justify-between px-2">
        <span
          className={`
            text-xs transition-opacity duration-200
            ${isDark ? 'opacity-100' : 'opacity-40'}
          `}
        >
          🌙
        </span>
        <span
          className={`
            text-xs transition-opacity duration-200
            ${!isDark ? 'opacity-100' : 'opacity-40'}
          `}
        >
          ☀️
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
