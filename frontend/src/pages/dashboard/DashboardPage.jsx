import { useQuery } from '@tanstack/react-query';
import { filesAPI } from '../../api/files';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/ui/StatCard';
import { formatBytes, formatRelativeTime, getMimeIcon, formatCountdown, truncateFilename } from '../../utils/formatters';
import {
  HardDrive, Files, Upload, Download, Share2, Clock, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SkeletonCard = () => (
  <div className="card">
    <div className="skeleton h-4 w-24 rounded mb-3" />
    <div className="skeleton h-8 w-16 rounded" />
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => filesAPI.getDashboardStats().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here's an overview of your vault</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={HardDrive}
              label="Storage Used"
              value={formatBytes(data?.storageUsed || 0)}
              color="brand"
            />
            <StatCard
              icon={Files}
              label="Total Files"
              value={data?.totalFiles ?? 0}
              color="blue"
            />
            <StatCard
              icon={Upload}
              label="Remaining Uploads"
              value={`${data?.remainingUploads ?? 0}/2`}
              sub="resets every 24h"
              color={data?.remainingUploads === 0 ? 'red' : 'green'}
            />
            <StatCard
              icon={Download}
              label="Total Downloads"
              value={data?.totalDownloads ?? 0}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Upload limit warning */}
      {!isLoading && data?.remainingUploads === 0 && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-yellow-300">Upload limit reached</p>
            <p className="text-xs text-yellow-500 mt-0.5">
              You've used your 2 daily uploads. Your limit resets on a rolling 24-hour basis.
            </p>
          </div>
        </div>
      )}

      {/* Recent files + quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent files */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Uploads</h2>
            <Link
              to="/files"
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="card">
                  <div className="flex gap-3">
                    <div className="skeleton h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-48 rounded mb-2" />
                      <div className="skeleton h-3 w-32 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : data?.recentFiles?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📁</p>
              <p className="text-sm font-medium text-gray-400 mb-1">No files yet</p>
              <p className="text-xs text-gray-600 mb-5">Upload your first file to get started</p>
              <Link to="/upload" className="btn-primary inline-flex">
                <Upload size={14} />
                Upload File
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentFiles?.map((file) => (
                <div key={file._id} className="card hover:border-vault-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getMimeIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {truncateFilename(file.originalName, 40)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatBytes(file.size)} · {formatRelativeTime(file.uploadedAt)}
                      </p>
                    </div>
                    {file.expiresAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                        <Clock size={11} />
                        {formatCountdown(file.expiresAt)}
                      </div>
                    )}
                    {file.shareToken && (
                      <span className="badge badge-green flex-shrink-0">
                        <Share2 size={10} className="mr-1" />
                        Shared
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <h2 className="section-title">Quick Actions</h2>
          <Link
            to="/upload"
            className="card flex items-center gap-4 hover:border-brand-600/50 hover:bg-brand-900/10 transition-all group cursor-pointer"
          >
            <div className="p-3 bg-brand-600/20 rounded-lg border border-brand-600/30 group-hover:bg-brand-600/30 transition-colors">
              <Upload className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Upload File</p>
              <p className="text-xs text-gray-500">
                {data?.remainingUploads ?? 0} upload{data?.remainingUploads !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </Link>

          <Link
            to="/files"
            className="card flex items-center gap-4 hover:border-vault-muted transition-all group cursor-pointer"
          >
            <div className="p-3 bg-vault-muted rounded-lg border border-vault-border group-hover:bg-vault-muted/80 transition-colors">
              <Files className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">My Files</p>
              <p className="text-xs text-gray-500">{data?.totalFiles ?? 0} active files</p>
            </div>
          </Link>

          {/* Storage bar */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Storage</p>
              <p className="text-xs text-gray-500">{formatBytes(data?.storageUsed || 0)} used</p>
            </div>
            <div className="w-full bg-vault-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-brand-600 to-brand-400 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((data?.storageUsed || 0) / (500 * 1024 * 1024)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">500 MB limit per upload</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default DashboardPage;
