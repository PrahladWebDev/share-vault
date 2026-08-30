import { useState } from 'react';
import {
  Download,
  Trash2,
  Share2,
  Clock,
  Copy,
  Check,
  Eye,
  MoreVertical,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
} from 'lucide-react';
import { formatBytes, formatCountdown, formatRelativeTime, truncateFilename } from '../../utils/formatters';
import { filesAPI } from '../../api/files';
import toast from 'react-hot-toast';

// CSS animations
const animationStyles = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes popIn {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .card-animate-in {
    animation: slideUp 0.3s ease-out forwards;
  }

  .icon-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .icon-hover:hover {
    transform: scale(1.1) rotate(5deg);
  }

  .button-pop {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .button-pop:hover {
    transform: scale(1.05);
  }

  .button-pop:active {
    transform: scale(0.95);
  }

  .pulse-badge {
    animation: pulse 0.5s ease-in-out 3;
  }

  .dropdown-enter {
    animation: slideDown 0.2s ease-out forwards;
  }

  .copy-success {
    animation: shake 0.3s ease-in-out;
  }
`;

const FileCard = ({ file, onDelete, onShare, isAdmin = false }) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

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
  const isExpiringSoon = file.expiresAt &&
    new Date(file.expiresAt) - new Date() < 2 * 60 * 60 * 1000;

  const getFileIcon = () => {
    const mimeType = file.mimeType || '';
    if (mimeType.startsWith('image/')) return <FileImage size={32} className="text-blue-400" />;
    if (mimeType.startsWith('video/')) return <FileVideo size={32} className="text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <FileAudio size={32} className="text-green-400" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))
      return <FileArchive size={32} className="text-yellow-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('doc') || mimeType.includes('txt'))
      return <FileText size={32} className="text-orange-400" />;
    return <File size={32} className="text-gray-400" />;
  };

  const actions = [
    {
      id: 'copy',
      icon: copied ? Check : Copy,
      label: copied ? 'Copied' : 'Copy Link',
      onClick: handleCopyLink,
      show: !!shareUrl,
      color: copied ? 'text-green-400' : 'text-gray-400',
      hoverColor: 'hover:text-white',
      bgHover: 'hover:bg-[#3a3a5a]',
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Share',
      onClick: () => onShare?.(file),
      show: !!onShare && file.itemType !== 'video',
      color: 'text-gray-400',
      hoverColor: 'hover:text-white',
      bgHover: 'hover:bg-[#3a3a5a]',
    },
    {
      id: 'view',
      icon: Eye,
      label: 'View',
      onClick: () => window.open(filesAPI.getViewUrl(file.shareToken), '_blank'),
      show: viewable,
      color: 'text-gray-400',
      hoverColor: 'hover:text-white',
      bgHover: 'hover:bg-[#3a3a5a]',
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      onClick: () => onDelete(file),
      show: true,
      color: 'text-gray-500',
      hoverColor: 'hover:text-red-400',
      bgHover: 'hover:bg-red-900/20',
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <>
      <style>{animationStyles}</style>
      
      <div
        className="card-animate-in relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`
            bg-[#1a1a2e] 
            rounded-2xl 
            border 
            border-[#2a2a4a] 
            p-5
            transition-all 
            duration-300 
            ease-in-out
            ${isHovered ? 'border-[#3a3a6a] shadow-lg shadow-purple-900/10' : ''}
            ${isExpiringSoon ? 'border-yellow-500/30' : ''}
          `}
        >
          {/* Main Content */}
          <div className="flex items-start gap-4">
            {/* File Icon */}
            <div className="relative flex-shrink-0">
              <div
                className="
                  w-14 
                  h-14 
                  rounded-xl 
                  bg-[#2a2a4a] 
                  flex 
                  items-center 
                  justify-center
                  border 
                  border-[#3a3a5a]
                  icon-hover
                "
              >
                {getFileIcon()}
              </div>
              {file.itemType === 'video' && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-purple-500 rounded-full text-[8px] font-bold text-white">
                  HD
                </span>
              )}
            </div>

            {/* File Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="
                      text-sm 
                      font-semibold 
                      text-white 
                      truncate
                      transition-colors
                      duration-200
                    "
                    title={file.originalName}
                  >
                    {truncateFilename(file.originalName, 30)}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </span>
                    <span className="text-[#3a3a5a]">•</span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(file.uploadedAt)}
                    </span>
                    {file.downloadCount > 0 && file.itemType !== 'video' && (
                      <>
                        <span className="text-[#3a3a5a]">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Download size={10} />
                          {file.downloadCount}
                        </span>
                      </>
                    )}
                  </div>

                  {isAdmin && file.owner && (
                    <p
                      className="text-xs text-gray-600 mt-1 truncate"
                      title={file.owner.name || file.owner.email}
                    >
                      Owner: {file.owner.name || file.owner.email}
                    </p>
                  )}
                </div>

                {/* Expiration Badge */}
                {file.expiresAt && (
                  <div
                    className={`
                      flex-shrink-0 
                      flex 
                      items-center 
                      gap-1.5 
                      px-2.5 
                      py-1 
                      rounded-full
                      text-[10px]
                      font-medium
                      transition-all
                      duration-300
                      ${isExpiringSoon 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 pulse-badge' 
                        : 'bg-[#2a2a4a] text-gray-500'
                      }
                    `}
                  >
                    <Clock size={12} className="flex-shrink-0" />
                    <span>
                      {countdown === 'Expired' ? 'Expired' : countdown}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
            <div className="flex flex-wrap gap-2">
              {/* Primary Actions */}
              <div className="flex flex-wrap gap-2 flex-1">
                {visibleActions.slice(0, 3).map((action, index) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={`
                      flex-1 
                      min-w-[60px]
                      flex 
                      items-center 
                      justify-center
                      gap-1.5 
                      px-3 
                      py-2 
                      rounded-lg
                      text-xs
                      font-medium
                      transition-all
                      duration-200
                      bg-[#2a2a4a]
                      ${action.color}
                      ${action.hoverColor}
                      ${action.bgHover}
                      border
                      border-transparent
                      hover:border-[#4a4a6a]
                      button-pop
                      ${action.id === 'delete' ? 'hover:border-red-500/30' : ''}
                      ${action.id === 'copy' && copied ? 'copy-success' : ''}
                    `}
                    style={{
                      animationDelay: `${index * 0.05}s`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <action.icon size={14} className="flex-shrink-0" />
                    <span className="hidden sm:inline">{action.label}</span>
                    <span className="sm:hidden">
                      {action.id === 'copy' && copied ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>

              {/* More Actions Dropdown */}
              {visibleActions.length > 3 && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className={`
                      px-3 
                      py-2 
                      rounded-lg
                      bg-[#2a2a4a]
                      text-gray-400
                      hover:text-white
                      hover:bg-[#3a3a5a]
                      transition-all
                      duration-200
                      border
                      border-transparent
                      hover:border-[#4a4a6a]
                      button-pop
                    `}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showActions && (
                    <div
                      className="
                        absolute 
                        right-0 
                        mt-2 
                        w-48 
                        bg-[#1a1a2e]
                        border 
                        border-[#2a2a4a]
                        rounded-xl
                        shadow-xl
                        overflow-hidden
                        z-10
                        dropdown-enter
                      "
                    >
                      {visibleActions.slice(3).map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            action.onClick();
                            setShowActions(false);
                          }}
                          className={`
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-2.5
                            text-xs
                            font-medium
                            transition-all
                            duration-150
                            ${action.color}
                            ${action.hoverColor}
                            ${action.bgHover}
                            border-b
                            border-[#2a2a4a]
                            last:border-0
                          `}
                        >
                          <action.icon size={14} />
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Responsive Download Count for Video */}
          {file.itemType === 'video' && file.downloadCount > 0 && (
            <div 
              className="flex items-center gap-1 mt-2 animate-pop-in"
              style={{
                animation: 'popIn 0.3s ease-out forwards'
              }}
            >
              <Download size={12} className="text-gray-600" />
              <span className="text-xs text-gray-600">
                {file.downloadCount} downloads
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FileCard;
