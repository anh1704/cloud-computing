# Product Management System - Deploy Guide

## 🌐 Hướng Dẫn Deploy lên Render

### Phương án 1: Deploy Tự Động (Khuyên dùng)

#### Bước 1: Chuẩn bị Git Repository

```bash
# Di chuyển vào thư mục dự án
cd "product-management-system"

# Thêm tất cả file vào git
git add .

# Commit code
git commit -m "Initial commit - Product Management System"

# Thêm remote repository (thay YOUR_USERNAME bằng tên GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/product-management-system.git

# Push code lên GitHub
git push -u origin main
```

#### Bước 2: Deploy trên Render

1. **Truy cập Render Dashboard:**
   - Vào https://dashboard.render.com
   - Đăng nhập hoặc tạo tài khoản mới

2. **Tạo Blueprint Deployment:**
   - Click nút **"New"** → **"Blueprint"**
   - Connect với GitHub repository của bạn
   - Render sẽ tự động phát hiện file `render.yaml`

3. **Cấu hình tự động:**
   - Database PostgreSQL sẽ được tạo tự động
   - Backend service sẽ được deploy với port 5000
   - Frontend static site sẽ được build và deploy
   - Environment variables sẽ được set tự động

### Phương án 2: Deploy Thủ Công

#### Bước 1: Tạo PostgreSQL Database

1. **Tạo Database:**
   - Vào Render Dashboard → **"New"** → **"PostgreSQL"**
   - Database Name: `product_management`
   - Chọn plan **"Free"**
   - Click **"Create Database"**

2. **Lấy Connection String:**
   - Sau khi database được tạo, copy **"External Database URL"**
   - Ví dụ: `postgresql://username:password@hostname:5432/database_name`

#### Bước 2: Deploy Backend

1. **Tạo Web Service:**
   - Click **"New"** → **"Web Service"**
   - Connect GitHub repository
   - Cấu hình:
     - **Name:** `product-management-backend`
     - **Environment:** `Node`
     - **Build Command:** `cd backend && npm install`
     - **Start Command:** `cd backend && npm start`

2. **Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=[Database URL từ bước 1]
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-url.onrender.com
   ```

#### Bước 3: Deploy Frontend

1. **Tạo Static Site:**
   - Click **"New"** → **"Static Site"**
   - Connect GitHub repository
   - Cấu hình:
     - **Name:** `product-management-frontend`
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `frontend/build`

2. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_WS_URL=https://your-backend-url.onrender.com
   ```

### Bước 4: Cập nhật CORS Origin

Sau khi frontend được deploy, cập nhật `CORS_ORIGIN` trong backend environment:
```
CORS_ORIGIN=https://your-frontend-url.onrender.com
```

## 🔧 Cấu hình Environment Variables Chi Tiết

### Backend Environment Variables:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
JWT_SECRET=super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-url.onrender.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables:
```env
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
REACT_APP_WS_URL=https://your-backend-url.onrender.com
```

## 🚀 Commands để Deploy

### 1. Chuẩn bị và Push code:
```bash
# Di chuyển vào thư mục dự án
cd "/Users/ngocanh/Documents/Điện toán đám mây /product-management-system"

# Add tất cả files
git add .

# Commit
git commit -m "Ready for deployment"

# Tạo repository trên GitHub rồi push
git remote add origin https://github.com/YOUR_USERNAME/product-management-system.git
git branch -M main
git push -u origin main
```

### 2. Test local trước khi deploy:
```bash
# Test Backend
cd backend
npm install
npm start

# Test Frontend (terminal khác)
cd frontend  
npm install
npm start
```

## 📋 Checklist Deploy

- [ ] ✅ Git repository đã được tạo và push lên GitHub
- [ ] ✅ File `render.yaml` có trong root directory
- [ ] ✅ Backend package.json có script "start"
- [ ] ✅ Frontend package.json có script "build"
- [ ] ✅ Environment variables đã được cấu hình
- [ ] ✅ Database connection string đã được set
- [ ] ✅ CORS origin đã được cập nhật
- [ ] ✅ JWT secret đã được đổi cho production

## 🔍 Troubleshooting

### Database Connection Issues:
- Kiểm tra DATABASE_URL format
- Ensure database đã được tạo trên Render
- Check connection string có đúng không

### CORS Issues:
- Cập nhật CORS_ORIGIN với URL chính xác của frontend
- Đảm bảo không có trailing slash

### Build Failures:
- Check build commands trong render.yaml
- Verify all dependencies trong package.json
- Check Node.js version compatibility

## 🎯 URLs sau khi Deploy

- **Frontend:** `https://product-management-frontend.onrender.com`
- **Backend API:** `https://product-management-backend.onrender.com/api`
- **Health Check:** `https://product-management-backend.onrender.com/health`

## 🔒 Security Notes

1. **JWT Secret:** Đổi JWT_SECRET thành một string random mạnh
2. **Database:** Sử dụng strong password cho database
3. **CORS:** Chỉ allow origin từ frontend domain
4. **Rate Limiting:** Đã được config để prevent abuse

Render sẽ tự động handle SSL certificates và domain routing!