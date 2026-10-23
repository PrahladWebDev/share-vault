import logoMarkSrc from '../../assets/logo-mark.png';

/**
 * ShareVault brand mark (cloud + folder + shield lock), shown as a rounded app-icon tile
 * so it keeps its original look on the dark UI.
 */
export const LogoMark = ({ size = 40, className = '', title = 'ShareVault' }) => (
  <img
    src={logoMarkSrc}
    width={size}
    height={size}
    alt={title}
    draggable={false}
    className={`flex-shrink-0 select-none rounded-[22%] shadow-lg shadow-black/30 ring-1 ring-white/10 ${className}`}
  />
);

/**
 * "ShareVault" lettering, matching the logo: "Share" + blue "Vault".
 * (The logo's own navy "Share" would be invisible on the dark UI, so it is white here.)
 * Size it with a text-* class.
 */
export const Wordmark = ({ className = '' }) => (
  <span className={`font-extrabold tracking-tight leading-none ${className}`}>
    <span className="text-white">Share</span>
    <span className="bg-gradient-to-b from-sky-400 to-blue-500 bg-clip-text text-transparent">Vault</span>
  </span>
);

/** Mark + wordmark lockup. */
const Logo = ({ size = 40, className = '', wordmarkClassName = 'text-xl' }) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <LogoMark size={size} />
    <Wordmark className={wordmarkClassName} />
  </span>
);

export default Logo;
