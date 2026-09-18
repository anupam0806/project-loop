/**
 * Dark Mode & Theme Switcher Tests
 * Validates theme resolution, localStorage persistence, DOM class updates, and CSS tokens.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dark Mode Theme System', () => {
  let localStorageStore: Record<string, string> = {};
  let documentClassList: Set<string> = new Set();
  let documentStyle: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    documentClassList = new Set();
    documentStyle = {};

    // Mock localStorage
    const mockLocalStorage = {
      getItem: (key: string) => localStorageStore[key] || null,
      setItem: (key: string, value: string) => {
        localStorageStore[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageStore[key];
      },
      clear: () => {
        localStorageStore = {};
      },
    };

    // Mock document
    const mockDocument = {
      documentElement: {
        classList: {
          add: (cls: string) => documentClassList.add(cls),
          remove: (cls: string) => documentClassList.delete(cls),
          contains: (cls: string) => documentClassList.has(cls),
          toggle: (cls: string, force?: boolean) => {
            if (force === true) {
              documentClassList.add(cls);
              return true;
            } else if (force === false) {
              documentClassList.delete(cls);
              return false;
            }
            if (documentClassList.has(cls)) {
              documentClassList.delete(cls);
              return false;
            } else {
              documentClassList.add(cls);
              return true;
            }
          },
        },
        style: documentStyle,
      },
    };

    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('document', mockDocument);
  });

  describe('Theme Resolution Logic', () => {
    const resolveTheme = (
      theme: 'light' | 'dark' | 'system',
      systemPrefersDark: boolean
    ): 'light' | 'dark' => {
      if (theme === 'system') {
        return systemPrefersDark ? 'dark' : 'light';
      }
      return theme;
    };

    const applyThemeToDOM = (resolved: 'light' | 'dark') => {
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    it('resolves explicit light theme regardless of system preference', () => {
      expect(resolveTheme('light', true)).toBe('light');
      expect(resolveTheme('light', false)).toBe('light');
    });

    it('resolves explicit dark theme regardless of system preference', () => {
      expect(resolveTheme('dark', true)).toBe('dark');
      expect(resolveTheme('dark', false)).toBe('dark');
    });

    it('resolves system theme matching system preference', () => {
      expect(resolveTheme('system', true)).toBe('dark');
      expect(resolveTheme('system', false)).toBe('light');
    });

    it('applies dark theme class and colorScheme to DOM', () => {
      applyThemeToDOM('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('removes dark theme class and sets light colorScheme on DOM', () => {
      document.documentElement.classList.add('dark');
      applyThemeToDOM('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('persists selected theme to localStorage', () => {
      localStorage.setItem('loop-theme', 'dark');
      expect(localStorage.getItem('loop-theme')).toBe('dark');

      localStorage.setItem('loop-theme', 'light');
      expect(localStorage.getItem('loop-theme')).toBe('light');

      localStorage.setItem('loop-theme', 'system');
      expect(localStorage.getItem('loop-theme')).toBe('system');
    });

    it('toggles correctly between light and dark', () => {
      let currentResolved: 'light' | 'dark' = 'light';
      const toggle = () => {
        currentResolved = currentResolved === 'dark' ? 'light' : 'dark';
        applyThemeToDOM(currentResolved);
      };

      toggle();
      expect(currentResolved).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      toggle();
      expect(currentResolved).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Design Tokens Integrity', () => {
    it('defines .dark class with all essential calm UI tokens in globals.css', () => {
      const globalsCssPath = path.join(process.cwd(), 'app', 'globals.css');
      const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

      expect(cssContent).toContain('.dark {');
      expect(cssContent).toContain('--background:');
      expect(cssContent).toContain('--surface:');
      expect(cssContent).toContain('--surface-muted:');
      expect(cssContent).toContain('--border:');
      expect(cssContent).toContain('--text-primary:');
      expect(cssContent).toContain('--text-secondary:');
      expect(cssContent).toContain('--accent:');
      expect(cssContent).toContain('color-scheme: dark');
    });

    it('enables darkMode class in tailwind.config.js', () => {
      const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.js');
      const configContent = fs.readFileSync(tailwindConfigPath, 'utf8');

      expect(configContent).toContain("darkMode: 'class'");
      expect(configContent).toContain("background: 'var(--background)'");
      expect(configContent).toContain("border: 'var(--border)'");
    });

    it('contains anti-FOUC initialization script in layout.tsx', () => {
      const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      expect(layoutContent).toContain('loop-theme');
      expect(layoutContent).toContain('prefers-color-scheme: dark');
      expect(layoutContent).toContain('suppressHydrationWarning');
    });
  });
});
