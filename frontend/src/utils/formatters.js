export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const formatCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getMimeIcon = (mimeType) => {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📑';
  if (mimeType.includes('text/')) return '📄';
  return '📦';
};

export const getMimeColor = (mimeType) => {
  if (!mimeType) return 'text-gray-400';
  if (mimeType.startsWith('image/')) return 'text-purple-400';
  if (mimeType.startsWith('video/')) return 'text-blue-400';
  if (mimeType.startsWith('audio/')) return 'text-pink-400';
  if (mimeType.includes('pdf')) return 'text-red-400';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'text-yellow-400';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-300';
  return 'text-gray-400';
};

export const truncateFilename = (name, maxLen = 30) => {
  if (!name || name.length <= maxLen) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.slice(0, maxLen - ext.length - 3);
  return `${base}...${ext}`;
};

export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'Something went wrong';
};
