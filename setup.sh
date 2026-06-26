#!/bin/bash
set -e

echo "========================================"
echo "  ShareVault — Setup Script"
echo "========================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 required. Current: $(node --version 2>/dev/null || echo 'not found')"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Backend
echo ""
echo "→ Installing backend dependencies..."
cd backend
npm install
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created backend/.env from .env.example — please edit it!"
else
  echo "✓ backend/.env already exists"
fi
mkdir -p uploads logs
cd ..

# Frontend
echo ""
echo "→ Installing frontend dependencies..."
cd frontend
npm install
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created frontend/.env from .env.example"
else
  echo "✓ frontend/.env already exists"
fi
cd ..

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env  (set MONGODB_URI, JWT_SECRET, etc.)"
echo "  2. Edit frontend/.env (set REACT_APP_API_URL)"
echo "  3. Start backend:  cd backend && npm run dev"
echo "  4. Start frontend: cd frontend && npm start"
echo ""
echo "  To create an admin user, run:"
echo "    Register an account → update role in MongoDB:"
echo "    db.users.updateOne({ email: 'you@example.com' }, { \$set: { role: 'admin' } })"
echo ""
