import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full text-on-surface-variant hover:bg-primary/10 transition-colors flex items-center justify-center ${className}`}
      aria-label="Toggle Dark Mode"
    >
      <span 
        className="material-symbols-outlined text-[24px]"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        {isDarkMode ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};

export default ThemeToggle;
