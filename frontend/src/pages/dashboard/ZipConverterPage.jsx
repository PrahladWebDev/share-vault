import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FileArchive,
  FolderUp,
  Upload,
  X,
  Trash2,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { formatBytes, getMimeIcon } from '../../utils/formatters';
import {
  ZIP_LIMITS,
  createZip,
  downloadBlob,
  isCompressionSupported,
  sanitizeZipPath,
  toZipFilename,
} from '../../utils/zipBuilder';

// OS junk that should never end up in an archive.
const IGNORED_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);
const isIgnored = (path) =>
  path.split('/').some((seg) => IGNORED_NAMES.has(seg.toLowerCase()) || seg === '__MACOSX');

let nextId = 0;
const makeItem = (file, path) => ({
  id: `${Date.now()}-${nextId++}`,
  file,
  path,
  key: `${path}|${file.size}|${file.lastModified}`,
});

// --- Folder drag & drop (webkitGetAsEntry) ----------------------------------
const readAllEntries = (reader) =>
  new Promise((resolve, reject) => {
    const all = [];
    const readBatch = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        return readBatch(); // readEntries returns max ~100 per call
      }, reject);
    readBatch();
  });

const entryToFile = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));

const walkEntry = async (entry, out) => {
  if (entry.isFile) {
    const file = await entryToFile(entry);
    out.push({ file, path: entry.fullPath.replace(/^\/+/, '') });
  } else if (entry.isDirectory) {
    const children = await readAllEntries(entry.createReader());
    for (const child of children) {
      // eslint-disable-next-line no-await-in-loop
      await walkEntry(child, out);
    }
  }
};

const ZipConverterPage = () => {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]); // always-current copy so add/remove never act on stale state
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [archiveName, setArchiveName] = useState('archive');
  const [compress, setCompress] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null); // { blob, filename, entries, originalSize, zipSize }

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const abortRef = useRef(null);
  const lastProgressAt = useRef(0);
  const dragDepth = useRef(0);

  const canCompress = isCompressionSupported();
  const busy = isZipping || isReading;

  const totalSize = useMemo(() => items.reduce((s, i) => s + i.file.size, 0), [items]);
  const percent = progress && progress.totalBytes > 0
    ? Math.min(100, Math.round((progress.processedBytes / progress.totalBytes) * 100))
    : 0;

  // Folder picker needs non-standard attributes that React doesn't forward as props.
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }, []);

  // Cancel in-flight work on unmount; warn before closing the tab mid-zip.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!isZipping) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isZipping]);

  // --- Adding files ---------------------------------------------------------
  const addEntries = useCallback((incoming) => {
    if (!incoming.length) return;

    const prev = itemsRef.current;
    const keys = new Set(prev.map((i) => i.key));
    const next = [...prev];
    let total = prev.reduce((s, i) => s + i.file.size, 0);
    let duplicates = 0;
    let overLimit = 0;

    for (const { file, path } of incoming) {
      const safePath = sanitizeZipPath(path) || sanitizeZipPath(file.name);
      if (!safePath || isIgnored(safePath)) continue;

      const item = makeItem(file, safePath);
      if (keys.has(item.key)) {
        duplicates += 1;
        continue;
      }
      if (next.length >= ZIP_LIMITS.MAX_FILES || total + file.size > ZIP_LIMITS.MAX_TOTAL_BYTES) {
        overLimit += 1;
        continue;
      }
      keys.add(item.key);
      total += file.size;
      next.push(item);
    }

    itemsRef.current = next;
    setItems(next);
    setResult(null);

    if (overLimit) {
      toast.error(
        `${overLimit} file${overLimit !== 1 ? 's' : ''} skipped — limit is ${formatBytes(
          ZIP_LIMITS.MAX_TOTAL_BYTES
        )} / ${ZIP_LIMITS.MAX_FILES} files per archive.`
      );
    }
    if (duplicates) toast(`${duplicates} duplicate${duplicates !== 1 ? 's' : ''} ignored`);
  }, []);

  const handleInput = (e) => {
    const files = Array.from(e.target.files || []);
    addEntries(files.map((f) => ({ file: f, path: f.webkitRelativePath || f.name })));
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (busy) return;

    // Entries must be grabbed synchronously — DataTransfer is cleared after the handler yields.
    const dtItems = Array.from(e.dataTransfer.items || []);
    const entries = dtItems
      .filter((i) => i.kind === 'file')
      .map((i) => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null));
    const plainFiles = Array.from(e.dataTransfer.files || []);

    if (!entries.length || entries.some((en) => !en)) {
      addEntries(plainFiles.map((f) => ({ file: f, path: f.name })));
      return;
    }

    setIsReading(true);
    try {
      const collected = [];
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop
        await walkEntry(entry, collected);
      }
      addEntries(collected);
    } catch {
      toast.error('Could not read some of the dropped items');
      if (plainFiles.length) addEntries(plainFiles.map((f) => ({ file: f, path: f.name })));
    } finally {
      setIsReading(false);
    }
  };

  const removeItem = (id) => {
    itemsRef.current = itemsRef.current.filter((i) => i.id !== id);
    setItems(itemsRef.current);
    setResult(null);
  };

  const clearAll = () => {
    itemsRef.current = [];
    setItems([]);
    setResult(null);
    setProgress(null);
  };

  // --- Zipping --------------------------------------------------------------
  const handleCreate = async () => {
    if (!items.length || isZipping) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const filename = toZipFilename(archiveName);

    setIsZipping(true);
    setResult(null);
    setProgress({ processedBytes: 0, totalBytes: totalSize, fileIndex: 0, fileCount: items.length, currentName: '' });

    try {
      const { blob, entries, originalSize, zipSize } = await createZip(
        items.map(({ file, path }) => ({ file, path })),
        {
          compress,
          signal: controller.signal,
          onProgress: (p) => {
            // Throttle React updates (chunk callbacks fire very frequently).
            const now = performance.now();
            if (now - lastProgressAt.current > 80 || p.processedBytes >= p.totalBytes) {
              lastProgressAt.current = now;
              setProgress(p);
            }
          },
        }
      );

      setResult({ blob, filename, entries, originalSize, zipSize });
      downloadBlob(blob, filename);
      toast.success('ZIP created');
    } catch (err) {
      if (err?.name === 'AbortError') {
        toast('ZIP creation cancelled');
      } else {
        toast.error(err?.message || 'Failed to create ZIP');
      }
    } finally {
      abortRef.current = null;
      setIsZipping(false);
      setProgress(null);
    }
  };

  const handleCancel = () => abortRef.current?.abort();

  const savedPercent = result && result.originalSize > 0
    ? Math.max(0, Math.round((1 - result.zipSize / result.originalSize) * 100))
    : 0;

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ZIP Converter</h1>
        <p className="text-gray-400 text-sm mt-1">
          Compress your files and folders into a single ZIP archive.
        </p>
      </div>

      <div className="mb-5 p-3 bg-emerald-900/20 border border-emerald-800/40 rounded-xl flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        <p className="text-xs text-emerald-300">
          Private by design — files are zipped inside your browser and are never uploaded.
        </p>
      </div>

      {!canCompress && (
        <div className="mb-5 p-3 bg-yellow-900/20 border border-yellow-800/40 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-400">
            Your browser doesn't support native compression, so files will be stored without compression.
            Update your browser for smaller archives.
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; if (!busy) setIsDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setIsDragging(false); }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center ${
          busy ? 'opacity-70' : ''
        } ${
          isDragging
            ? 'border-brand-500 bg-brand-900/20 animate-drop-glow'
            : 'border-vault-border hover:border-brand-600/50 hover:bg-brand-900/10'
        }`}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleInput} disabled={busy} />
        <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleInput} disabled={busy} />

        <div className="flex flex-col items-center">
          <div className={`p-4 rounded-2xl bg-brand-600/20 mb-4 ${isDragging ? 'animate-float' : ''}`}>
            {isReading ? <Spinner size="lg" className="text-brand-400" /> : <FileArchive className="h-8 w-8 text-brand-400" />}
          </div>
          <p className="text-white font-medium">
            {isReading ? 'Reading folder…' : isDragging ? 'Drop to add' : 'Drag & drop files or folders here'}
          </p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Up to {formatBytes(ZIP_LIMITS.MAX_TOTAL_BYTES)} and {ZIP_LIMITS.MAX_FILES.toLocaleString()} files per archive
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Add files
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => folderInputRef.current?.click()}>
              <FolderUp size={16} />
              Add folder
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">{items.length}</span> file{items.length !== 1 ? 's' : ''} ·{' '}
              {formatBytes(totalSize)}
            </p>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 size={13} />
              Clear all
            </button>
          </div>

          <div className="card p-0 max-h-72 overflow-y-auto divide-y divide-vault-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base flex-shrink-0">{getMimeIcon(item.file.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate" title={item.path}>{item.path}</p>
                  <p className="text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.path}`}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-vault-muted transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="card mt-4 space-y-4">
            <div>
              <label htmlFor="zip-name" className="label">Archive name</label>
              <div className="flex items-center gap-2">
                <input
                  id="zip-name"
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  maxLength={100}
                  disabled={busy}
                  className="input-field"
                  placeholder="archive"
                />
                <span className="text-sm text-gray-500 font-mono">.zip</span>
              </div>
            </div>

            <label className={`flex items-start gap-3 ${canCompress ? 'cursor-pointer' : 'opacity-50'}`}>
              <input
                type="checkbox"
                checked={compress && canCompress}
                onChange={(e) => setCompress(e.target.checked)}
                disabled={busy || !canCompress}
                className="mt-1 h-4 w-4 rounded border-vault-border bg-vault-panel accent-brand-600"
              />
              <span>
                <span className="block text-sm text-gray-200 font-medium">Compress files</span>
                <span className="block text-xs text-gray-500">
                  Smaller archive. Already-compressed files (images, video, archives) are stored as-is. Turn off for fastest packing.
                </span>
              </span>
            </label>
          </div>

          {/* Progress */}
          {isZipping && progress && (
            <div className="mt-4 card animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="truncate pr-3">
                  {progress.currentName
                    ? `File ${Math.min(progress.fileIndex + 1, progress.fileCount)} of ${progress.fileCount} · ${progress.currentName}`
                    : 'Starting…'}
                </span>
                <span className="font-mono text-gray-300 flex-shrink-0">{percent}%</span>
              </div>
              <div className="w-full bg-vault-muted rounded-full h-2 overflow-hidden">
                <div
                  className="relative bg-gradient-to-r from-brand-600 to-brand-400 h-2 rounded-full transition-all duration-200 overflow-hidden"
                  style={{ width: `${percent}%` }}
                >
                  <div className="absolute inset-0 progress-stripes animate-progress-stripes" />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleCreate} disabled={busy} className="btn-primary flex-1 py-3">
              {isZipping ? (
                <>
                  <Spinner size="sm" />
                  Creating ZIP…
                </>
              ) : (
                <>
                  <FileArchive size={16} />
                  Create ZIP
                </>
              )}
            </button>
            {isZipping && (
              <button type="button" onClick={handleCancel} className="btn-secondary px-5">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 p-5 bg-emerald-900/20 border border-emerald-800/40 rounded-xl animate-slide-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 animate-pop-in" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-300 truncate">{result.filename}</p>
                <p className="text-xs text-emerald-500 mt-0.5">
                  {result.entries} file{result.entries !== 1 ? 's' : ''} · {formatBytes(result.originalSize)} →{' '}
                  {formatBytes(result.zipSize)}
                  {savedPercent > 0 && ` (${savedPercent}% smaller)`}
                </p>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={() => downloadBlob(result.blob, result.filename)}>
              <Download size={16} />
              Download again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZipConverterPage;
