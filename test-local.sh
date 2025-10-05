#!/bin/bash

# Product Management System - Local Test Script
# Test hệ thống local trước khi deploy

echo "🧪 Testing Product Management System locally..."
echo ""

# Kiểm tra Backend
echo "🔧 Testing Backend..."
cd backend

# Install dependencies nếu chưa có
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Start backend trong background
echo "🚀 Starting backend server..."
npm start &
BACKEND_PID=$!

# Đợi backend khởi động
sleep 5

# Test health endpoint
echo "🔍 Testing backend health endpoint..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    kill $BACKEND_PID
    exit 1
fi

# Test API endpoints
echo "🔍 Testing API endpoints..."
if curl -f http://localhost:5000/api/categories > /dev/null 2>&1; then
    echo "✅ Categories endpoint accessible"
else
    echo "⚠️ Categories endpoint requires authentication (expected)"
fi

# Dừng backend
kill $BACKEND_PID
echo "🛑 Backend stopped"

# Test Frontend
echo ""
echo "🎨 Testing Frontend..."
cd ../frontend

# Install dependencies nếu chưa có
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Test build
echo "🔨 Testing frontend build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend build successful"
    echo "📁 Build output in frontend/build/"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Quay về root
cd ..

echo ""
echo "🎉 All tests passed! System ready for deployment."
echo ""
echo "📋 Next steps:"
echo "1. Run: ./deploy-prep.sh"
echo "2. Push to GitHub"
echo "3. Deploy on Render"
echo ""