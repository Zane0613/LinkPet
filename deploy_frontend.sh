#!/bin/bash

# LinkPet Frontend Auto-Deploy Script
# This script builds the Next.js frontend and deploys the static files to the backend directory.

# Exit immediately if a command exits with a non-zero status
set -e

# Define paths (relative to script location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
STATIC_DIR="$SCRIPT_DIR/static"

echo "========================================"
echo "   LinkPet Frontend Auto-Deploy Tool    "
echo "========================================"

# Add local node environment to PATH if it exists
if [ -d "$FRONTEND_DIR/frontend_env/bin" ]; then
    export PATH="$FRONTEND_DIR/frontend_env/bin:$PATH"
fi

# 1. Check Frontend Directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

# 2. Build Frontend
echo "🚀 Step 1: Building Frontend..."
cd "$FRONTEND_DIR"

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# Run build
echo "🔨 Running 'npm run build'..."
npm run build

# 3. Deploy
echo "🚀 Step 2: Deploying to Static..."

# Ensure static dir exists
mkdir -p "$STATIC_DIR"

# Clean old files
echo "🧹 Cleaning old static files in $STATIC_DIR..."
rm -rf "$STATIC_DIR"/*

# Copy new files
echo "🚚 Copying build artifacts to static directory..."
if [ -d "$FRONTEND_DIR/out" ]; then
    cp -r "$FRONTEND_DIR/out"/* "$STATIC_DIR"/
    # Create .nojekyll file to bypass Jekyll processing on some static hosts (optional but good practice)
    touch "$STATIC_DIR/.nojekyll"
else
    echo "❌ Error: Build output directory 'out' not found."
    echo "   Please ensure 'output: export' is set in next.config.js"
    exit 1
fi

echo "========================================"
echo "✅ Success! Frontend deployed to static/"
echo "   You can now restart the backend to see changes."
echo "========================================"
