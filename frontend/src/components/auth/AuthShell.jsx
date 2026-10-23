import { ShieldCheck, Clock, Link2 } from 'lucide-react';
import Logo, { LogoMark, Wordmark } from '../ui/Logo';

const FEATURES = [
  { icon: ShieldCheck, label: 'Encrypted', desc: 'JWT-secured transfers' },
  { icon: Clock, label: 'Auto-expiry', desc: '24h for user files' },
  { icon: Link2, label: 'Instant links', desc: 'No login to download' },
];

/**
 * Shared Material-style shell for the sign-in / register / reset pages:
 * brand hero on large screens, elevated form surface on the right.
 */
const AuthShell = ({ icon: Icon, title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-vault-dark app-backdrop flex">
    {/* Hero */}
    <div className="hidden lg:flex lg:w-[46%] p-4">
      <div className="relative flex-1 overflow-hidden rounded-[32px] border border-vault-border/60 bg-gradient-to-br from-brand-700/40 via-brand-900/30 to-vault-panel flex flex-col items-center justify-center p-12">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="flex justify-center mb-7">
            <LogoMark size={96} className="shadow-2xl" />
          </div>
          <h1 className="mb-3">
            <Wordmark className="text-5xl" />
          </h1>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
            Secure File Sharing Platform
          </p>
          <p className="text-gray-300 text-lg leading-relaxed">
            Secure file sharing with automatic expiry. Upload, share, and manage your files with confidence.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {FEATURES.map(({ icon: FIcon, label, desc }) => (
              <div key={label} className="p-4 bg-vault-dark/40 rounded-2xl text-center">
                <div className="mx-auto mb-2 h-9 w-9 rounded-full bg-brand-600/25 flex items-center justify-center">
                  <FIcon className="h-4 w-4 text-brand-200" />
                </div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Form */}
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        {/* Mobile brand */}
        <div className="flex items-center justify-center mb-6 lg:hidden">
          <Logo size={40} wordmarkClassName="text-xl" />
        </div>

        <div className="surface p-7 sm:p-8 animate-slide-up">
          <div className="mb-7">
            {Icon && (
              <div className="h-12 w-12 rounded-2xl bg-brand-600/20 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-brand-300" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-gray-400">{footer}</div>}
      </div>
    </div>
  </div>
);

export default AuthShell;
