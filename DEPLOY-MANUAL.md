# Hướng dẫn Deploy từng bước trên Render
# Vì Blueprint có một số hạn chế, chúng ta sẽ deploy thủ công từng service

## Bước 1: Tạo PostgreSQL Database

1. Vào Render Dashboard: https://dashboard.render.com
2. Click "New" → "PostgreSQL"
3. Cấu hình:
   - Name: product-management-db
   - Database: product_management
   - User: product_user
   - Plan: Free
4. Click "Create Database"
5. Đợi database khởi tạo (2-3 phút)
6. Copy "External Database URL" để dùng cho backend

## Bước 2: Deploy Backend

1. Click "New" → "Web Service"
2. Connect GitHub repository
3. Cấu hình:
   - Name: product-management-backend
   - Environment: Node
   - Build Command: cd backend && npm install
   - Start Command: cd backend && npm start
   - Plan: Free

4. Environment Variables:
   - NODE_ENV: production
   - DATABASE_URL: [paste Database URL từ bước 1]
   - JWT_SECRET: your-super-secret-jwt-key-change-this-123456789
   - JWT_EXPIRES_IN: 7d
   - RATE_LIMIT_WINDOW_MS: 900000
   - RATE_LIMIT_MAX_REQUESTS: 100
   - CORS_ORIGIN: * (tạm thời, sẽ update sau)

5. Click "Create Web Service"
6. Đợi build & deploy (5-10 phút)
7. Copy service URL (vd: https://product-management-backend-abc.onrender.com)

## Bước 3: Deploy Frontend

1. Click "New" → "Static Site"
2. Connect cùng GitHub repository
3. Cấu hình:
   - Name: product-management-frontend
   - Build Command: cd frontend && npm install && npm run build
   - Publish Directory: frontend/build
   - Plan: Free

4. Environment Variables:
   - REACT_APP_API_URL: [Backend URL từ bước 2]/api
   - REACT_APP_WS_URL: [Backend URL từ bước 2]

5. Click "Create Static Site"
6. Đợi build & deploy (5-10 phút)
7. Copy service URL (vd: https://product-management-frontend-xyz.onrender.com)

## Bước 4: Cập nhật CORS

1. Vào Backend service → Environment
2. Cập nhật CORS_ORIGIN với Frontend URL từ bước 3
3. Click "Save Changes"
4. Service sẽ tự động redeploy

## Bước 5: Test

1. Vào Frontend URL
2. Test đăng ký tài khoản mới
3. Test login
4. Test các chức năng cơ bản

## URLs sau khi hoàn thành:
- Database: Internal Render database
- Backend API: https://product-management-backend-[random].onrender.com
- Frontend App: https://product-management-frontend-[random].onrender.com