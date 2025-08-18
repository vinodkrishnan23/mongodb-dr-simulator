@echo off
REM MongoDB DR Simulator - Local Deployment Script (Windows)
REM This script builds and runs the application locally on Windows

setlocal enabledelayedexpansion

echo 🚀 MongoDB DR Simulator - Local Deployment
echo ============================================

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js version: !NODE_VERSION!
echo ✅ npm version: !NPM_VERSION!

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Run type check
echo 🔍 Running type check...
call npm run type-check
if %errorlevel% neq 0 (
    echo ❌ Type check failed
    pause
    exit /b 1
)

REM Build the application
echo 🏗️ Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

REM Start the production server
echo 🌟 Starting production server...
echo 📱 Application will be available at: http://localhost:3000
echo 🛑 Press Ctrl+C to stop the server
echo.

call npm start
