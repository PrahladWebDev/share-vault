const Minio = require('minio');
const logger = require('../utils/logger');

// MinIO client — talks to the MinIO server over its S3-compatible API.
// In production this runs on the same VPS, so MINIO_ENDPOINT is usually
// 'localhost' or '127.0.0.1' with useSSL false (Nginx/TLS terminates
// elsewhere; MinIO itself is never exposed directly to the internet).
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT, 10) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const FILES_BUCKET = process.env.MINIO_FILES_BUCKET || 'sharevault-files';
const VIDEOS_BUCKET = process.env.MINIO_VIDEOS_BUCKET || 'sharevault-videos';

const ensureBucket = async (bucketName) => {
  const exists = await minioClient.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
    logger.info(`MinIO bucket created: ${bucketName}`);
  }
};

// Called once on server startup. Buckets are private by default (no public
// read policy) — every download/stream goes through our own authenticated
// routes, which fetch the object server-side and pipe it to the client.
const initMinio = async () => {
  await ensureBucket(FILES_BUCKET);
  await ensureBucket(VIDEOS_BUCKET);
  logger.info('MinIO buckets ready');
};

module.exports = { minioClient, FILES_BUCKET, VIDEOS_BUCKET, initMinio };
