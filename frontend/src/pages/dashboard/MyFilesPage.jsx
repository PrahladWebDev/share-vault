import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesAPI } from '../../api/files';
import FileCard from '../../components/files/FileCard';
import ShareDialog from '../../components/files/ShareDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { Files, Search, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../utils/formatters';
import toast from 'react-hot-toast';

const MyFilesPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [shareFile, setShareFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-files', page, debouncedSearch],
    queryFn: () =>
      filesAPI.getMyFiles({ page, limit: 12, search: debouncedSearch }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => filesAPI.deleteFile(id),
    onSuccess: () => {
      toast.success('File deleted');
      setDeleteTarget(null);
      qc.invalidateQueries(['my-files']);
      qc.invalidateQueries(['dashboard-stats']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  let searchTimeout;
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const files = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Files</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {pagination?.total ?? 0} file{pagination?.total !== 1 ? 's' : ''} in your vault
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={15} />
          Upload File
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={handleSearchChange}
          className="input-field pl-9"
        />
      </div>

      {/* Files grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex gap-3">
                <div className="skeleton h-9 w-9 rounded" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-full rounded mb-2" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              </div>
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-8 w-full rounded" />
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={Files}
          title={debouncedSearch ? 'No files found' : 'No files yet'}
          description={
            debouncedSearch
              ? `No files matching "${debouncedSearch}"`
              : 'Upload your first file to see it here'
          }
          action={
            !debouncedSearch && (
              <Link to="/upload" className="btn-primary">
                <Upload size={14} />
                Upload File
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                onDelete={setDeleteTarget}
                onShare={setShareFile}
              />
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {/* Share Dialog */}
      {shareFile && (
        <ShareDialog
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)}
        isLoading={deleteMutation.isLoading}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteTarget?.originalName}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default MyFilesPage;
