import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { formatBytes, formatDate, getMimeIcon, truncateFilename, getErrorMessage } from '../../utils/formatters';
import { HardDrive, Search, Trash2, Clock, Infinity } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminFilesPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-files', page, debouncedSearch],
    queryFn: () =>
      adminAPI.getAllFiles({ page, limit: 15, search: debouncedSearch }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteFile(id),
    onSuccess: () => {
      toast.success('File deleted');
      setDeleteTarget(null);
      qc.invalidateQueries(['admin-files']);
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

  const files = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">File Management</h1>
        <p className="text-gray-400 text-sm mt-0.5">{pagination?.total ?? 0} active files</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={handleSearch}
          className="input-field pl-9"
        />
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={HardDrive} title="No files found" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/50">
                <tr>
                  {['File', 'Owner', 'Size', 'Downloads', 'Expires', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-vault-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getMimeIcon(file.mimeType)}</span>
                        <span className="text-gray-200 truncate max-w-[180px]">
                          {truncateFilename(file.originalName, 28)}
                        </span>
                        {file.isAdminFile && (
                          <span className="badge badge-purple">Admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {file.owner?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono">{file.downloadCount}</td>
                    <td className="px-4 py-3">
                      {file.expiresAt ? (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <Clock size={11} />
                          {formatDate(file.expiresAt)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Infinity size={11} />
                          Never
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(file)}
                        className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && <Pagination pagination={pagination} onPageChange={setPage} />}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)}
        isLoading={deleteMutation.isLoading}
        title="Delete File"
        message={`Permanently delete "${deleteTarget?.originalName}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default AdminFilesPage;
