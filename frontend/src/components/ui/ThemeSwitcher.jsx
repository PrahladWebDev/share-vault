import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Swatch = ({ colors, size = 'sm' }) => (
  <span className="flex -space-x-1.5 flex-shrink-0">
    {colors.map((c, i) => (
      <span
        key={i}
        className={`rounded-full border-2 border-vault-panel shadow-sm ${
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6'
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
    if (variant !== 'compact' || !open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [variant, open]);

  if (variant === 'compact') {
    return (
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
        >
          <Palette size={18} className="flex-shrink-0" />
          <span className="flex-1 text-left">Theme</span>
          {active && <Swatch colors={active.swatch.slice(0, 1)} />}
        </button>

        {open && (
          <div className="absolute bottom-full left-0 mb-2 w-60 p-2 bg-vault-panel border border-vault-border rounded-xl shadow-2xl z-50 animate-slide-up">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  theme === t.id ? 'bg-brand-600/20 text-brand-300' : 'text-gray-300 hover:bg-vault-muted'
                }`}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1 text-left">{t.name}</span>
                {theme === t.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left ${
            theme === t.id
              ? 'border-brand-500 bg-brand-600/10 ring-1 ring-brand-500/40'
              : 'border-vault-border hover:border-vault-muted bg-vault-dark/40'
          }`}
        >
          <Swatch colors={t.swatch} size="lg" />
          <span className="flex-1 text-sm font-medium text-white">{t.name}</span>
          {theme === t.id && (
            <span className="p-1 bg-brand-600 rounded-full flex-shrink-0">
              <Check size={12} className="text-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ThemeSwitcher;
