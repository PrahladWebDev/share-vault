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

const FileCard = ({ file, onDelete, onShare, isAdmin = false }) => {
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

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const countdown = formatCountdown(file.expiresAt);

  const isExpiringSoon =
    file.expiresAt &&
    new Date(file.expiresAt) - new Date() <
      2 * 60 * 60 * 1000;

  return (
    <div
      className="
        card
        group
        min-w-0
        overflow-hidden
        hover:border-vault-muted
        transition-colors
      "
    >
      {/* ================= FILE INFO ================= */}
      <div className="flex items-start gap-3 min-w-0">
        {/* File Icon */}
        <div className="text-3xl flex-shrink-0 mt-0.5">
          {getMimeIcon(file.mimeType)}
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Filename + Video Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="
                text-sm
                font-medium
                text-white
                truncate
                min-w-0
                flex-1
              "
              title={file.originalName}
            >
              {truncateFilename(file.originalName, 32)}
            </p>

            {file.itemType === 'video' && (
              <span
                className="
                  badge
                  badge-purple
                  flex-shrink-0
                  text-[10px]
                "
              >
                Video
              </span>
            )}
          </div>

          {/* Size + Uploaded Time */}
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatBytes(file.size)}
            </span>

            <span className="text-gray-700 flex-shrink-0">
              •
            </span>

            <span className="text-xs text-gray-500 truncate">
              {formatRelativeTime(file.uploadedAt)}
            </span>
          </div>

          {/* Expiration */}
          {file.expiresAt && (
            <div
              className={`
                flex
                items-center
                gap-1.5
                mt-2
                min-w-0
                ${
                  isExpiringSoon
                    ? 'text-yellow-400'
                    : 'text-gray-500'
                }
              `}
            >
              <Clock
                size={12}
                className="flex-shrink-0"
              />

              <span className="text-xs truncate">
                {countdown === 'Expired'
                  ? 'Expired'
                  : `Expires in ${countdown}`}
              </span>
            </div>
          )}

          {/* Admin Owner */}
          {isAdmin && file.owner && (
            <p
              className="
                text-xs
                text-gray-600
                mt-1
                truncate
              "
              title={file.owner.name || file.owner.email}
            >
              Owner: {file.owner.name || file.owner.email}
            </p>
          )}
        </div>
      </div>

      {/* ================= DOWNLOAD COUNT ================= */}
      {file.itemType !== 'video' && (
        <div className="flex items-center gap-1 mt-3 min-w-0">
          <Download
            size={12}
            className="text-gray-600 flex-shrink-0"
          />

          <span className="text-xs text-gray-600 truncate">
            {file.downloadCount || 0} downloads
          </span>
        </div>
      )}

      {/* ================= ACTIONS ================= */}
      <div
        className="
          grid
          grid-cols-2
          gap-2
          mt-3
          pt-3
          border-t
          border-vault-border
          min-w-0
        "
      >
        {/* Copy Link */}
        {shareUrl && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="
              w-full
              min-w-0
              flex
              items-center
              justify-center
              gap-1.5
              px-2
              py-1.5
              rounded-md
              text-xs
              font-medium
              text-gray-400
              hover:text-white
              hover:bg-vault-muted
              transition-colors
            "
          >
            {copied ? (
              <Check
                size={13}
                className="text-green-400 flex-shrink-0"
              />
            ) : (
              <Copy
                size={13}
                className="flex-shrink-0"
              />
            )}

            <span className="truncate">
              {copied ? 'Copied' : 'Copy Link'}
            </span>
          </button>
        )}

        {/* Share */}
        {onShare && file.itemType !== 'video' && (
          <button
            type="button"
            onClick={() => onShare(file)}
            className="
              w-full
              min-w-0
              flex
              items-center
              justify-center
              gap-1.5
              px-2
              py-1.5
              rounded-md
              text-xs
              font-medium
              text-gray-400
              hover:text-white
              hover:bg-vault-muted
              transition-colors
            "
          >
            <Share2
              size={13}
              className="flex-shrink-0"
            />

            <span className="truncate">
              Share
            </span>
          </button>
        )}

        {/* View */}
        {viewable && (
          <a
            href={filesAPI.getViewUrl(file.shareToken)}
            target="_blank"
            rel="noreferrer"
            className="
              w-full
              min-w-0
              flex
              items-center
              justify-center
              gap-1.5
              px-2
              py-1.5
              rounded-md
              text-xs
              font-medium
              text-gray-400
              hover:text-white
              hover:bg-vault-muted
              transition-colors
            "
          >
            <Eye
              size={13}
              className="flex-shrink-0"
            />

            <span className="truncate">
              View
            </span>
          </a>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(file)}
          className="
            w-full
            min-w-0
            flex
            items-center
            justify-center
            gap-1.5
            px-2
            py-1.5
            rounded-md
            text-xs
            font-medium
            text-gray-500
            hover:text-red-400
            hover:bg-red-900/20
            transition-colors
          "
        >
          <Trash2
            size={13}
            className="flex-shrink-0"
          />

          <span className="truncate">
            Delete
          </span>
        </button>
      </div>
    </div>
  );
};

export default FileCard;
