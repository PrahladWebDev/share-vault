import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { formatBytes, formatDate, getErrorMessage } from '../../utils/formatters';
import { Users, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () =>
      adminAPI.getUsers({ page, limit: 15, search: debouncedSearch }).then((r) => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteUser(id),
    onSuccess: () => {
      toast.success('User and their files deleted');
      setDeleteTarget(null);
      qc.invalidateQueries(['admin-users']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => adminAPI.toggleUserStatus(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['admin-users']);
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

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-gray-400 text-sm mt-0.5">{pagination?.total ?? 0} registered users</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearch}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Users} title="No users found" description={debouncedSearch ? `No users matching "${debouncedSearch}"` : 'No registered users yet'} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/50">
                <tr>
                  {['Name', 'Email', 'Storage', 'Files', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-vault-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-700/60 flex items-center justify-center text-xs font-bold text-brand-200 flex-shrink-0">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-gray-200 font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{formatBytes(user.usedStorage)}</td>
                    <td className="px-4 py-3 text-gray-400">{user.fileCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMutation.mutate(user._id)}
                          disabled={toggleMutation.isLoading}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                          className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-vault-muted transition-colors"
                        >
                          {user.isActive ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)}
        isLoading={deleteMutation.isLoading}
        title="Delete User"
        message={`Delete "${deleteTarget?.name}"? All their files will be permanently deleted.`}
        confirmLabel="Delete User & Files"
      />
    </div>
  );
};

export default AdminUsersPage;
