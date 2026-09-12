import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { filesAPI } from '../../api/files';
import { formatBytes, getErrorMessage, getMimeIcon } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  Upload,
  X,
  FileCheck,
  AlertTriangle,
  CloudUpload,
  Copy,
  Check,
  Eye,
  ExternalLink,
  XCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MAX_USER_SIZE = 500 * 1024 * 1024; // 500 MB

// Per-item statuses: 'pending' | 'uploading' | 'done' | 'error' | 'skipped'
let nextId = 0;
const makeQueueItem = (file) => ({
  id: `${Date.now()}-${nextId++}`,
  file,
  status: 'pending',
  progress: 0,
  result: null, // { originalName, size, shareToken, shareUrl, isViewable, mimeType }
  error: null,
});

const UploadPage = () => {
  const [queue, setQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: limitData, refetch: refetchLimit } = useQuery({
    queryKey: ['upload-limit'],
    queryFn: () => filesAPI.getUploadLimit().then((r) => r.data.data),
    enabled: !isAdmin,
  });

  const hasQueue = queue.length > 0;
  const completed = queue.filter((q) => q.status === 'done');
  const failed = queue.filter((q) => q.status === 'error');
  const skipped = queue.filter((q) => q.status === 'skipped');

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    for (const f of incoming) {
      if (!isAdmin && f.size > MAX_USER_SIZE) {
        toast.error(`"${f.name}" is too large. Maximum size is ${formatBytes(MAX_USER_SIZE)}.`);
        continue;
      }
      accepted.push(makeQueueItem(f));
    }
    if (!accepted.length) return;

    setBatchDone(false);
    setQueue((prev) => [...prev, ...accepted]);
  }, [isAdmin]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    addFiles(e.dataTransfer.files);
  }, [addFiles, isUploading]);

  const removeItem = (id) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const clearAll = () => {
    setQueue([]);
    setBatchDone(false);
  };

  const updateItem = (id, patch) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const handleUploadAll = async () => {
    const pending = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    if (!pending.length) return;

    setIsUploading(true);
    setBatchDone(false);

    let limitReachedMidBatch = false;

    for (const item of pending) {
      if (limitReachedMidBatch) {
        updateItem(item.id, { status: 'skipped', error: 'Daily upload limit reached' });
        continue;
      }

      updateItem(item.id, { status: 'uploading', progress: 0, error: null });

      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const res = await filesAPI.upload(formData, (pct) =>
          updateItem(item.id, { progress: pct })
        );
        const uploaded = res.data.data.file;

        updateItem(item.id, { status: 'done', progress: 100, result: uploaded });
      } catch (err) {
        if (err?.response?.status === 429) {
          limitReachedMidBatch = true;
          updateItem(item.id, { status: 'skipped', error: 'Daily upload limit reached' });
        } else {
          updateItem(item.id, { status: 'error', error: getErrorMessage(err) });
        }
      }
    }

    setIsUploading(false);
    setBatchDone(true);

    qc.invalidateQueries(['dashboard-stats']);
    qc.invalidateQueries(['my-files']);
    if (!isAdmin) refetchLimit();
  };

  const handleCopyLink = (item) => {
    if (!item.result?.shareUrl) return;
    navigator.clipboard.writeText(item.result.shareUrl);
    setCopiedId(item.id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    const lines = completed
      .filter((q) => q.result?.shareUrl)
      .map((q) => `${q.result.originalName} - ${q.result.shareUrl}`);
    if (!lines.length) return;
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    toast.success('All links copied!');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const limitReached = !isAdmin && limitData?.limitReached;
  const allSettled = hasQueue && queue.every((q) => ['done', 'error', 'skipped'].includes(q.status));

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Files</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isAdmin ? 'Unlimited uploads with no size restrictions' : `${limitData?.remaining ?? 2} of 2 uploads remaining today`}
          </p>
        </div>
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Daily limit reached</p>
            <p className="text-xs text-yellow-500 mt-0.5">You've used both uploads for the current 24-hour window.</p>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center ${
          isUploading ? 'cursor-default opacity-70' : 'cursor-pointer'
        } ${
          isDragging
            ? 'border-brand-500 bg-brand-900/20 scale-[1.02] animate-drop-glow'
            : limitReached
            ? 'border-vault-border opacity-50 cursor-not-allowed'
            : 'border-vault-border hover:border-brand-600/50 hover:bg-brand-900/10 hover:scale-[1.01]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          disabled={limitReached || isUploading}
        />

        <div className="flex flex-col items-center">
          <div
            className={`p-4 rounded-full mb-4 border transition-all duration-300 ${
              isDragging
                ? 'bg-brand-600/20 border-brand-500/50 animate-float'
                : 'bg-vault-muted border-vault-border'
            }`}
          >
            <CloudUpload className={`h-10 w-10 transition-colors duration-300 ${isDragging ? 'text-brand-400' : 'text-gray-500'}`} />
          </div>
          <p className="text-base font-medium text-white mb-1">
            {isDragging ? 'Drop to add' : 'Drop files here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse · select multiple files</p>
          <p className="text-xs text-gray-600 mt-3">
            {isAdmin ? 'Any file type, any size' : `Up to ${formatBytes(MAX_USER_SIZE)} each · All file types`}
          </p>
        </div>
      </div>

      {/* Queue */}
      {hasQueue && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-300">
              {queue.length} file{queue.length !== 1 ? 's' : ''} selected
            </p>
            {!isUploading && (
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {queue.map((item) => (
            <div key={item.id} className="card py-3 px-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="text-xl flex-shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-pop-in" />
                  ) : item.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : item.status === 'skipped' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  ) : item.status === 'uploading' ? (
                    <Loader2 className="h-5 w-5 text-brand-400 animate-spin" />
                  ) : (
                    getMimeIcon(item.file.type)
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(item.file.size)}
                    {item.status === 'uploading' && ` · Uploading ${item.progress}%`}
                    {item.status === 'error' && ` · ${item.error}`}
                    {item.status === 'skipped' && ` · ${item.error}`}
                    {item.status === 'done' && ' · Uploaded'}
                  </p>
                  {item.status === 'uploading' && (
                    <div className="w-full bg-vault-muted rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="relative bg-gradient-to-r from-brand-600 to-brand-400 h-1.5 rounded-full transition-all duration-300 overflow-hidden"
                        style={{ width: `${item.progress}%` }}
                      >
                        <div className="absolute inset-0 progress-stripes animate-progress-stripes" />
                      </div>
                    </div>
                  )}
                </div>

                {item.status === 'pending' && !isUploading && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-vault-muted transition-colors flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Per-file result: share link + view */}
              {item.status === 'done' && item.result?.shareUrl && (
                <div className="mt-3 pt-3 border-t border-vault-border flex items-center gap-2 animate-fade-in">
                  <input
                    type="text"
                    readOnly
                    value={item.result.shareUrl}
                    className="input-field text-xs font-mono py-1.5"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => handleCopyLink(item)}
                    className="btn-secondary text-xs flex-shrink-0 py-1.5"
                  >
                    {copiedId === item.id ? <Check size={13} className="text-green-300" /> : <Copy size={13} />}
                  </button>
                  {item.result.isViewable && (
                    <a
                      href={filesAPI.getViewUrl(item.result.shareToken)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs flex-shrink-0 py-1.5"
                    >
                      <Eye size={13} />
                      View
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}

          {!allSettled && (
            <button
              onClick={handleUploadAll}
              disabled={isUploading || limitReached}
              className="btn-primary w-full py-3 mt-3"
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" />
                  Uploading {completed.length}/{queue.length}...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload {queue.length} File{queue.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* All uploads complete — share-all summary */}
      {batchDone && completed.length > 0 && (
        <div className="mt-6 p-5 bg-emerald-900/20 border border-emerald-800/40 rounded-xl animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-emerald-400 flex-shrink-0 animate-pop-in" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  {completed.length} file{completed.length !== 1 ? 's' : ''} uploaded successfully
                </p>
                {(failed.length > 0 || skipped.length > 0) && (
                  <p className="text-xs text-yellow-500 mt-0.5">
                    {failed.length > 0 && `${failed.length} failed`}
                    {failed.length > 0 && skipped.length > 0 && ' · '}
                    {skipped.length > 0 && `${skipped.length} skipped (limit reached)`}
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleCopyAllLinks} className="btn-secondary text-xs flex-shrink-0">
              {copiedAll ? <Check size={13} className="text-green-300" /> : <Copy size={13} />}
              Copy All Links
            </button>
          </div>

          <div className="space-y-2">
            {completed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 bg-vault-dark/60 rounded-lg border border-vault-border"
              >
                <span className="text-lg flex-shrink-0">{getMimeIcon(item.result?.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.result?.originalName}</p>
                  <p className="text-[11px] text-gray-500 truncate font-mono">{item.result?.shareUrl}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.result?.isViewable && (
                    <a
                      href={filesAPI.getViewUrl(item.result.shareToken)}
                      target="_blank"
                      rel="noreferrer"
                      title="View"
                      className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
                    >
                      <Eye size={14} />
                    </a>
                  )}
                  <a
                    href={item.result?.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open share page"
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => handleCopyLink(item)}
                    title="Copy link"
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
                  >
                    {copiedId === item.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={clearAll} className="btn-secondary text-xs">
              Upload more
            </button>
            <button onClick={() => navigate('/files')} className="btn-primary text-xs">
              View my files
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {!isAdmin && !hasQueue && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white font-mono">{limitData?.remaining ?? 2}</p>
            <p className="text-xs text-gray-500 mt-0.5">Uploads left today</p>
          </div>
          <div className="card text-center">
            <p className="text-sm font-bold text-white">24h</p>
            <p className="text-xs text-gray-500 mt-0.5">Auto-expiry on upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
