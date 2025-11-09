#!/bin/bash

# Run frontend locally without Docker
# This is useful when Docker has filesystem issues

echo "🚀 Starting frontend locally (without Docker)..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed!"
    echo "Install it with: npm install -g pnpm"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Start development server
echo "✅ Starting Next.js development server..."
echo "🌐 Frontend will be available at http://localhost:3000"
pnpm dev

