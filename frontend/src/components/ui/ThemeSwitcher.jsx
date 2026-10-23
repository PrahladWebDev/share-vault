import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Swatch = ({ colors, size = 'sm' }) => (
  <span className="flex -space-x-1.5 flex-shrink-0">
    {colors.map((c, i) => (
      <span
        key={i}
        className={`rounded-full border-2 border-vault-panel shadow-sm ${
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-7 h-7'
        }`}
        style={{ background: c }}
      />
    ))}
  </span>
);

const ThemeSwitcher = ({ variant = 'full' }) => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const active = themes.find((t) => t.id === theme);

  useEffect(() => {
    if (variant !== 'compact' || !open) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [variant, open]);

  if (variant === 'compact') {
    return (
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-3 w-full h-12 px-4 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Palette size={20} className="flex-shrink-0" />
          <span className="flex-1 text-left">Theme</span>
          {active && <Swatch colors={active.swatch.slice(0, 1)} />}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-vault-panel border border-vault-border/70 rounded-2xl shadow-2xl shadow-black/50 z-50 animate-slide-up"
          >
            {themes.map((t) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={theme === t.id}
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 h-11 rounded-full text-sm transition-colors ${
                  theme === t.id ? 'bg-brand-600/25 text-white' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1 text-left">{t.name}</span>
                {theme === t.id && <Check size={16} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
      {themes.map((t) => (
        <button
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
            theme === t.id
              ? 'border-brand-500 bg-brand-600/10'
              : 'border-vault-border/70 hover:border-vault-muted bg-vault-dark/30'
          }`}
        >
          <Swatch colors={t.swatch} size="lg" />
          <span className="flex-1 text-sm font-medium text-white">{t.name}</span>
          {theme === t.id && (
            <span className="h-6 w-6 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={14} className="text-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ThemeSwitcher;
