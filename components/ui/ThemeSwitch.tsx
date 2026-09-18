'use client';

import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme, Theme } from '../ThemeProvider';

interface ThemeSwitchProps {
  variant?: 'switch' | 'button' | 'segmented';
  className?: string;
  showLabels?: boolean;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({
  variant = 'switch',
  className = '',
  showLabels = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  // Segmented 3-option control (Light / Dark / System)
  if (variant === 'segmented') {
    const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { value: 'light', label: 'Light', icon: SunIcon },
      { value: 'dark', label: 'Dark', icon: MoonIcon },
      { value: 'system', label: 'System', icon: ComputerDesktopIcon },
    ];

    return (
      <div
        className={`inline-flex items-center p-1 bg-surface-muted border border-border rounded-DEFAULT gap-1 ${className}`}
        role="group"
        aria-label="Theme preference"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-badge transition-colors ${
                isSelected
                  ? 'bg-surface text-primary shadow-sm border border-border/80'
                  : 'text-secondary hover:text-primary hover:bg-surface/50'
              }`}
              aria-pressed={isSelected}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Icon Button variant
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-badge text-secondary hover:text-primary hover:bg-surface-muted border border-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <SunIcon className="w-4 h-4 text-amber-400" aria-hidden="true" />
        ) : (
          <MoonIcon className="w-4 h-4 text-secondary" aria-hidden="true" />
        )}
      </button>
    );
  }

  // Default: Toggle switch with sliding knob & sun/moon icons
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-xs font-medium text-secondary select-none">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch between light and dark mode. Currently in ${isDark ? 'dark' : 'light'} mode.`}
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-surface select-none ${
          isDark ? 'bg-accent' : 'bg-surface-muted border-border'
        }`}
      >
        <span className="sr-only">Toggle dark mode</span>
        {/* Sliding thumb */}
        <span
          className={`pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            isDark ? 'translate-x-5 bg-slate-900 text-amber-300' : 'translate-x-0 bg-white text-secondary'
          }`}
        >
          {isDark ? (
            <MoonIcon className="w-3.5 h-3.5 text-indigo-200 fill-indigo-200/20" aria-hidden="true" />
          ) : (
            <SunIcon className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          )}
        </span>
      </button>
    </div>
  );
};
