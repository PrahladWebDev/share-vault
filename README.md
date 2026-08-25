# ShareVault — Secure File Sharing Platform

A production-ready MERN stack application for secure file sharing with auto-expiry, role-based access, storage limits, and public share links.

ShareVault uses **MinIO S3-compatible object storage** for storing uploaded files and videos, while MongoDB stores file metadata, ownership, subscriptions, and application data.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind CSS, React Query, React Hook Form, React Hot Toast |
| Backend | Node.js, Express.js, MongoDB, Mongoose, JWT |
| Database | MongoDB Atlas |
| Object Storage | MinIO (S3-compatible) |
| Authentication | JWT access + refresh tokens, bcrypt |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt / Certbot |
| Cron | Node Cron |
| CI/CD | GitHub Actions |
| Security | Helmet, CORS, Rate Limiting, Multer validation |

---

## Architecture

```text
                         Internet
                            |
             +--------------+--------------+
             |                             |
             v                             v
 sharevault.prahladsingh.in       api.sharevault.prahladsingh.in
             |                             |
             +-------------+---------------+
                           |
                         Nginx
                           |
              +------------+------------+
              |                         |
              v                         v
        React Frontend           Node.js / Express
        frontend/build               :5000
                                        |
                         +--------------+--------------+
                         |                             |
                         v                             v
                    MongoDB Atlas                    MinIO
                    Application Data              Object Storage
                                                      |
                              +-----------------------+----------------+
                              |                                        |
                              v                                        v
                       sharevault-files                       sharevault-videos
