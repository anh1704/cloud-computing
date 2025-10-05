#!/bin/bash

# Product Management System - Deploy Preparation Script
# Chạy script này để chuẩn bị deploy lên Render

echo "🚀 Chuẩn bị deploy Product Management System lên Render..."
echo ""

# Kiểm tra Git
if ! command -v git &> /dev/null; then
    echo "❌ Git chưa được cài đặt. Vui lòng install Git trước."
    exit 1
fi

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt. Vui lòng install Node.js trước."
    exit 1
fi

echo "✅ Git và Node.js đã sẵn sàng"

# Test backend dependencies
echo ""
echo "📦 Kiểm tra Backend dependencies..."
cd backend
if npm install --dry-run > /dev/null 2>&1; then
    echo "✅ Backend dependencies OK"
else
    echo "❌ Backend dependencies có vấn đề"
    echo "Đang cài đặt dependencies..."
    npm install
fi

# Test frontend dependencies  
echo ""
echo "📦 Kiểm tra Frontend dependencies..."
cd ../frontend
if npm install --dry-run > /dev/null 2>&1; then
    echo "✅ Frontend dependencies OK"
else
    echo "❌ Frontend dependencies có vấn đề"
    echo "Đang cài đặt dependencies..."
    npm install
fi

# Quay về root directory
cd ..

# Kiểm tra các file cần thiết
echo ""
echo "📋 Kiểm tra files cần thiết cho deploy..."

if [ -f "render.yaml" ]; then
    echo "✅ render.yaml có sẵn"
else
    echo "❌ render.yaml không tìm thấy"
    exit 1
fi

if [ -f "backend/package.json" ]; then
    echo "✅ backend/package.json có sẵn"
else
    echo "❌ backend/package.json không tìm thấy"
    exit 1
fi

if [ -f "frontend/package.json" ]; then
    echo "✅ frontend/package.json có sẵn"
else
    echo "❌ frontend/package.json không tìm thấy"
    exit 1
fi

# Git setup
echo ""
echo "📝 Chuẩn bị Git repository..."

if [ -d ".git" ]; then
    echo "✅ Git repository đã được khởi tạo"
else
    echo "🔧 Khởi tạo Git repository..."
    git init
    git branch -M main
fi

# Add và commit files
echo "📤 Thêm files vào Git..."
git add .

if git diff --cached --quiet; then
    echo "ℹ️ Không có thay đổi mới để commit"
else
    echo "💾 Commit changes..."
    git commit -m "Ready for Render deployment - Product Management System"
fi

echo ""
echo "🎉 Chuẩn bị deploy hoàn tất!"
echo ""
echo "📋 Các bước tiếp theo:"
echo "1. Tạo repository trên GitHub"
echo "2. Chạy lệnh: git remote add origin https://github.com/YOUR_USERNAME/product-management-system.git"
echo "3. Chạy lệnh: git push -u origin main"
echo "4. Vào https://dashboard.render.com"
echo "5. Chọn 'New' → 'Blueprint'"
echo "6. Connect GitHub repository"
echo "7. Render sẽ tự động deploy dựa trên render.yaml"
echo ""
echo "📖 Xem thêm chi tiết trong file DEPLOY.md"
echo ""