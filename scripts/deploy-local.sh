#!/bin/bash

# MongoDB DR Simulator - Local Deployment Script
# This script builds and runs the application locally

set -e

echo "🚀 MongoDB DR Simulator - Local Deployment"
echo "============================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run type check
echo "🔍 Running type check..."
npm run type-check

# Build the application
echo "🏗️ Building application..."
npm run build

# Start the production server
echo "🌟 Starting production server..."
echo "📱 Application will be available at: http://localhost:3000"
echo "🛑 Press Ctrl+C to stop the server"

npm start
