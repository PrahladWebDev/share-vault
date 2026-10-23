import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { filesAPI } from '../api/files';
import { formatBytes, formatDateTime, getMimeIcon } from '../utils/formatters';
import Spinner from '../components/ui/Spinner';
import { Download, Vault, Clock, FileX, Eye } from 'lucide-react';

const ShareDownloadPage = () => {
  const { token } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await filesAPI.getFileInfo(token);
        setFileInfo(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'File not found or link has expired');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleDownload = () => {
    setIsDownloading(true);
    const downloadUrl = `${process.env.REACT_APP_API_URL}/files/share/${token}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileInfo?.originalName || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const viewUrl = `${process.env.REACT_APP_API_URL}/files/share/${token}?view=1`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-dark app-backdrop flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-brand-400" />
          <p className="text-sm text-gray-400">Loading file info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vault-dark app-backdrop flex flex-col items-center justify-center px-6">
        <div className="surface w-full max-w-md text-center p-10 animate-slide-up">
          <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-red-500/15 flex items-center justify-center">
            <FileX className="h-10 w-10 text-red-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">File Not Available</h1>
          <p className="text-gray-400 text-sm mb-7">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/" className="btn-secondary">Go Home</Link>
            <Link to="/register" className="btn-primary">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark app-backdrop flex flex-col">
      {/* Top app bar */}
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-vault-border/60 bg-vault-panel/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-black/30">
            <Vault className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">ShareVault</span>
        </div>
        <Link to="/register" className="btn-text !min-h-[36px] !px-4 !py-1 text-xs">
          Create free account →
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="surface text-center p-7 sm:p-8 animate-slide-up">
            {/* File icon */}
            <div className="mx-auto mb-5 h-24 w-24 rounded-[28px] bg-brand-600/15 flex items-center justify-center text-5xl">
              {getMimeIcon(fileInfo?.mimeType)}
            </div>

            {/* File info */}
            <h1 className="text-xl font-bold text-white mb-1.5 break-all tracking-tight">
              {fileInfo?.originalName}
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              {formatBytes(fileInfo?.size)} · shared by {fileInfo?.ownerName}
            </p>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-3 bg-brand-600/10 rounded-2xl">
                <p className="text-lg font-bold text-white font-mono">{fileInfo?.downloadCount || 0}</p>
                <p className="text-xs text-gray-400">Downloads</p>
              </div>
              <div className="p-3 bg-brand-600/10 rounded-2xl">
                <p className="text-xs font-semibold text-white mb-0.5 leading-6">
                  {new Date(fileInfo?.uploadedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">Uploaded</p>
              </div>
              <div className="p-3 bg-brand-600/10 rounded-2xl">
                {fileInfo?.expiresAt ? (
                  <>
                    <p className="text-xs font-semibold text-yellow-300 mb-0.5 leading-6">
                      {new Date(fileInfo.expiresAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">Expires</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-emerald-300 mb-0.5 leading-6">Never</p>
                    <p className="text-xs text-gray-400">Expires</p>
                  </>
                )}
              </div>
            </div>

            {fileInfo?.expiresAt && (
              <div className="inline-flex items-center gap-2 justify-center mb-6 px-3 py-1.5 rounded-full bg-yellow-500/10 text-xs text-yellow-300">
                <Clock size={13} />
                Link expires {formatDateTime(fileInfo.expiresAt)}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              {fileInfo?.isViewable && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary flex-1 min-h-[48px] text-base"
                >
                  <Eye size={18} />
                  View
                </a>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-primary flex-1 min-h-[48px] text-base"
              >
                {isDownloading ? (
                  <>
                    <Spinner size="sm" />
                    Starting download...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-5">No account needed · Safe to download</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShareDownloadPage;
