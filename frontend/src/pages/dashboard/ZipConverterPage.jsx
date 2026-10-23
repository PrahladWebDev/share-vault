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
  Check,
  Plus,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { formatBytes } from '../../utils/formatters';
import {
  ZIP_LIMITS,
  createZip,
  downloadBlob,
  isCompressionSupported,
  sanitizeZipPath,
  toZipFilename,
} from '../../utils/zipBuilder';

const DEFAULT_ARCHIVE_NAME = 'archive';
const MAX_ROWS_RENDERED = 200; // keep the DOM light for very large selections

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

// --- File-type avatars (tonal, Material style) --------------------------------
const extOf = (name) => {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
};
const EXT_GROUPS = [
  { exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'heic', 'bmp'], cls: 'bg-purple-500/15 text-purple-300' },
  { exts: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'], cls: 'bg-blue-500/15 text-blue-300' },
  { exts: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'], cls: 'bg-pink-500/15 text-pink-300' },
  { exts: ['pdf'], cls: 'bg-red-500/15 text-red-300' },
  { exts: ['doc', 'docx', 'txt', 'md', 'rtf', 'odt'], cls: 'bg-sky-500/15 text-sky-300' },
  { exts: ['xls', 'xlsx', 'csv', 'ods'], cls: 'bg-emerald-500/15 text-emerald-300' },
  { exts: ['zip', 'rar', '7z', 'tar', 'gz'], cls: 'bg-amber-500/15 text-amber-300' },
  { exts: ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'java', 'go', 'php', 'sh', 'yml', 'yaml'], cls: 'bg-teal-500/15 text-teal-300' },
];
const avatarClass = (ext) =>
  EXT_GROUPS.find((g) => g.exts.includes(ext))?.cls || 'bg-gray-500/15 text-gray-300';

// --- Suggested archive name ----------------------------------------------------
const suggestName = (items) => {
  if (!items.length) return DEFAULT_ARCHIVE_NAME;
  const tops = new Set(items.map((i) => i.path.split('/')[0]));
  const allNested = items.every((i) => i.path.includes('/'));
  if (allNested && tops.size === 1) return [...tops][0];
  if (items.length === 1) {
    const name = items[0].path.split('/').pop();
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }
  return DEFAULT_ARCHIVE_NAME;
};

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

// --- Small Material-style building blocks -------------------------------------
const Surface = ({ className = '', children }) => (
  <div
    className={`bg-vault-panel border border-vault-border/70 rounded-3xl shadow-xl shadow-black/20 ${className}`}
  >
    {children}
  </div>
);

const Stepper = ({ step }) => {
  const steps = ['Add files', 'Name & options', 'Download'];
  return (
    <ol className="flex items-center mb-6" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                    ? 'bg-brand-600 text-white ring-4 ring-brand-600/25'
                    : 'bg-vault-muted/60 text-gray-400'
                }`}
              >
                {done ? <Check size={14} /> : n}
              </span>
              <span
                className={`hidden sm:block text-sm font-medium transition-colors ${
                  active || done ? 'text-white' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`mx-3 h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                  done ? 'bg-brand-600' : 'bg-vault-muted/50'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

const Switch = ({ checked, onChange, disabled, id }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-8 w-14 flex-shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-panel disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-brand-600 border-brand-600' : 'bg-transparent border-gray-500'
    }`}
  >
    <span
      className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-200 flex items-center justify-center ${
        checked ? 'left-[26px] h-6 w-6 bg-white' : 'left-1 h-4 w-4 bg-gray-400'
      }`}
    >
      {checked && <Check size={13} className="text-brand-700" />}
    </span>
  </button>
);

const Chip = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full bg-brand-600/15 text-brand-200 text-xs font-medium px-3 py-1.5 ${className}`}
  >
    {children}
  </span>
);

const ZipConverterPage = () => {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]); // always-current copy so add/remove never act on stale state
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [archiveName, setArchiveName] = useState(DEFAULT_ARCHIVE_NAME);
  const nameTouched = useRef(false); // true once the user typed their own name
  const [compress, setCompress] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null); // { blob, entries, originalSize, zipSize }

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const abortRef = useRef(null);
  const lastProgressAt = useRef(0);
  const dragDepth = useRef(0);

  const canCompress = isCompressionSupported();
  const busy = isZipping || isReading;

  const totalSize = useMemo(() => items.reduce((s, i) => s + i.file.size, 0), [items]);
  const percent =
    progress && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.processedBytes / progress.totalBytes) * 100))
      : 0;

  const finalFilename = toZipFilename(archiveName);
  const step = result ? 3 : items.length ? 2 : 1;

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

  // Keep the name in sync with the selection until the user picks their own.
  useEffect(() => {
    if (!nameTouched.current) setArchiveName(suggestName(items));
  }, [items]);

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
    nameTouched.current = false;
    setArchiveName(DEFAULT_ARCHIVE_NAME);
  };

  // --- Archive name ---------------------------------------------------------
  const handleNameChange = (e) => {
    nameTouched.current = true;
    setArchiveName(e.target.value);
  };

  const handleNameBlur = () => {
    // Empty field → go back to following the suggestion.
    if (!archiveName.trim()) {
      nameTouched.current = false;
      setArchiveName(suggestName(itemsRef.current));
    }
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

      setResult({ blob, entries, originalSize, zipSize });
      downloadBlob(blob, filename);
      toast.success(`${filename} is ready`);
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

  const savedPercent =
    result && result.originalSize > 0
      ? Math.max(0, Math.round((1 - result.zipSize / result.originalSize) * 100))
      : 0;

  const visibleItems = items.slice(0, MAX_ROWS_RENDERED);
  const hiddenCount = items.length - visibleItems.length;
  const compressOn = compress && canCompress;

  return (
    <div className="page-container max-w-3xl">
      {/* Header */}
      <header className="mb-6 flex items-start gap-4">
        <div className="p-3.5 rounded-2xl bg-brand-600/20 text-brand-300 flex-shrink-0">
          <FileArchive size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">ZIP Converter</h1>
          <p className="text-gray-400 text-sm mt-1">
            Compress your files and folders into a single ZIP archive.
          </p>
          <Chip className="mt-3 !bg-emerald-500/15 !text-emerald-300">
            <ShieldCheck size={14} />
            Processed on your device — nothing is uploaded
          </Chip>
        </div>
      </header>

      <Stepper step={step} />

      {!canCompress && (
        <div className="mb-5 p-4 bg-yellow-500/10 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">
            Your browser doesn't support native compression, so files will be stored without compression.
            Update your browser for smaller archives.
          </p>
        </div>
      )}

      {/* 1 — Add files */}
      <Surface
        className={`relative overflow-hidden transition-all duration-300 ${
          isDragging ? 'ring-2 ring-brand-500 bg-brand-900/20' : ''
        }`}
      >
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            if (!busy) setIsDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`m-3 rounded-2xl border-2 border-dashed text-center transition-colors duration-300 ${
            items.length ? 'p-5' : 'p-10'
          } ${isDragging ? 'border-brand-400 bg-brand-600/10' : 'border-vault-border hover:border-brand-600/50'} ${
            busy ? 'opacity-70' : ''
          }`}
        >
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleInput} disabled={busy} />
          <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleInput} disabled={busy} />

          <div className={`flex ${items.length ? 'flex-col sm:flex-row sm:text-left' : 'flex-col'} items-center gap-4`}>
            <div
              className={`rounded-full bg-brand-600/20 text-brand-300 flex items-center justify-center flex-shrink-0 ${
                items.length ? 'h-12 w-12' : 'h-20 w-20'
              } ${isDragging ? 'animate-float' : ''}`}
            >
              {isReading ? (
                <Spinner size="md" />
              ) : (
                <Upload size={items.length ? 22 : 34} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-white font-semibold ${items.length ? 'text-base' : 'text-lg'}`}>
                {isReading ? 'Reading folder…' : isDragging ? 'Release to add' : 'Drag & drop files or folders'}
              </p>
              {!items.length && (
                <p className="text-sm text-gray-500 mt-1">
                  Up to {formatBytes(ZIP_LIMITS.MAX_TOTAL_BYTES)} and {ZIP_LIMITS.MAX_FILES.toLocaleString()} files per archive
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium shadow-md shadow-black/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Add files
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-brand-600/20 hover:bg-brand-600/30 text-brand-200 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderUp size={18} />
                Add folder
              </button>
            </div>
          </div>
        </div>

        {/* File list */}
        {items.length > 0 && (
          <div className="px-3 pb-3 animate-fade-in">
            <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{items.length.toLocaleString()} file{items.length !== 1 ? 's' : ''}</Chip>
                <Chip>{formatBytes(totalSize)}</Chip>
              </div>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
                Clear all
              </button>
            </div>

            <ul className="max-h-80 overflow-y-auto rounded-2xl bg-vault-dark/40">
              {visibleItems.map((item) => {
                const ext = extOf(item.file.name);
                return (
                  <li
                    key={item.id}
                    className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${avatarClass(
                        ext
                      )}`}
                    >
                      {(ext || 'file').slice(0, 4)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate" title={item.path}>
                        {item.path}
                      </p>
                      <p className="text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
                      aria-label={`Remove ${item.path}`}
                      className="h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      <X size={17} />
                    </button>
                  </li>
                );
              })}
              {hiddenCount > 0 && (
                <li className="px-4 py-3 text-xs text-gray-500 text-center">
                  + {hiddenCount.toLocaleString()} more file{hiddenCount !== 1 ? 's' : ''} included in the archive
                </li>
              )}
            </ul>
          </div>
        )}
      </Surface>

      {/* 2 — Name & options */}
      {items.length > 0 && (
        <Surface className="mt-5 p-6 animate-slide-up">
          <h2 className="text-base font-semibold text-white mb-5">Name & options</h2>

          {/* Outlined text field with floating label */}
          <div className="relative">
            <input
              id="zip-name"
              type="text"
              value={archiveName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              maxLength={100}
              disabled={busy}
              placeholder=" "
              autoComplete="off"
              spellCheck={false}
              className="peer w-full h-14 rounded-xl border border-vault-border bg-transparent pl-4 pr-16 text-base text-white outline-none transition-colors hover:border-gray-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 disabled:opacity-60"
            />
            <label
              htmlFor="zip-name"
              className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-vault-panel px-1.5 text-xs text-gray-400 transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-0 peer-focus:text-xs peer-focus:text-brand-300"
            >
              Archive name
            </label>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-500">
              .zip
            </span>
          </div>
          <p className="mt-2 ml-1 text-xs text-gray-500">
            Will be saved as <span className="font-mono text-gray-300">{finalFilename}</span>
          </p>

          <div className="my-5 h-px bg-vault-border/70" />

          {/* Switch row */}
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="zip-compress" className={`min-w-0 ${canCompress ? 'cursor-pointer' : ''}`}>
              <span className="block text-sm font-medium text-white">Compress files</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Smaller archive. Images, video and existing archives are stored as-is. Turn off for fastest packing.
              </span>
            </label>
            <Switch id="zip-compress" checked={compressOn} onChange={setCompress} disabled={busy || !canCompress} />
          </div>

          {/* Progress */}
          {isZipping && progress && (
            <div className="mt-6 rounded-2xl bg-brand-600/10 p-4 animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs mb-3">
                <span className="text-gray-300 truncate">
                  {progress.currentName
                    ? `File ${Math.min(progress.fileIndex + 1, progress.fileCount)} of ${progress.fileCount} · ${progress.currentName}`
                    : 'Starting…'}
                </span>
                <span className="font-mono text-brand-200 flex-shrink-0">{percent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-vault-muted/70 overflow-hidden">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-300 transition-all duration-200 overflow-hidden"
                  style={{ width: `${percent}%` }}
                >
                  <div className="absolute inset-0 progress-stripes animate-progress-stripes" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                {formatBytes(progress.processedBytes)} of {formatBytes(progress.totalBytes)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            {isZipping && (
              <button
                type="button"
                onClick={handleCancel}
                className="h-12 px-6 rounded-full text-sm font-medium text-brand-200 hover:bg-brand-600/15 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-900/40 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isZipping ? (
                <>
                  <Spinner size="sm" />
                  Creating ZIP…
                </>
              ) : (
                <>
                  <FileArchive size={18} />
                  Create ZIP
                </>
              )}
            </button>
          </div>
        </Surface>
      )}

      {/* 3 — Result */}
      {result && (
        <Surface className="mt-5 p-6 !bg-emerald-950/40 !border-emerald-800/40 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-7 w-7 text-emerald-400 animate-pop-in" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-white truncate" title={finalFilename}>
                {finalFilename}
              </p>
              <p className="text-sm text-emerald-300/80 mt-0.5">Your archive is ready.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip className="!bg-emerald-500/15 !text-emerald-200">
                  {result.entries} file{result.entries !== 1 ? 's' : ''}
                </Chip>
                <Chip className="!bg-emerald-500/15 !text-emerald-200">
                  {formatBytes(result.originalSize)} → {formatBytes(result.zipSize)}
                </Chip>
                {savedPercent > 0 && (
                  <Chip className="!bg-emerald-500/25 !text-emerald-100">{savedPercent}% smaller</Chip>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-medium text-emerald-200 hover:bg-emerald-500/10 transition-colors"
            >
              <Plus size={17} />
              New archive
            </button>
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, finalFilename)}
              className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-semibold shadow-lg shadow-black/20 transition-all active:scale-[0.98]"
            >
              <Download size={17} />
              Download again
            </button>
          </div>
          <p className="mt-3 text-xs text-emerald-300/60 sm:text-right">
            Tip: edit the archive name above to download it under a different name.
          </p>
        </Surface>
      )}
    </div>
  );
};

export default ZipConverterPage;
