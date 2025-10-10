# Hướng Dẫn Deploy lên Render Cloud

## 🚀 Chuẩn Bị Deploy

### 1. Cài Đặt Render CLI
```bash
# Cài đặt Render CLI
npm install -g @render-io/cli

# Hoặc sử dụng yarn
yarn global add @render-io/cli
```

### 2. Đăng Nhập Render
```bash
# Đăng nhập vào tài khoản Render
render login

# Kiểm tra trạng thái đăng nhập
render whoami
```

## 🌩️ Deploy Distributed System

### Tự Động (Khuyến nghị)
```bash
# Chạy script deploy tự động
./deploy-to-render.sh
```

### Thủ Công
```bash
# Deploy từ render.yaml
render deploy

# Hoặc deploy từng service
render service create --name product-management-node-1 --env node --plan starter
render service create --name product-management-node-2 --env node --plan starter  
render service create --name product-management-node-3 --env node --plan starter
render service create --name product-management-frontend --env static --plan free
```

## 🔧 Cấu Hình Environment Variables

### Backend Nodes
Mỗi node cần các environment variables sau:

```bash
# Node Configuration
NODE_ID=node-1-primary              # Unique cho mỗi node
PORT=10000                          # Render sẽ tự động assign
NODE_ENV=production

# Database
DATABASE_URL=postgresql://...       # Từ Render PostgreSQL

# Authentication
JWT_SECRET=your-secret-key          # Tự động generate
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Node Discovery (chỉ cho node 2 và 3)
DISCOVERY_NODES=https://product-management-node-1.onrender.com

# Node Priority
IS_PRIMARY_NODE=true                # Chỉ cho node 1
```

### Frontend
```bash
# API Endpoints
REACT_APP_API_URL=https://product-management-node-1.onrender.com/api
REACT_APP_API_URL_NODE_2=https://product-management-node-2.onrender.com/api
REACT_APP_API_URL_NODE_3=https://product-management-node-3.onrender.com/api
```

## 📊 Kiểm Tra Deployment

### Health Checks
```bash
# Kiểm tra từng node
curl https://product-management-node-1.onrender.com/health
curl https://product-management-node-2.onrender.com/health  
curl https://product-management-node-3.onrender.com/health

# Kiểm tra cluster status
curl https://product-management-node-1.onrender.com/api/nodes/cluster
```

### Frontend URLs
- **Production**: https://product-management-frontend.onrender.com
- **Cluster Status**: https://product-management-frontend.onrender.com/cluster

## 🔄 Quá Trình Khởi Động

### Thứ tự khởi động:
1. **Database** được tạo đầu tiên
2. **Node 1** (Primary) khởi động
3. **Node 2** & **Node 3** khởi động và tự động discover Node 1
4. **Frontend** build và deploy cuối cùng

### Node Discovery:
- Node 2 và 3 sẽ tự động đăng ký với Node 1 sau 15 giây
- Tất cả nodes sẽ sync dữ liệu và bầu chọn leader
- Load balancer tự động phân phối requests

## 🛠️ Troubleshooting

### Node không kết nối được
```bash
# Kiểm tra logs
render logs service-name

# Kiểm tra environment variables
render env list service-name
```

### Database connection issues
```bash
# Kiểm tra DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### CORS Issues
- Đảm bảo frontend URL được thêm vào CORS whitelist
- Kiểm tra environment variables được set đúng

## 📈 Monitoring & Scaling

### Real-time Monitoring
- **Cluster Dashboard**: `/cluster`
- **Health Endpoints**: `/health`
- **API Status**: `/api/nodes/cluster`

### Scaling
```bash
# Scale up nodes (thêm node mới)
render service create --name product-management-node-4 --env node

# Scale down (tắt node)
render service suspend product-management-node-3
```

## 🔒 Security Best Practices

### Environment Variables
- Sử dụng Render's built-in secret management
- Đừng commit secrets vào git
- Rotate JWT secrets định kỳ

### Network Security
- Chỉ cho phép HTTPS traffic
- Sử dụng Render's built-in DDoS protection
- Configure rate limiting appropriately

## 💰 Chi Phí Dự Tính

### Free Tier (Development)
- Database: Free PostgreSQL (1GB)
- Frontend: Free Static Site
- **Lưu ý**: Free tier có giới hạn và có thể sleep

### Starter Tier (Production)
- 3 Backend Nodes: $21/month ($7 x 3)
- Database: $7/month (Starter PostgreSQL)
- Frontend: Free
- **Total**: ~$28/month

### Scaling Tips
- Bắt đầu với 2 nodes để tiết kiệm
- Scale up khi traffic tăng
- Sử dụng monitoring để optimize

## 🚀 Post-Deployment

### Verify System
1. Kiểm tra tất cả health endpoints
2. Test failover bằng cách tắt 1 node
3. Verify data sync hoạt động
4. Test load balancing

### Configure Domain (Optional)
```bash
# Add custom domain
render domain add your-domain.com service-name
```

---

**🎉 Chúc mừng! Distributed system đã được deploy thành công lên Render Cloud!**