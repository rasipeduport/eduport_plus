import { useState, useEffect } from 'react';

function applyTheme(currentTheme) {
  const root = document.documentElement;
  if (currentTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else if (currentTheme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (systemTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }
}

/**
 * Theme state synced to localStorage and the OS preference.
 * Returns the current theme ('system' | 'light' | 'dark') and a setter that
 * persists the choice.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return { theme, setTheme: changeTheme };
}
