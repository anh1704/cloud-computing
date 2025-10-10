import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  Warning,
  People,
  Add,
  Share,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

import { productsAPI, categoriesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, onlineUsers } = useSocket();

  const { data: productStats, isLoading: statsLoading } = useQuery(
    'productStats',
    productsAPI.getStats,
    {
      select: (response) => response.data,
    }
  );

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery(
    'lowStockProducts',
    productsAPI.getLowStock,
    {
      select: (response) => response.data,
    }
  );

  const { data: categories, isLoading: categoriesLoading } = useQuery(
    'popularCategories',
    () => categoriesAPI.getPopular(3),
    {
      select: (response) => response.data,
    }
  );

  const statsCards = [
    {
      title: 'Total Products',
      value: productStats?.total_products || 0,
      icon: Inventory,
      color: 'primary',
      loading: statsLoading,
    },
    {
      title: 'Low Stock Items',
      value: productStats?.low_stock_count || 0,
      icon: Warning,
      color: 'warning',
      loading: statsLoading,
    },
    {
      title: 'Online Users',
      value: onlineUsers.length,
      icon: People,
      color: 'success',
      loading: false,
    },
    {
      title: 'Cluster Nodes',
      value: 3, // Distributed system with 3 nodes
      icon: Share,
      color: 'info',
      loading: false,
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back, {user?.full_name || user?.username}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your products today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${
                    card.color === 'primary' ? '#1976d2' :
                    card.color === 'warning' ? '#ed6c02' :
                    card.color === 'success' ? '#2e7d32' :
                    '#0288d1'
                  }, ${
                    card.color === 'primary' ? '#42a5f5' :
                    card.color === 'warning' ? '#ff9800' :
                    card.color === 'success' ? '#4caf50' :
                    '#29b6f6'
                  })`,
                  color: 'white',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        {card.loading ? '-' : card.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {card.title}
                      </Typography>
                    </Box>
                    <Avatar
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        width: 56,
                        height: 56,
                      }}
                    >
                      <card.icon fontSize="large" />
                    </Avatar>
                  </Box>
                  {card.loading && (
                    <LinearProgress sx={{ mt: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/products')}
                    fullWidth
                  >
                    Add New Product
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Inventory />}
                    onClick={() => navigate('/products')}
                    fullWidth
                  >
                    View All Products
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => navigate('/cluster')}
                    fullWidth
                  >
                    Cluster Status
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Low Stock Alert */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Low Stock Alert
                </Typography>
                {lowStockLoading ? (
                  <LinearProgress />
                ) : lowStockProducts?.length === 0 ? (
                  <Typography color="text.secondary">
                    All products are well stocked! 🎉
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {lowStockProducts?.slice(0, 3).map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          backgroundColor: 'rgba(237, 108, 2, 0.1)',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.name}
                        </Typography>
                        <Chip
                          label={`${product.quantity} left`}
                          size="small"
                          color="warning"
                        />
                      </Box>
                    ))}
                    {lowStockProducts?.length > 3 && (
                      <Button
                        size="small"
                        onClick={() => navigate('/products?filter=low-stock')}
                      >
                        View All ({lowStockProducts.length - 3} more)
                      </Button>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  System Status
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Real-time Sync</Typography>
                    <Chip
                      label={connected ? 'Connected' : 'Disconnected'}
                      size="small"
                      color={connected ? 'success' : 'error'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Online Users</Typography>
                    <Chip
                      label={onlineUsers.length}
                      size="small"
                      color="info"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Cluster Nodes</Typography>
                    <Chip
                      label={3}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;