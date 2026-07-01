# ShareVault — Secure File Sharing Platform

A production-ready MERN stack application for secure file sharing with auto-expiry, role-based access, and public share links.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS, React Query, React Hook Form, React Hot Toast |
| Backend | Node.js, Express.js, MongoDB, Mongoose, JWT |
| Storage | VPS filesystem (`/uploads`) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Cron | Node Cron (cleanup every 10 min) |
| Security | Helmet, CORS, Rate Limiting, Multer validation |

---

## Project Structure

```
sharevault/
├── backend/
│   ├── config/         # DB connection
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, upload, validation, rate limiting
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routers
│   ├── services/       # Business logic
│   ├── utils/          # Logger, response helpers, token generators
│   ├── uploads/        # File storage (gitignored)
│   ├── logs/           # Winston logs (gitignored)
│   └── server.js
└── frontend/
    └── src/
        ├── api/        # Axios instances + API calls
        ├── components/ # Reusable UI components
        ├── context/    # Auth context
        ├── pages/      # Route pages
        └── utils/      # Formatters, helpers
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone / Extract

```bash
cd sharevault
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:5000/api
npm start
```

---

## Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sharevault
JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=change_this_to_another_long_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:5000
MAX_FILE_SIZE_USER=524288000
UPLOADS_DIR=./uploads
VIDEOS_DIR=./videos
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Creating the First Admin

After registering your first user, update them to admin via MongoDB shell or Compass:

```js
// In MongoDB shell
use sharevault
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

---

## API Reference

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Bearer |
| POST | `/api/auth/refresh-token` | Cookie/Body |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |
| PUT | `/api/auth/change-password` | Bearer |
| GET | `/api/auth/me` | Bearer |

### Files
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/files/upload` | Bearer |
| GET | `/api/files/my-files` | Bearer |
| DELETE | `/api/files/:id` | Bearer |
| POST | `/api/files/:id/share-link` | Bearer |
| GET | `/api/files/share/:token` | Public (download) |
| GET | `/api/files/share/:token/info` | Public |
| GET | `/api/files/dashboard/stats` | Bearer |
| GET | `/api/files/upload-limit` | Bearer |

### Admin
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/admin/dashboard` | Admin |
| GET | `/api/admin/users` | Admin |
| DELETE | `/api/admin/users/:id` | Admin |
| PATCH | `/api/admin/users/:id/toggle-status` | Admin |
| GET | `/api/admin/files` | Admin |
| DELETE | `/api/admin/files/:id` | Admin |
| GET | `/api/admin/cleanup-logs` | Admin |
| POST | `/api/admin/cleanup/trigger` | Admin |
| GET | `/api/admin/storage/stats` | Admin |

---

## File Rules

### Normal Users
- Max 2 uploads per rolling 24-hour window
- Max 500 MB per file
- Files auto-expire after 24 hours
- Cannot view other users' files

### Admins
- Unlimited uploads, any size
- Files never expire
- Can delete any file or user
- Access to all admin routes

---

## Security Features

- JWT access tokens (15m) + refresh tokens (7d, httpOnly cookie)
- Bcrypt password hashing (cost factor 12)
- Helmet HTTP security headers
- CORS origin restriction
- Rate limiting (global, auth, upload, download)
- Multer MIME type + extension validation
- Path traversal prevention
- Unique random stored filenames (never original name on disk)
- Input validation with express-validator

---

## Cron Job

Runs every 10 minutes. Finds files where `expiresAt <= now` and `isExpired = false`:

1. Deletes file from VPS filesystem
2. Updates owner's `usedStorage`
3. Creates a `CleanupLog` entry
4. Deletes the MongoDB document

---

## Production Deployment

```bash
# Backend
NODE_ENV=production
npm start

# Frontend build
npm run build
# Serve with nginx or serve package
```

### Nginx example (reverse proxy)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 550M;
    }

    location / {
        root /var/www/sharevault/frontend/build;
        try_files $uri /index.html;
    }
}
```

---

## License

MIT
