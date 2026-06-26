import { useState } from 'react';
import { Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { filesAPI } from '../../api/files';
import { adminAPI } from '../../api/admin';
import { formatDateTime, formatCountdown } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ShareDialog = ({ file, onClose, isAdmin = false }) => {
  const [shareToken, setShareToken] = useState(file?.shareToken);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRegenerateLink = async () => {
    setIsRegenerating(true);
    try {
      const api = isAdmin ? adminAPI : filesAPI;
      const res = await filesAPI.generateShareLink(file._id);
      setShareToken(res.data.data.shareToken);
      toast.success('New share link generated!');
    } catch (err) {
      toast.error('Failed to generate new link');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Share File" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-300 mb-1">{file?.originalName}</p>
          {file?.expiresAt && (
            <p className="text-xs text-yellow-400 flex items-center gap-1">
              ⏱ Expires in {formatCountdown(file.expiresAt)} · {formatDateTime(file.expiresAt)}
            </p>
          )}
          {!file?.expiresAt && (
            <p className="text-xs text-emerald-400">✓ No expiry (admin file)</p>
          )}
        </div>

        {shareUrl ? (
          <div>
            <label className="label">Share Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="input-field text-xs font-mono truncate"
              />
              <button onClick={handleCopy} className="btn-primary flex-shrink-0 px-3">
                {copied ? <Check size={16} className="text-green-300" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Anyone with this link can download the file — no login required.
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No share link available.</p>
          </div>
        )}

        <div className="flex gap-2">
          {shareUrl && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex-1 text-xs"
            >
              <ExternalLink size={14} />
              Open Link
            </a>
          )}
          <button
            onClick={handleRegenerateLink}
            disabled={isRegenerating}
            className="btn-secondary flex-1 text-xs"
          >
            {isRegenerating ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            New Link
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareDialog;
