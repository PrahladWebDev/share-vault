import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import Pagination from '../../components/ui/Pagination';
import { formatBytes, formatDateTime, getErrorMessage } from '../../utils/formatters';
import { ScrollText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';

const reasonLabels = {
  expired: { label: 'Auto-expired', cls: 'badge-yellow' },
  manual_user: { label: 'User deleted', cls: 'badge-blue' },
  manual_admin: { label: 'Admin deleted', cls: 'badge-red' },
  cron_cleanup: { label: 'Cron cleanup', cls: 'badge-purple' },
};

const statusLabels = {
  success: { label: 'Success', cls: 'badge-green' },
  partial: { label: 'Partial', cls: 'badge-yellow' },
  failed: { label: 'Failed', cls: 'badge-red' },
};

const AdminLogsPage = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cleanup-logs', page],
    queryFn: () =>
      adminAPI.getCleanupLogs({ page, limit: 20 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const cleanupMutation = useMutation({
    mutationFn: adminAPI.triggerCleanup,
    onSuccess: () => {
      toast.success('Cleanup triggered. Refreshing logs shortly...');
      setTimeout(() => refetch(), 5000);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cleanup Logs</h1>
          <p className="text-gray-400 text-sm mt-0.5">{pagination?.total ?? 0} total cleanup records</p>
        </div>
        <button
          onClick={() => cleanupMutation.mutate()}
          disabled={cleanupMutation.isLoading}
          className="btn-secondary text-sm"
        >
          {cleanupMutation.isLoading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
          Trigger Cleanup
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <ScrollText className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No cleanup logs yet</p>
            <p className="text-xs text-gray-600 mt-1">Logs appear after files are deleted by the system or manually</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-vault-dark/50">
                <tr>
                  {['File', 'Owner', 'Size', 'Reason', 'Status', 'Deleted At', 'Notes'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {logs.map((log) => {
                  const reason = reasonLabels[log.reason] || { label: log.reason, cls: 'badge-blue' };
                  const status = statusLabels[log.status] || { label: log.status, cls: 'badge-blue' };
                  return (
                    <tr key={log._id} className="hover:bg-vault-muted/20 transition-colors">
                      <td className="px-4 py-3 text-gray-300 truncate max-w-[160px]">
                        {log.originalName || log.storedName || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {log.userId?.name || log.userId?.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {log.fileSize ? formatBytes(log.fileSize) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${reason.cls}`}>{reason.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDateTime(log.deletedAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
};

export default AdminLogsPage;
