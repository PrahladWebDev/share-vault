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
  Folder,
  FolderPlus,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminVideoVaultPage = () => {
  // Collections (folders)
  const [activeCollection, setActiveCollection] = useState(null); // { _id, name, ... } | null
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [deleteCollectionTarget, setDeleteCollectionTarget] = useState(null);

  // Upload (step 2, only reachable once a collection is chosen)
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Video list (scoped to the active collection)
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const qc = useQueryClient();

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['video-collections'],
    queryFn: () => videosAPI.getCollections().then((r) => r.data),
  });
  const collections = collectionsData?.data?.collections || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', activeCollection?._id, page, debouncedSearch],
    queryFn: () =>
      videosAPI
        .getAllVideos({ page, limit: 12, search: debouncedSearch, collectionId: activeCollection._id })
        .then((r) => r.data),
    enabled: !!activeCollection,
    keepPreviousData: true,
  });
  const videos = data?.data || [];
  const pagination = data?.pagination;

  // --- Collection mutations ---------------------------------------------

  const createCollectionMutation = useMutation({
    mutationFn: (payload) => videosAPI.createCollection(payload),
    onSuccess: (res) => {
      toast.success('Collection created');
      setShowCreateModal(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      qc.invalidateQueries(['video-collections']);
      const created = res?.data?.data?.collection;
      if (created) setActiveCollection(created);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (id) => videosAPI.deleteCollection(id),
    onSuccess: () => {
      toast.success('Collection deleted');
      setDeleteCollectionTarget(null);
      qc.invalidateQueries(['video-collections']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => videosAPI.deleteVideo(id),
    onSuccess: () => {
      toast.success('Video deleted');
      setDeleteTarget(null);
      qc.invalidateQueries(['admin-videos']);
      qc.invalidateQueries(['video-collections']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleCreateCollection = (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      toast.error('Give the collection a name');
      return;
    }
    createCollectionMutation.mutate({
      name: newCollectionName.trim(),
      description: newCollectionDesc.trim(),
    });
  };

  const openCollection = (collection) => {
    setActiveCollection(collection);
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setFiles([]);
  };

  const backToCollections = () => {
    setActiveCollection(null);
    setFiles([]);
  };

  // --- Search --------------------------------------------------------------

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

  // --- Upload (multi-file) --------------------------------------------------

  const handleFilesSelect = useCallback((selectedList) => {
    const selected = Array.from(selectedList || []);
    if (!selected.length) return;

    const videoFiles = selected.filter((f) => f.type.startsWith('video/'));
    if (videoFiles.length !== selected.length) {
      toast.error('Only video files are allowed — non-video files were skipped.');
    }
    if (!videoFiles.length) return;

    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const additions = videoFiles.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...additions];
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFilesSelect(e.dataTransfer.files);
  }, [handleFilesSelect]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => setFiles([]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleUpload = async () => {
    if (!files.length || !activeCollection) return;
    setIsUploading(true);
    setProgress(0);

    try {
      await videosAPI.upload(files, activeCollection._id, (pct) => setProgress(pct));

      toast.success(`${files.length} video${files.length > 1 ? 's' : ''} uploaded successfully!`);
      setFiles([]);
      setProgress(0);
      qc.invalidateQueries(['admin-videos']);
      qc.invalidateQueries(['video-collections']);
      setPage(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Player ----------------------------------------------------------------

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

  return (
    <div className="page-container">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-brand-400" />
            Video Vault
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {activeCollection
              ? `${pagination?.total ?? 0} videos in "${activeCollection.name}"`
              : `${collections.length} collection${collections.length === 1 ? '' : 's'} · Admin only · No size limit`}
          </p>
        </div>

        {!activeCollection && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <FolderPlus size={16} />
            New Collection
          </button>
        )}
      </div>

      {!activeCollection ? (
        // -------------------------------------------------------------
        // Step 1: choose or create a collection
        // -------------------------------------------------------------
        <div>
          {collectionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="card p-5">
              <EmptyState
                icon={Folder}
                title="No collections yet"
                description="Create a collection to organize videos into a folder, then upload into it."
                action={
                  <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-2">
                    <FolderPlus size={16} />
                    New Collection
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection) => (
                <div
                  key={collection._id}
                  onClick={() => openCollection(collection)}
                  className="card p-5 cursor-pointer hover:border-brand-600/50 hover:bg-brand-900/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-brand-900/40 rounded-xl border border-brand-800/40">
                      <Folder className="h-5 w-5 text-brand-400" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCollectionTarget(collection);
                      }}
                      className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete collection"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="text-white font-medium truncate mb-1">{collection.name}</h3>
                  {collection.description && (
                    <p className="text-xs text-gray-500 truncate mb-2">{collection.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>{collection.videoCount ?? 0} video{collection.videoCount === 1 ? '' : 's'}</span>
                    <span className="flex items-center gap-1 text-brand-400">
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // -------------------------------------------------------------
        // Step 2: upload into the chosen collection + browse its videos
        // -------------------------------------------------------------
        <div>
          <button
            onClick={backToCollections}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={15} />
            All Collections
          </button>

          {/* Upload dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-all cursor-pointer text-center ${
              isDragging
                ? 'border-brand-500 bg-brand-900/20'
                : files.length
                ? 'border-vault-border bg-vault-panel cursor-default'
                : 'border-vault-border hover:border-brand-600/50 hover:bg-brand-900/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelect(e.target.files)}
              disabled={isUploading}
            />

            {!files.length ? (
              <div className="flex flex-col items-center">
                <div className="p-4 bg-vault-muted rounded-full mb-4 border border-vault-border">
                  <CloudUpload className="h-10 w-10 text-gray-500" />
                </div>
                <p className="text-base font-medium text-white mb-1">
                  {isDragging ? 'Drop to add' : 'Drop videos here'}
                </p>
                <p className="text-sm text-gray-500">or click to browse · multiple files supported</p>
                <p className="text-xs text-gray-600 mt-3">
                  Uploading into <span className="text-brand-400">{activeCollection.name}</span> · Any size
                </p>
              </div>
            ) : (
              <div className="max-w-lg mx-auto text-left">
                <div className="max-h-56 overflow-y-auto space-y-2 mb-4 pr-1">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 bg-vault-dark/40 rounded-lg px-3 py-2">
                      <div className="p-2 bg-brand-900/40 rounded-lg border border-brand-800/40 flex-shrink-0">
                        <VideoIcon className="h-4 w-4 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-500">{formatBytes(f.size)}</p>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-vault-muted transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{files.length} file{files.length > 1 ? 's' : ''} · {formatBytes(totalSize)}</span>
                  {!isUploading && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="text-brand-400 hover:text-brand-300"
                      >
                        Add more
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearFiles(); }}
                        className="text-gray-500 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
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
                      Upload {files.length} Video{files.length > 1 ? 's' : ''}
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
              placeholder="Search videos in this collection..."
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
                  description="Upload a video above to add it to this collection."
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
        </div>
      )}

      {/* Create collection modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !createCollectionMutation.isLoading && setShowCreateModal(false)}
        title="New Collection"
        size="sm"
      >
        <form onSubmit={handleCreateCollection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
            <input
              type="text"
              autoFocus
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g. Onboarding Videos"
              className="input-field"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (optional)</label>
            <textarea
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              placeholder="What is this collection for?"
              className="input-field resize-none"
              rows={3}
              maxLength={300}
            />
          </div>
          <button
            type="submit"
            disabled={createCollectionMutation.isLoading}
            className="btn-primary w-full py-2.5"
          >
            {createCollectionMutation.isLoading ? <Spinner size="sm" /> : (
              <>
                <FolderPlus size={16} />
                Create Collection
              </>
            )}
          </button>
        </form>
      </Modal>

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

      <ConfirmDialog
        isOpen={!!deleteCollectionTarget}
        onClose={() => setDeleteCollectionTarget(null)}
        onConfirm={() => deleteCollectionMutation.mutate(deleteCollectionTarget?._id)}
        isLoading={deleteCollectionMutation.isLoading}
        title="Delete Collection"
        message={`Delete "${deleteCollectionTarget?.name}"? This is only possible if the collection has no videos in it.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default AdminVideoVaultPage;
