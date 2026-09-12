import { useState } from 'react';
import {
  Download,
  Trash2,
  Share2,
  Clock,
  Copy,
  Check,
  Eye,
} from 'lucide-react';

import {
  formatBytes,
  formatCountdown,
  formatRelativeTime,
  getMimeIcon,
  truncateFilename,
} from '../../utils/formatters';

import { filesAPI } from '../../api/files';
import toast from 'react-hot-toast';

// Tinted tile background per file type — mirrors the switch in getMimeIcon
// so the icon sits on a color that hints at the file type at a glance.
const getTileClasses = (mimeType) => {
  if (!mimeType) return 'bg-vault-dark/70 border-vault-border';
  if (mimeType.startsWith('image/')) return 'bg-purple-500/10 border-purple-500/25';
  if (mimeType.startsWith('video/')) return 'bg-blue-500/10 border-blue-500/25';
  if (mimeType.startsWith('audio/')) return 'bg-pink-500/10 border-pink-500/25';
  if (mimeType.includes('pdf')) return 'bg-red-500/10 border-red-500/25';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'bg-yellow-500/10 border-yellow-500/25';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-400/10 border-blue-400/25';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-emerald-500/10 border-emerald-500/25';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'bg-orange-500/10 border-orange-500/25';
  return 'bg-vault-dark/70 border-vault-border';
};

const ActionButton = ({ onClick, href, icon: Icon, label, tone = 'default' }) => {
  const toneClasses =
    tone === 'danger'
      ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'
      : tone === 'success'
      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20'
      : 'text-gray-400 hover:text-white hover:bg-vault-muted';

  const className = `p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0 ${toneClasses}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label} className={className}>
        <Icon size={15} />
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      <Icon size={15} />
    </button>
  );
};

const FileCard = ({ file, onDelete, onShare, isAdmin = false, index = 0 }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = file.shareToken
    ? `${window.location.origin}/share/${file.shareToken}`
    : null;

  const viewable =
    file.shareToken &&
    file.itemType !== 'video' &&
    file.isViewable;

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const countdown = formatCountdown(file.expiresAt);
  const isExpiringSoon =
    file.expiresAt &&
    new Date(file.expiresAt) - new Date() < 2 * 60 * 60 * 1000;

  return (
    <div
      className="card group min-w-0 overflow-hidden animate-slide-up transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 hover:border-brand-600/40"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms`, animationFillMode: 'backwards' }}
    >
      {/* ================= FILE INFO ================= */}
      <div className="flex items-start gap-3 min-w-0">
        {/* File Icon tile */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border transition-transform duration-300 group-hover:scale-105 ${getTileClasses(file.mimeType)}`}
        >
          {getMimeIcon(file.mimeType)}
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Filename + Video Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="text-sm font-semibold text-white truncate min-w-0 flex-1"
              title={file.originalName}
            >
              {truncateFilename(file.originalName, 32)}
            </p>

            {file.itemType === 'video' && (
              <span className="badge badge-purple flex-shrink-0 text-[10px]">
                Video
              </span>
            )}
          </div>

          {/* Size + Uploaded Time */}
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="text-xs text-gray-500 font-mono flex-shrink-0">
              {formatBytes(file.size)}
            </span>
            <span className="text-vault-border flex-shrink-0">•</span>
            <span className="text-xs text-gray-500 truncate">
              {formatRelativeTime(file.uploadedAt)}
            </span>
          </div>

          {/* Admin Owner */}
          {isAdmin && file.owner && (
            <p
              className="text-xs text-gray-600 mt-1 truncate"
              title={file.owner.name || file.owner.email}
            >
              Owner: {file.owner.name || file.owner.email}
            </p>
          )}
        </div>
      </div>

      {/* ================= META CHIPS ================= */}
      {(file.expiresAt || file.itemType !== 'video') && (
        <div className="flex items-center flex-wrap gap-1.5 mt-3">
          {file.expiresAt && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors duration-300 ${
                isExpiringSoon
                  ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50'
                  : 'text-gray-500 bg-vault-dark/60 border-vault-border'
              }`}
            >
              <Clock size={10} className="flex-shrink-0" />
              {countdown === 'Expired' ? 'Expired' : countdown}
            </span>
          )}

          {file.itemType !== 'video' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-500 bg-vault-dark/60 border border-vault-border">
              <Download size={10} className="flex-shrink-0" />
              {file.downloadCount || 0}
            </span>
          )}
        </div>
      )}

      {/* ================= ACTIONS ================= */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-vault-border">
        <div className="flex items-center gap-1">
          {shareUrl && (
            <ActionButton
              onClick={handleCopyLink}
              icon={copied ? Check : Copy}
              label={copied ? 'Copied' : 'Copy link'}
              tone={copied ? 'success' : 'default'}
            />
          )}

          {onShare && file.itemType !== 'video' && (
            <ActionButton onClick={() => onShare(file)} icon={Share2} label="Share" />
          )}

          {viewable && (
            <ActionButton
              href={filesAPI.getViewUrl(file.shareToken)}
              icon={Eye}
              label="View"
            />
          )}
        </div>

        <ActionButton onClick={() => onDelete(file)} icon={Trash2} label="Delete" tone="danger" />
      </div>
    </div>
  );
};

export default FileCard;
