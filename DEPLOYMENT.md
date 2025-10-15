# Hướng dẫn Deploy Hệ thống Phân tán lên Render

## Tổng quan
Hệ thống này bao gồm 3 backend server và 1 frontend, tất cả đều kết nối với cùng một database PostgreSQL để đồng bộ dữ liệu.

## Kiến trúc
```
Frontend (React) 
    ↓
Server A (Primary) ←→ Server B (Secondary) ←→ Server C (Tertiary)
    ↓                    ↓                    ↓
    PostgreSQL Database (Shared)
```

## Các bước Deploy

### 1. Chuẩn bị Database
1. Tạo PostgreSQL database trên Render
2. Lưu lại thông tin kết nối:
   - Host
   - User
   - Password
   - Database name
   - Port

### 2. Deploy Backend Servers

#### Server A (Primary)
1. Tạo Web Service mới trên Render
2. Cấu hình:
   - **Name**: `backend-server-a`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter

3. Environment Variables:
   ```
   NODE_ENV=production
   SERVER_ID=server-a
   PORT=4000
   DB_HOST=<your-db-host>
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   DB_NAME=<your-db-name>
   DB_PORT=5432
   JWT_SECRET=<generate-random-string>
   SERVER_A_URL=https://backend-server-a.onrender.com
   SERVER_B_URL=https://backend-server-b.onrender.com
   SERVER_C_URL=https://backend-server-c.onrender.com
   ```

#### Server B (Secondary)
1. Tạo Web Service mới trên Render
2. Cấu hình tương tự Server A nhưng:
   - **Name**: `backend-server-b`
   - **SERVER_ID**: `server-b`
   - **SERVER_A_URL**: `https://backend-server-a.onrender.com`
   - **SERVER_B_URL**: `https://backend-server-b.onrender.com`
   - **SERVER_C_URL**: `https://backend-server-c.onrender.com`

#### Server C (Tertiary)
1. Tạo Web Service mới trên Render
2. Cấu hình tương tự Server A nhưng:
   - **Name**: `backend-server-c`
   - **SERVER_ID**: `server-c`
   - **SERVER_A_URL**: `https://backend-server-a.onrender.com`
   - **SERVER_B_URL**: `https://backend-server-b.onrender.com`
   - **SERVER_C_URL**: `https://backend-server-c.onrender.com`

### 3. Deploy Frontend
1. Tạo Static Site mới trên Render
2. Cấu hình:
   - **Name**: `frontend-app`
   - **Environment**: `Static`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. Environment Variables:
   ```
   VITE_API_URL=https://backend-server-a.onrender.com
   ```

### 4. Cập nhật Frontend Configuration
Sau khi deploy, cập nhật file `frontend/src/services/serverManager.ts` với URLs thực tế:

```typescript
private servers: ServerConfig[] = [
  {
    id: 'server-a',
    name: 'Primary Server',
    url: 'https://backend-server-a.onrender.com',
    isHealthy: true,
    lastCheck: new Date(),
    priority: 1
  },
  {
    id: 'server-b',
    name: 'Secondary Server', 
    url: 'https://backend-server-b.onrender.com',
    isHealthy: true,
    lastCheck: new Date(),
    priority: 2
  },
  {
    id: 'server-c',
    name: 'Tertiary Server',
    url: 'https://backend-server-c.onrender.com', 
    isHealthy: true,
    lastCheck: new Date(),
    priority: 3
  }
];
```

## Tính năng

### 1. Data Synchronization
- Khi có thay đổi dữ liệu ở server nào, tất cả server khác sẽ được thông báo
- Sử dụng HTTP POST requests để đồng bộ
- Endpoint: `/api/sync/receive`

### 2. Health Monitoring
- Mỗi server kiểm tra sức khỏe của các server khác mỗi 30 giây
- Endpoint: `/api/health`
- Frontend hiển thị trạng thái real-time

### 3. Automatic Failover
- Frontend tự động chuyển sang server khỏe mạnh khi server hiện tại sập
- Load balancing dựa trên priority
- Retry mechanism với tối đa 3 lần thử

### 4. Cluster Management
- API endpoints để quản lý cluster:
  - `GET /api/cluster/status` - Trạng thái tổng thể
  - `GET /api/cluster/healthy-servers` - Danh sách server khỏe mạnh

## Testing

### 1. Test Data Sync
1. Thêm sản phẩm từ server A
2. Kiểm tra server B và C có nhận được sản phẩm mới không
3. Cập nhật sản phẩm từ server B
4. Kiểm tra server A và C có cập nhật không

### 2. Test Failover
1. Tắt server A
2. Thêm sản phẩm từ frontend
3. Kiểm tra frontend có chuyển sang server B không
4. Bật lại server A
5. Kiểm tra đồng bộ dữ liệu

### 3. Test Health Monitoring
1. Truy cập `/api/health` trên mỗi server
2. Kiểm tra frontend hiển thị trạng thái đúng
3. Tắt một server và xem frontend cập nhật

## Monitoring

### Logs
- Mỗi server log các hoạt động sync và health check
- Frontend log các request và failover events

### Metrics
- Response time của mỗi server
- Số lượng request thành công/thất bại
- Tần suất failover

## Troubleshooting

### Common Issues
1. **Sync không hoạt động**: Kiểm tra URLs trong environment variables
2. **Health check thất bại**: Kiểm tra network connectivity
3. **Database connection**: Kiểm tra credentials và network access

### Debug Commands
```bash
# Kiểm tra health của server
curl https://backend-server-a.onrender.com/api/health

# Kiểm tra cluster status
curl https://backend-server-a.onrender.com/api/cluster/status

# Kiểm tra logs trên Render dashboard
```

## Cost Optimization
- Sử dụng Starter plan cho tất cả services
- Database có thể share giữa các server
- Frontend deploy dưới dạng static site (miễn phí)
