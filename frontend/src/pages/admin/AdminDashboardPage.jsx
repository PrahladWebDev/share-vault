import { useQuery, useMutation } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import StatCard from '../../components/ui/StatCard';
import { formatBytes, formatRelativeTime, getMimeIcon, truncateFilename, getErrorMessage } from '../../utils/formatters';
import {
  Users, Files, Download, HardDrive, Upload, Trash2,
  RefreshCw, Activity, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';

const AdminDashboardPage = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const cleanupMutation = useMutation({
    mutationFn: adminAPI.triggerCleanup,
    onSuccess: () => {
      toast.success('Cleanup job triggered successfully');
      setTimeout(() => refetch(), 3000);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400 text-sm">System overview and management</p>
        </div>
        <button
          onClick={() => cleanupMutation.mutate()}
          disabled={cleanupMutation.isLoading}
          className="btn-secondary text-sm"
        >
          {cleanupMutation.isLoading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
          Run Cleanup
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="card"><div className="skeleton h-16 w-full rounded" /></div>
          ))
        ) : (
          <>
            <StatCard icon={Users} label="Total Users" value={data?.totalUsers ?? 0} color="blue" />
            <StatCard icon={Files} label="Total Files" value={data?.totalFiles ?? 0} color="purple" />
            <StatCard icon={Download} label="Total Downloads" value={data?.totalDownloads ?? 0} color="green" />
            <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(data?.storageUsed || 0)} color="brand" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="card"><div className="skeleton h-16 w-full rounded" /></div>
          ))
        ) : (
          <>
            <StatCard icon={Upload} label="Uploads Today" value={data?.uploadsToday ?? 0} color="yellow" />
            <StatCard icon={Trash2} label="Expired Today" value={data?.expiredFilesDeletedToday ?? 0} color="red" />
            <StatCard icon={HardDrive} label="Files on Disk" value={data?.diskUsage?.files ?? 0} sub="physical files" color="blue" />
            <StatCard icon={Activity} label="Disk Usage" value={formatBytes(data?.diskUsage?.total || 0)} color="green" />
          </>
        )}
      </div>

      {/* Recent uploads table */}
      <div className="card">
        <h2 className="section-title mb-4">Recent Upload Activity</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : data?.recentUploads?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No recent uploads</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4">File</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4">Owner</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4">Size</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4">Downloads</th>
                  <th className="text-left text-xs text-gray-500 font-medium pb-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-border">
                {data?.recentUploads?.map((file) => (
                  <tr key={file._id} className="hover:bg-vault-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span>{getMimeIcon(file.mimeType)}</span>
                        <span className="text-gray-200 truncate max-w-[180px]">
                          {truncateFilename(file.originalName, 28)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 truncate max-w-[120px]">
                      {file.owner?.name || '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 font-mono text-xs">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 font-mono">{file.downloadCount}</td>
                    <td className="py-3 text-gray-500 text-xs">
                      {formatRelativeTime(file.uploadedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
