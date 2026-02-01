#!/bin/bash

# Quick Deploy to Railway.app
# This script helps you deploy WebGo to Railway in minutes

set -e

echo "🚂 WebGo Railway Deployment Script"
echo "===================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway:"
    railway login
fi

echo "✅ Logged in to Railway"
echo ""

# Generate JWT secret
echo "🔐 Generating secure JWT_SECRET..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "✅ JWT_SECRET generated"
echo ""

# Initialize Railway project
echo "🚀 Initializing Railway project..."
railway init

echo ""
echo "📦 Creating PostgreSQL database..."
railway add --database postgres

echo ""
echo "🔧 Setting environment variables..."

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DB_SSL=false
railway variables set JWT_SECRET="$JWT_SECRET"

echo "✅ Environment variables set"
echo ""

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Find your project and click on it"
echo "3. Click on 'Settings' → 'Networking' → 'Generate Domain'"
echo "4. Copy the generated domain"
echo "5. Set CORS_ORIGIN: railway variables set CORS_ORIGIN=https://your-domain.railway.app"
echo "6. Wait for redeployment (~2 minutes)"
echo ""
echo "🎉 Your app will be live at the generated domain!"
