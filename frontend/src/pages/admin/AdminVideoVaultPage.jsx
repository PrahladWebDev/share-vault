import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosAPI } from '../../api/videos';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { formatBytes, formatDateTime, truncateFilename, getErrorMessage } from '../../utils/formatters';
import {
  Video as VideoIcon,
  CloudUpload,
  PlayCircle,
  Trash2,
  Search,
  X,
  Film,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminVideoVaultPage = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, debouncedSearch],
    queryFn: () =>
      videosAPI.getAllVideos({ page, limit: 12, search: debouncedSearch }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => videosAPI.deleteVideo(id),
    onSuccess: () => {
      toast.success('Video deleted');
      setDeleteTarget(null);
      qc.invalidateQueries(['admin-videos']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  let searchTimeout;
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleFileSelect = useCallback((selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('video/')) {
      toast.error('Only video files are allowed.');
      return;
    }
    setFile(selected);
    setProgress(0);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      await videosAPI.upload(formData, (pct) => setProgress(pct));

      toast.success('Video uploaded successfully!');
      setFile(null);
      setProgress(0);
      qc.invalidateQueries(['admin-videos']);
      setPage(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (video) => {
    setPlayingVideo(video);
    setStreamUrl(null);
    setIsStreamLoading(true);
    try {
      const res = await videosAPI.getStreamToken(video._id);
      const { streamToken } = res.data.data;
      setStreamUrl(videosAPI.buildStreamUrl(video._id, streamToken));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setPlayingVideo(null);
    } finally {
      setIsStreamLoading(false);
    }
  };

  const closePlayer = () => {
    setPlayingVideo(null);
    setStreamUrl(null);
  };

  const videos = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film className="h-6 w-6 text-brand-400" />
          Video Vault
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {pagination?.total ?? 0} videos · Admin only · No size limit
        </p>
      </div>

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-all cursor-pointer text-center ${
          isDragging
            ? 'border-brand-500 bg-brand-900/20'
            : file
            ? 'border-vault-border bg-vault-panel cursor-default'
            : 'border-vault-border hover:border-brand-600/50 hover:bg-brand-900/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          disabled={isUploading}
        />

        {!file ? (
          <div className="flex flex-col items-center">
            <div className="p-4 bg-vault-muted rounded-full mb-4 border border-vault-border">
              <CloudUpload className="h-10 w-10 text-gray-500" />
            </div>
            <p className="text-base font-medium text-white mb-1">
              {isDragging ? 'Drop to upload' : 'Drop a video here'}
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-600 mt-3">Video files only · Any size</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-3 bg-brand-900/40 rounded-xl border border-brand-800/40">
                <VideoIcon className="h-6 w-6 text-brand-400" />
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
              <div className="mb-5">
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
              disabled={isUploading}
              className="btn-primary w-full py-3"
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" />
                  Uploading... {progress}%
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  Upload Video
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search videos..."
          value={search}
          onChange={handleSearch}
          className="input-field pl-9"
        />
      </div>

      {/* Video list */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Film}
              title="No videos yet"
              description="Upload a video above to add it to the vault."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/50">
                <tr>
                  {['Video', 'Size', 'Uploaded', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {videos.map((video) => (
                  <tr key={video._id} className="hover:bg-vault-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-brand-900/40 rounded-lg border border-brand-800/40 flex-shrink-0">
                          <VideoIcon className="h-4 w-4 text-brand-400" />
                        </div>
                        <span className="text-gray-200 truncate max-w-[240px]">
                          {truncateFilename(video.originalName, 40)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {formatBytes(video.size)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDateTime(video.uploadedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(video)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-brand-400 hover:bg-brand-900/20 transition-colors"
                          title="View"
                        >
                          <PlayCircle size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(video)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && <Pagination pagination={pagination} onPageChange={setPage} />}

      {/* Player modal */}
      <Modal
        isOpen={!!playingVideo}
        onClose={closePlayer}
        title={playingVideo ? truncateFilename(playingVideo.originalName, 50) : ''}
        size="xl"
      >
        {playingVideo && (
          isStreamLoading || !streamUrl ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : (
            <video
              key={playingVideo._id}
              src={streamUrl}
              controls
              autoPlay
              className="w-full max-h-[70vh] rounded-lg bg-black"
            >
              Your browser does not support the video tag.
            </video>
          )
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)}
        isLoading={deleteMutation.isLoading}
        title="Delete Video"
        message={`Permanently delete "${deleteTarget?.originalName}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default AdminVideoVaultPage;
