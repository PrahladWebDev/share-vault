import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { filesAPI } from '../../api/files';
import { formatBytes, getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Upload, X, FileCheck, AlertTriangle, CloudUpload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MAX_USER_SIZE = 500 * 1024 * 1024; // 500 MB

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: limitData } = useQuery({
    queryKey: ['upload-limit'],
    queryFn: () => filesAPI.getUploadLimit().then((r) => r.data.data),
    enabled: !isAdmin,
  });

  const handleFileSelect = useCallback((selected) => {
    if (!selected) return;

    if (!isAdmin && selected.size > MAX_USER_SIZE) {
      toast.error(`File too large. Maximum size is ${formatBytes(MAX_USER_SIZE)}.`);
      return;
    }

    setFile(selected);
    setUploadedFile(null);
    setProgress(0);
  }, [isAdmin]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;

    if (!isAdmin && limitData?.limitReached) {
      toast.error('Daily upload limit reached. Try again after 24 hours.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await filesAPI.upload(formData, (pct) => setProgress(pct));
      const uploaded = res.data.data.file;

      setUploadedFile(uploaded);
      setFile(null);
      setProgress(100);
      toast.success('File uploaded successfully!');

      qc.invalidateQueries(['dashboard-stats']);
      qc.invalidateQueries(['my-files']);
      qc.invalidateQueries(['upload-limit']);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const shareUrl = uploadedFile?.shareToken
    ? `${window.location.origin}/share/${uploadedFile.shareToken}`
    : null;

  const limitReached = !isAdmin && limitData?.limitReached;

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload File</h1>
        <p className="text-gray-400 text-sm mt-1">
          {isAdmin ? 'Unlimited uploads with no size restrictions' : `${limitData?.remaining ?? 2} of 2 uploads remaining today`}
        </p>
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

      {/* Upload success */}
      {uploadedFile && (
        <div className="mb-6 p-5 bg-emerald-900/20 border border-emerald-800/40 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Upload complete!</p>
              <p className="text-xs text-emerald-600">{formatBytes(uploadedFile.size)}</p>
            </div>
          </div>
          {shareUrl && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Share link (anyone can download):</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input-field text-xs font-mono"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Copied!');
                  }}
                  className="btn-secondary text-xs flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setUploadedFile(null); setFile(null); }}
              className="btn-secondary text-xs"
            >
              Upload another
            </button>
            <button onClick={() => navigate('/files')} className="btn-primary text-xs">
              View my files
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!uploadedFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer text-center ${
            isDragging
              ? 'border-brand-500 bg-brand-900/20'
              : file
              ? 'border-vault-border bg-vault-panel cursor-default'
              : limitReached
              ? 'border-vault-border opacity-50 cursor-not-allowed'
              : 'border-vault-border hover:border-brand-600/50 hover:bg-brand-900/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            disabled={limitReached || isUploading}
          />

          {!file ? (
            <div className="flex flex-col items-center">
              <div className="p-4 bg-vault-muted rounded-full mb-4 border border-vault-border">
                <CloudUpload className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-base font-medium text-white mb-1">
                {isDragging ? 'Drop to upload' : 'Drop your file here'}
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-600 mt-3">
                {isAdmin ? 'Any file type, any size' : `Up to ${formatBytes(MAX_USER_SIZE)} · All file types`}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-brand-900/40 rounded-xl border border-brand-800/40">
                  <Upload className="h-6 w-6 text-brand-400" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
                {!isUploading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-vault-muted transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {isUploading && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-vault-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-brand-600 to-brand-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                disabled={isUploading || limitReached}
                className="btn-primary w-full py-3"
              >
                {isUploading ? (
                  <>
                    <Spinner size="sm" />
                    Uploading... {progress}%
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload File
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {!isAdmin && (
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
