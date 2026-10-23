import { useQuery } from '@tanstack/react-query';
import { filesAPI } from '../../api/files';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/ui/StatCard';
import { formatBytes, formatRelativeTime, getMimeIcon, formatCountdown, truncateFilename } from '../../utils/formatters';
import {
  HardDrive, Files, Upload, Download, Share2, Clock, ArrowRight, FileArchive, AlertTriangle, FolderOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SkeletonCard = () => (
  <div className="card">
    <div className="skeleton h-4 w-24 rounded mb-3" />
    <div className="skeleton h-8 w-16 rounded" />
  </div>
);

const QuickAction = ({ to, icon: Icon, title, sub, tone = 'brand' }) => {
  const tones = {
    brand: 'bg-brand-600/20 text-brand-200 group-hover:bg-brand-600/30',
    neutral: 'bg-white/5 text-gray-300 group-hover:bg-white/10',
  };
  return (
    <Link
      to={to}
      className="card group flex items-center gap-4 !p-4 hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-xl hover:shadow-black/20"
    >
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-gray-500 truncate">{sub}</p>
      </div>
      <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => filesAPI.getDashboardStats().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const limitReached = !isLoading && !data?.unlimitedUploads && data?.remainingUploads === 0;

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] border border-vault-border/60 bg-gradient-to-br from-brand-700/30 via-brand-900/20 to-vault-panel p-6 sm:p-8 mb-6">
        <div className="absolute -top-16 -right-10 h-52 w-52 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-sm text-brand-200 font-medium mb-1">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-300/80 text-sm mt-1.5">Here's an overview of your vault</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/upload" className="btn-primary">
              <Upload size={16} />
              Upload File
            </Link>
            <Link to="/zip-converter" className="btn-secondary">
              <FileArchive size={16} />
              ZIP Converter
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              value={data?.unlimitedUploads ? '∞/∞' : `${data?.remainingUploads ?? 0}/2`}
              sub={data?.unlimitedUploads ? 'no daily limit' : 'resets every 24h'}
              color={!data?.unlimitedUploads && data?.remainingUploads === 0 ? 'red' : 'green'}
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
      {limitReached && (
        <div className="mb-6 p-4 bg-yellow-500/10 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title !mb-0">Recent Uploads</h2>
            <Link to="/files" className="btn-text !min-h-[36px] !px-3 !py-1 text-xs">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="card !p-4">
                  <div className="flex gap-3">
                    <div className="skeleton h-11 w-11 rounded-2xl" />
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
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-brand-600/15 flex items-center justify-center">
                <FolderOpen className="h-7 w-7 text-brand-300" />
              </div>
              <p className="text-base font-semibold text-white mb-1">No files yet</p>
              <p className="text-sm text-gray-500 mb-5">Upload your first file to get started</p>
              <Link to="/upload" className="btn-primary">
                <Upload size={16} />
                Upload File
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentFiles?.map((file) => (
                <div key={file._id} className="card !p-4 hover:border-brand-600/30 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                      {getMimeIcon(file.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {truncateFilename(file.originalName, 40)}
                        </p>
                        {file.itemType === 'video' && (
                          <span className="badge badge-purple flex-shrink-0 text-[10px]">Video</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatBytes(file.size)} · {formatRelativeTime(file.uploadedAt)}
                      </p>
                    </div>
                    {file.expiresAt && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                        <Clock size={12} />
                        {formatCountdown(file.expiresAt)}
                      </div>
                    )}
                    {file.shareToken && (
                      <span className="badge badge-green flex-shrink-0">
                        <Share2 size={11} className="mr-1" />
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
        <div className="space-y-3">
          <h2 className="section-title">Quick Actions</h2>
          <QuickAction
            to="/upload"
            icon={Upload}
            title="Upload File"
            sub={
              data?.unlimitedUploads
                ? 'Unlimited uploads'
                : `${data?.remainingUploads ?? 0} upload${data?.remainingUploads !== 1 ? 's' : ''} remaining`
            }
          />
          <QuickAction
            to="/zip-converter"
            icon={FileArchive}
            title="ZIP Converter"
            sub="Compress files into a ZIP archive"
          />
          <QuickAction
            to="/files"
            icon={Files}
            title="My Files"
            sub={`${data?.totalFiles ?? 0} active files`}
            tone="neutral"
          />

          {/* Storage */}
          <div className="card !p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-white">Storage</p>
              <p className="text-xs text-gray-400">{formatBytes(data?.storageUsed || 0)} used</p>
            </div>
            <p className="text-xs text-gray-500">
              {data?.unlimitedUploads ? 'No file size limit' : 'Max 500 MB per file'}
            </p>
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
