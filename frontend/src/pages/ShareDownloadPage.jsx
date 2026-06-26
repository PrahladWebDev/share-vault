import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { filesAPI } from '../api/files';
import { formatBytes, formatDateTime, getMimeIcon } from '../utils/formatters';
import Spinner from '../components/ui/Spinner';
import { Download, Vault, Clock, FileX } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-brand-500" />
          <p className="text-sm text-gray-500">Loading file info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vault-dark flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="p-4 bg-vault-panel rounded-2xl border border-vault-border mb-6 inline-block">
            <FileX className="h-12 w-12 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">File Not Available</h1>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="btn-secondary text-sm">Go Home</Link>
            <Link to="/register" className="btn-primary text-sm">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark flex flex-col">
      {/* Nav */}
      <nav className="border-b border-vault-border bg-vault-panel px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-brand-600 rounded-lg">
            <Vault className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">ShareVault</span>
        </div>
        <Link to="/register" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          Create free account →
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card text-center">
            {/* File icon */}
            <div className="text-6xl mb-4">{getMimeIcon(fileInfo?.mimeType)}</div>

            {/* File info */}
            <h1 className="text-lg font-bold text-white mb-1 break-all">
              {fileInfo?.originalName}
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              {formatBytes(fileInfo?.size)} · shared by {fileInfo?.ownerName}
            </p>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-3 bg-vault-dark rounded-xl border border-vault-border">
                <p className="text-lg font-bold text-white font-mono">{fileInfo?.downloadCount || 0}</p>
                <p className="text-xs text-gray-500">Downloads</p>
              </div>
              <div className="p-3 bg-vault-dark rounded-xl border border-vault-border">
                <p className="text-xs font-medium text-white mb-0.5">
                  {new Date(fileInfo?.uploadedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">Uploaded</p>
              </div>
              <div className="p-3 bg-vault-dark rounded-xl border border-vault-border">
                {fileInfo?.expiresAt ? (
                  <>
                    <p className="text-xs font-medium text-yellow-400 mb-0.5">
                      {new Date(fileInfo.expiresAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">Expires</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-emerald-400 mb-0.5">Never</p>
                    <p className="text-xs text-gray-500">Expires</p>
                  </>
                )}
              </div>
            </div>

            {fileInfo?.expiresAt && (
              <div className="flex items-center gap-2 justify-center mb-5 text-xs text-yellow-500">
                <Clock size={13} />
                Link expires {formatDateTime(fileInfo.expiresAt)}
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="btn-primary w-full py-3 text-base"
            >
              {isDownloading ? (
                <>
                  <Spinner size="sm" />
                  Starting download...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download File
                </>
              )}
            </button>

            <p className="text-xs text-gray-600 mt-4">
              No account needed · Safe to download
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDownloadPage;
