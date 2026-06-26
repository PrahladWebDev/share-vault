import { useState } from 'react';
import { Download, Trash2, Share2, Clock, Copy, Check } from 'lucide-react';
import { formatBytes, formatCountdown, formatRelativeTime, getMimeIcon, truncateFilename } from '../../utils/formatters';
import toast from 'react-hot-toast';

const FileCard = ({ file, onDelete, onShare, isAdmin = false }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = file.shareToken
    ? `${window.location.origin}/share/${file.shareToken}`
    : null;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const countdown = formatCountdown(file.expiresAt);
  const isExpiringSoon = file.expiresAt && (new Date(file.expiresAt) - new Date()) < 2 * 60 * 60 * 1000;

  return (
    <div className="card hover:border-vault-muted transition-colors group">
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0 mt-0.5">{getMimeIcon(file.mimeType)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" title={file.originalName}>
            {truncateFilename(file.originalName, 32)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
            <span className="text-gray-700">•</span>
            <span className="text-xs text-gray-500">{formatRelativeTime(file.uploadedAt)}</span>
          </div>

          {file.expiresAt && (
            <div className={`flex items-center gap-1.5 mt-2 ${isExpiringSoon ? 'text-yellow-400' : 'text-gray-500'}`}>
              <Clock size={12} />
              <span className="text-xs">
                {countdown === 'Expired' ? 'Expired' : `Expires in ${countdown}`}
              </span>
            </div>
          )}

          {isAdmin && file.owner && (
            <p className="text-xs text-gray-600 mt-1">
              Owner: {file.owner.name || file.owner.email}
            </p>
          )}
        </div>
      </div>

      {/* Download count */}
      <div className="flex items-center gap-1 mt-3">
        <Download size={12} className="text-gray-600" />
        <span className="text-xs text-gray-600">{file.downloadCount || 0} downloads</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-vault-border">
        {shareUrl && (
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        )}
        {onShare && (
          <button
            onClick={() => onShare(file)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
          >
            <Share2 size={13} />
            Share
          </button>
        )}
        <button
          onClick={() => onDelete(file)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default FileCard;
