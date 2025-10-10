# Product Management System

A modern, full-stack product management system with distributed architecture, automatic failover, and multi-node synchronization, built with Node.js, PostgreSQL, and React.

## 🚀 Features

### Core Features
- **Product Management**: Complete CRUD operations for products with categories
- **User Authentication**: JWT-based authentication with role management
- **Real-time Updates**: WebSocket integration for live data synchronization
- **Distributed System**: Multi-node architecture with automatic failover and load balancing
- **Modern UI**: Beautiful, responsive interface built with Material-UI
- **Stock Management**: Low stock alerts and inventory tracking
- **Category Management**: Organize products with custom categories
- **User Management**: Admin panel for user administration

### Technical Features
- **Real-time Sync**: Socket.io for instant updates across all connected clients
- **Distributed Architecture**: Multi-node cluster with automatic data synchronization and failover
- **Database**: PostgreSQL with connection pooling and migrations
- **API**: RESTful API with comprehensive error handling
- **Security**: Rate limiting, CORS, helmet protection, and input validation
- **Deployment Ready**: Configured for Render platform deployment

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Socket.io** - Real-time communication
- **Node-cron** - Task scheduling for health checks
- **Redis** - Distributed caching and session storage
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express-validator** - Input validation

### Frontend
- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **React Query** - Data fetching and caching
- **React Router** - Navigation
- **Socket.io-client** - Real-time updates
- **Axios** - HTTP client for API calls
- **Framer Motion** - Animations
- **React Hook Form** - Form handling

## 📦 Project Structure

```
product-management-system/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic services (Socket, P2P)
│   │   ├── utils/          # Utility functions
│   │   └── app.js          # Main application file
│   ├── package.json
│   └── .env.example
├── frontend/                # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   ├── public/
│   └── package.json
├── render.yaml             # Render deployment configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Git

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/product_management
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```

   The API server will be running at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_WS_URL=http://localhost:5000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

   The application will be running at `http://localhost:3000`

## 🌐 Deployment on Render

This application is configured for easy deployment on Render platform using the included `render.yaml` file.

### Automatic Deployment

1. **Fork/Clone** this repository to your GitHub account

2. **Connect to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Environment Variables:**
   The deployment will automatically set up:
   - PostgreSQL database
   - Environment variables
   - Build and start commands

### Manual Deployment

If you prefer manual setup:

1. **Database**: Create a PostgreSQL database on Render
2. **Backend**: Deploy as a Web Service with build command `cd backend && npm install`
3. **Frontend**: Deploy as a Static Site with build command `cd frontend && npm install && npm run build`

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### Product Endpoints
- `GET /api/products` - Get all products (with pagination and filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/stock` - Update stock quantity
- `GET /api/products/reports/low-stock` - Get low stock products
- `GET /api/products/reports/stats` - Get product statistics

### Category Endpoints
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### P2P Endpoints
- `GET /api/p2p/connections` - Get P2P connections
- `POST /api/p2p/connections` - Create P2P connection
- `GET /api/p2p/peers` - Get available peers
- `POST /api/p2p/sync-request` - Send sync request

## 🔄 Real-time Features

### WebSocket Events
- **Product Updates**: Live product changes
- **User Presence**: Online/offline status
- **Sync Notifications**: Data synchronization events
- **P2P Connections**: Peer connection status

### P2P Synchronization
- **Direct Connections**: WebRTC-based peer connections
- **Data Sharing**: Sync products, categories, and other data
- **Conflict Resolution**: Handle concurrent updates
- **Offline Support**: Queue sync operations when offline

## 🛡 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all device sizes
- **Dark/Light Theme**: Customizable appearance
- **Animations**: Smooth transitions and micro-interactions
- **Real-time Updates**: Live data without page refresh
- **Intuitive Navigation**: Easy-to-use sidebar navigation
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality
The project includes:
- ESLint configuration
- Error boundary components
- Comprehensive error handling
- Input validation
- Security middleware

## 📈 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Caching**: React Query for client-side caching
- **Code Splitting**: Lazy loading for better performance
- **Compression**: Gzip compression for API responses
- **CDN Ready**: Static assets optimized for CDN delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material-UI for the beautiful component library
- Socket.io for real-time communication
- Simple-peer for WebRTC P2P connections
- Render for easy deployment platform

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ for modern product management needs