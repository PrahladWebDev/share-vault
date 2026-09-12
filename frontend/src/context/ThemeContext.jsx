import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'indigo', name: 'Midnight Indigo', swatch: ['#4f46e5', '#16162a', '#0f0f1a'] },
  { id: 'violet', name: 'Violet Nocturne', swatch: ['#7c3aed', '#1e1630', '#150f1f'] },
  { id: 'emerald', name: 'Emerald Gold', swatch: ['#059669', '#142019', '#0d1512'] },
  { id: 'ocean', name: 'Ocean Abyss', swatch: ['#0891b2', '#101c2b', '#0a121c'] },
  { id: 'sunset', name: 'Sunset Ember', swatch: ['#ea580c', '#241a13', '#1a120d'] },
  { id: 'rosegold', name: 'Rose Gold Noir', swatch: ['#e11d48', '#1c1416', '#120d0f'] },
];

const STORAGE_KEY = 'sharevault-theme';
const DEFAULT_THEME = 'indigo';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (id) => {
    if (THEMES.some((t) => t.id === id)) setThemeState(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
