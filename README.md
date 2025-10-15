# Hệ thống Quản lý Bán hàng Phân tán

## Tổng quan
Đây là một hệ thống quản lý bán hàng được thiết kế với kiến trúc phân tán, bao gồm 3 backend server và 1 frontend. Hệ thống có khả năng đồng bộ dữ liệu real-time và tự động failover khi server chính gặp sự cố.

## Kiến trúc Hệ thống

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐   ┌───────┐
│Server │◄──┤Server │◄──┤Server │
│   A   │   │   B   │   │   C   │
│(Primary)│   │(Secondary)│   │(Tertiary)│
└───┬───┘   └───┬───┘   └───┬───┘
    │           │           │
    └───────────┼───────────┘
                │
        ┌───────▼───────┐
        │   PostgreSQL  │
        │   Database    │
        └───────────────┘
```

## Tính năng chính

### 🔄 Data Synchronization
- **Real-time sync**: Khi có thay đổi dữ liệu ở server nào, tất cả server khác sẽ được thông báo ngay lập tức
- **Event-driven**: Sử dụng HTTP POST requests để đồng bộ các thay đổi
- **Conflict resolution**: Xử lý xung đột dữ liệu một cách thông minh

### 🏥 Health Monitoring
- **Continuous monitoring**: Mỗi server kiểm tra sức khỏe của các server khác mỗi 30 giây
- **Real-time status**: Frontend hiển thị trạng thái server real-time
- **Performance metrics**: Theo dõi response time và error rate

### 🔄 Automatic Failover
- **Smart switching**: Frontend tự động chuyển sang server khỏe mạnh khi server hiện tại sập
- **Load balancing**: Phân tải dựa trên priority và health status
- **Retry mechanism**: Tự động retry với tối đa 3 lần thử

### 📊 Cluster Management
- **Centralized monitoring**: API endpoints để quản lý và giám sát cluster
- **Health statistics**: Thống kê chi tiết về tình trạng hệ thống
- **Server discovery**: Tự động phát hiện và quản lý các server trong cluster

## Công nghệ sử dụng

### Backend
- **Node.js** với **Express.js**
- **TypeScript** cho type safety
- **PostgreSQL** làm database chính
- **JWT** cho authentication
- **bcrypt** cho password hashing

### Frontend
- **React** với **TypeScript**
- **Tailwind CSS** cho styling
- **Context API** cho state management
- **Fetch API** với failover mechanism

### Infrastructure
- **Render** cho cloud deployment
- **PostgreSQL** shared database
- **HTTP** cho inter-server communication

## Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js 18+
- PostgreSQL 12+
- npm hoặc yarn

### Backend Setup

1. **Clone repository và cài đặt dependencies**:
```bash
cd backend
npm install
```

2. **Cấu hình environment variables**:
```bash
cp env.example .env
# Chỉnh sửa .env với thông tin database của bạn
```

3. **Chạy database migrations** (nếu cần):
```bash
# Tạo tables trong PostgreSQL
```

4. **Chạy development server**:
```bash
npm run dev
```

### Frontend Setup

1. **Cài đặt dependencies**:
```bash
cd frontend
npm install
```

2. **Chạy development server**:
```bash
npm run dev
```

### Chạy Multiple Backend Instances

Để test hệ thống phân tán, bạn có thể chạy 3 backend instances trên các port khác nhau:

```bash
# Terminal 1 - Server A (Primary)
cd backend
SERVER_ID=server-a PORT=4000 npm run dev

# Terminal 2 - Server B (Secondary)  
cd backend
SERVER_ID=server-b PORT=4001 npm run dev

# Terminal 3 - Server C (Tertiary)
cd backend
SERVER_ID=server-c PORT=4002 npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/register` - Đăng ký user mới
- `POST /auth/login` - Đăng nhập
- `GET /auth/me` - Lấy thông tin user hiện tại

### Products
- `GET /products` - Lấy danh sách sản phẩm
- `GET /products/:id` - Lấy chi tiết sản phẩm
- `POST /products` - Tạo sản phẩm mới
- `PUT /products/:id` - Cập nhật sản phẩm
- `DELETE /products/:id` - Xóa sản phẩm

### Distributed System
- `GET /api/health` - Health check
- `POST /api/sync/receive` - Nhận sync events
- `GET /api/cluster/status` - Trạng thái cluster
- `GET /api/cluster/healthy-servers` - Danh sách server khỏe mạnh

## Testing

### Chạy Test Suite
```bash
cd backend
node test-distributed.js
```

### Test Cases
1. **Health Check**: Kiểm tra tất cả server có hoạt động không
2. **Cluster Status**: Kiểm tra thông tin cluster
3. **Data Sync**: Test đồng bộ dữ liệu giữa các server
4. **Failover**: Test cơ chế chuyển đổi server

## Deployment

### Render Deployment
Xem file `DEPLOYMENT.md` để biết hướng dẫn chi tiết deploy lên Render.

### Environment Variables
```bash
# Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=5432

# JWT
JWT_SECRET=your-jwt-secret

# Server Configuration
SERVER_ID=server-a
PORT=4000

# Other Servers
SERVER_A_URL=https://backend-server-a.onrender.com
SERVER_B_URL=https://backend-server-b.onrender.com
SERVER_C_URL=https://backend-server-c.onrender.com
```

## Monitoring và Logging

### Health Monitoring
- Mỗi server kiểm tra health của các server khác mỗi 30 giây
- Frontend hiển thị trạng thái real-time
- API endpoints để lấy thông tin cluster

### Logging
- Structured logging cho tất cả operations
- Sync events được log chi tiết
- Error tracking và debugging

### Metrics
- Response time của mỗi server
- Success/failure rate
- Sync latency
- Failover frequency

## Troubleshooting

### Common Issues

1. **Sync không hoạt động**:
   - Kiểm tra URLs trong environment variables
   - Kiểm tra network connectivity giữa các server
   - Xem logs để debug

2. **Health check thất bại**:
   - Kiểm tra server có đang chạy không
   - Kiểm tra firewall settings
   - Kiểm tra `/api/health` endpoint

3. **Database connection issues**:
   - Kiểm tra database credentials
   - Kiểm tra network access
   - Kiểm tra database server status

### Debug Commands
```bash
# Kiểm tra health
curl http://localhost:4000/api/health

# Kiểm tra cluster status
curl http://localhost:4000/api/cluster/status

# Kiểm tra products
curl http://localhost:4000/products
```

## Performance và Scalability

### Performance
- **Response time**: < 200ms cho các operations thông thường
- **Sync latency**: < 1 giây cho data synchronization
- **Health check interval**: 30 giây

### Scalability
- **Horizontal scaling**: Có thể thêm nhiều server instances
- **Load balancing**: Tự động phân tải dựa trên health status
- **Database optimization**: Shared database với connection pooling

## Security

### Authentication
- JWT tokens với expiration
- Password hashing với bcrypt
- Protected API endpoints

### Data Protection
- HTTPS cho production
- Input validation và sanitization
- SQL injection prevention

## Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

## Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub repository.
