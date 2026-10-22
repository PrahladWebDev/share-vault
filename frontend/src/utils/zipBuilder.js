/**
 * zipBuilder — dependency-free, in-browser ZIP archive writer.
 *
 * - Files never leave the user's device (no upload, no server load).
 * - Each file is streamed through CRC-32 and (optionally) native DEFLATE
 *   (CompressionStream), so large files are never fully read into JS memory.
 * - Already-compressed formats (jpg, mp4, zip, ...) and files that would not
 *   shrink are stored as-is.
 * - Entry paths are sanitised (no "..", absolute paths, drive letters,
 *   backslashes or control characters) and de-duplicated.
 * - Classic ZIP (not ZIP64): hard limits are enforced up front.
 */

export const ZIP_LIMITS = {
  MAX_TOTAL_BYTES: 2 * 1024 * 1024 * 1024, // 2 GB across all files
  MAX_FILES: 5000,
};

const UINT32_MAX = 0xffffffff;
const UINT16_MAX = 0xffff;

// File types that are already compressed — deflating them wastes CPU for ~0% gain.
const INCOMPRESSIBLE_EXT = new Set([
  'zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'zst', 'br',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif',
  'mp3', 'aac', 'ogg', 'opus', 'flac', 'm4a',
  'mp4', 'm4v', 'mov', 'mkv', 'webm', 'avi',
  'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'epub', 'jar', 'apk', 'woff', 'woff2',
]);

export const isCompressionSupported = () =>
  typeof CompressionStream === 'function' &&
  typeof TransformStream === 'function' &&
  typeof Response === 'function';

// ---------------------------------------------------------------------------
// CRC-32 (IEEE 802.3)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32Update = (crc, bytes) => {
  let c = crc;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c;
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * Turn any user/browser supplied path into a safe, relative ZIP entry path
 * using "/" separators. Returns '' if nothing usable remains.
 */
export const sanitizeZipPath = (rawPath) => {
  if (!rawPath) return '';
  const parts = String(rawPath)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\\/g, '/')
    .replace(/^[a-zA-Z]:/, '') // windows drive letter
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..');
  return parts.join('/');
};

/** Make every path unique (case-insensitive) by appending " (1)", " (2)" … */
export const dedupePaths = (paths) => {
  const seen = new Set();
  return paths.map((path) => {
    let candidate = path;
    if (seen.has(candidate.toLowerCase())) {
      const slash = path.lastIndexOf('/');
      const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
      const name = slash >= 0 ? path.slice(slash + 1) : path;
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let i = 1;
      do {
        candidate = `${dir}${base} (${i})${ext}`;
        i += 1;
      } while (seen.has(candidate.toLowerCase()));
    }
    seen.add(candidate.toLowerCase());
    return candidate;
  });
};

// ---------------------------------------------------------------------------
// Binary helpers
// ---------------------------------------------------------------------------
const toDosDateTime = (ms) => {
  let d = new Date(Number.isFinite(ms) ? ms : Date.now());
  if (d.getFullYear() < 1980) d = new Date(1980, 0, 1);
  if (d.getFullYear() > 2107) d = new Date(2107, 11, 31, 23, 59, 58);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
};

const abortError = () => {
  const err = new Error('ZIP creation cancelled');
  err.name = 'AbortError';
  return err;
};

const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

const buildLocalHeader = (e) => {
  const buf = new ArrayBuffer(30 + e.nameBytes.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true); // version needed
  v.setUint16(6, FLAG_UTF8, true);
  v.setUint16(8, e.method, true);
  v.setUint16(10, e.dosTime, true);
  v.setUint16(12, e.dosDate, true);
  v.setUint32(14, e.crc, true);
  v.setUint32(18, e.compressedSize, true);
  v.setUint32(22, e.size, true);
  v.setUint16(26, e.nameBytes.length, true);
  v.setUint16(28, 0, true); // extra length
  new Uint8Array(buf, 30).set(e.nameBytes);
  return new Uint8Array(buf);
};

const buildCentralHeader = (e) => {
  const buf = new ArrayBuffer(46 + e.nameBytes.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, (3 << 8) | 20, true); // made by: Unix, spec 2.0
  v.setUint16(6, 20, true);
  v.setUint16(8, FLAG_UTF8, true);
  v.setUint16(10, e.method, true);
  v.setUint16(12, e.dosTime, true);
  v.setUint16(14, e.dosDate, true);
  v.setUint32(16, e.crc, true);
  v.setUint32(20, e.compressedSize, true);
  v.setUint32(24, e.size, true);
  v.setUint16(28, e.nameBytes.length, true);
  v.setUint16(30, 0, true); // extra
  v.setUint16(32, 0, true); // comment
  v.setUint16(34, 0, true); // disk number
  v.setUint16(36, 0, true); // internal attrs
  v.setUint32(38, ((0o100644 << 16) >>> 0), true); // external attrs: -rw-r--r--
  v.setUint32(42, e.offset, true);
  new Uint8Array(buf, 46).set(e.nameBytes);
  return new Uint8Array(buf);
};

const buildEndOfCentralDirectory = (count, cdSize, cdOffset) => {
  const buf = new ArrayBuffer(22);
  const v = new DataView(buf);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true);
  v.setUint16(6, 0, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, cdOffset, true);
  v.setUint16(20, 0, true);
  return new Uint8Array(buf);
};

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

/** Stream a file once: compute CRC-32 and (optionally) deflate it. */
const processFile = async (file, { deflate, signal, onBytes }) => {
  let crc = UINT32_MAX;
  let size = 0;

  const meter = new TransformStream({
    transform(chunk, controller) {
      if (signal?.aborted) {
        controller.error(abortError());
        return;
      }
      crc = crc32Update(crc, chunk);
      size += chunk.length;
      onBytes?.(chunk.length);
      controller.enqueue(chunk);
    },
  });

  const metered = file.stream().pipeThrough(meter);

  if (!deflate) {
    // Drain only to compute CRC; the data blob is the original File (no copy).
    const reader = metered.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done } = await reader.read();
      if (done) break;
    }
    return { crc: (crc ^ UINT32_MAX) >>> 0, size, method: METHOD_STORE, data: file, compressedSize: size };
  }

  const compressedBlob = await new Response(metered.pipeThrough(new CompressionStream('deflate-raw'))).blob();
  const finalCrc = (crc ^ UINT32_MAX) >>> 0;

  // Not worth it (or empty file) → store the original bytes instead.
  if (size === 0 || compressedBlob.size >= size) {
    return { crc: finalCrc, size, method: METHOD_STORE, data: file, compressedSize: size };
  }
  return { crc: finalCrc, size, method: METHOD_DEFLATE, data: compressedBlob, compressedSize: compressedBlob.size };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a selection against the hard ZIP limits. Returns an error string or null.
 */
export const validateSelection = (items) => {
  if (items.length > ZIP_LIMITS.MAX_FILES) {
    return `Too many files (max ${ZIP_LIMITS.MAX_FILES}).`;
  }
  const total = items.reduce((sum, i) => sum + i.file.size, 0);
  if (total > ZIP_LIMITS.MAX_TOTAL_BYTES) {
    return 'Selection is too large for browser-based zipping.';
  }
  return null;
};

/**
 * Build a ZIP archive.
 *
 * @param {Array<{file: File, path: string}>} items
 * @param {Object}   [opts]
 * @param {boolean}  [opts.compress=true]   Deflate compressible files; false = store only.
 * @param {AbortSignal} [opts.signal]
 * @param {(p: {processedBytes:number,totalBytes:number,fileIndex:number,fileCount:number,currentName:string}) => void} [opts.onProgress]
 * @returns {Promise<{blob: Blob, entries: number, originalSize: number, zipSize: number}>}
 */
export const createZip = async (items, { compress = true, signal, onProgress } = {}) => {
  if (!items.length) throw new Error('Add at least one file.');
  const limitError = validateSelection(items);
  if (limitError) throw new Error(limitError);

  const canDeflate = compress && isCompressionSupported();
  const encoder = new TextEncoder();

  const paths = dedupePaths(
    items.map((i, idx) => sanitizeZipPath(i.path) || sanitizeZipPath(i.file.name) || `file-${idx + 1}`)
  );

  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  let processedBytes = 0;
  const report = (fileIndex, currentName) =>
    onProgress?.({ processedBytes, totalBytes, fileIndex, fileCount: items.length, currentName });

  const parts = [];
  const entries = [];
  let offset = 0;

  for (let idx = 0; idx < items.length; idx += 1) {
    if (signal?.aborted) throw abortError();

    const { file } = items[idx];
    const path = paths[idx];
    const nameBytes = encoder.encode(path);
    if (nameBytes.length > UINT16_MAX) throw new Error(`Path too long: ${path.slice(0, 60)}…`);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const deflate = canDeflate && !INCOMPRESSIBLE_EXT.has(ext) && file.size > 0;

    report(idx, path);
    // eslint-disable-next-line no-await-in-loop
    const result = await processFile(file, {
      deflate,
      signal,
      onBytes: (n) => {
        processedBytes += n;
        report(idx, path);
      },
    });

    if (offset > UINT32_MAX - result.compressedSize - 30 - nameBytes.length) {
      throw new Error('Archive exceeds the 4 GB ZIP limit.');
    }

    const { time, date } = toDosDateTime(file.lastModified);
    const entry = { ...result, nameBytes, dosTime: time, dosDate: date, offset };
    const header = buildLocalHeader(entry);

    parts.push(header, result.data);
    offset += header.length + result.compressedSize;
    entries.push(entry);
  }

  if (entries.length > UINT16_MAX) throw new Error('Too many files for a ZIP archive.');

  const cdOffset = offset;
  let cdSize = 0;
  for (const entry of entries) {
    const central = buildCentralHeader(entry);
    parts.push(central);
    cdSize += central.length;
  }
  parts.push(buildEndOfCentralDirectory(entries.length, cdSize, cdOffset));

  const blob = new Blob(parts, { type: 'application/zip' });
  return { blob, entries: entries.length, originalSize: totalBytes, zipSize: blob.size };
};

/** Trigger a browser download for a Blob. */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
};

/** Make a safe "*.zip" filename from user input. */
export const toZipFilename = (input) => {
  const base = String(input || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '')
    .replace(/\.zip$/i, '')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 100);
  return `${base || 'archive'}.zip`;
};
