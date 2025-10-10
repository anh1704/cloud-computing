import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Computer as NodeIcon,
  Speed as PerformanceIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../../services/api';

const ClusterStatus = () => {
  const [clusterInfo, setClusterInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchClusterInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/nodes/cluster');
      setClusterInfo(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cluster info:', err);
      setError(err.response?.data?.error || 'Failed to fetch cluster information');
    } finally {
      setLoading(false);
    }
  };

  const checkConsistency = async () => {
    try {
      setChecking(true);
      const response = await api.post('/sync/consistency-check');
      
      // Refresh cluster info to show updated status
      await fetchClusterInfo();
      
      if (!response.data.consistent) {
        setError(`Data inconsistency detected: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Consistency check failed:', err);
      setError(err.response?.data?.error || 'Consistency check failed');
    } finally {
      setChecking(false);
    }
  };

  const resolveConflicts = async () => {
    try {
      setResolving(true);
      const response = await api.post('/sync/resolve-conflicts');
      
      // Refresh cluster info
      await fetchClusterInfo();
      
      if (response.data.resolved) {
        setError(null);
      } else {
        setError(`Failed to resolve conflicts: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Conflict resolution failed:', err);
      setError(err.response?.data?.error || 'Conflict resolution failed');
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    fetchClusterInfo();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchClusterInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const getNodeStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'unhealthy':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getNodeStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon />;
      case 'unhealthy':
        return <ErrorIcon />;
      default:
        return <WarningIcon />;
    }
  };

  if (loading && !clusterInfo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !clusterInfo) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchClusterInfo}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Distributed Cluster Status
          </Typography>
          <Box>
            <Button
              startIcon={<SyncIcon />}
              onClick={checkConsistency}
              disabled={checking}
              sx={{ mr: 1 }}
            >
              {checking ? 'Checking...' : 'Check Consistency'}
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchClusterInfo}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={resolveConflicts}
                disabled={resolving}
              >
                {resolving ? 'Resolving...' : 'Resolve Conflicts'}
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Cluster Overview */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <NodeIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {clusterInfo?.cluster?.totalNodes || 0}
                    </Typography>
                    <Typography color="text.secondary">
                      Total Nodes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <HealthyIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" component="div">
                      {clusterInfo?.cluster?.healthyNodes || 0}
                    </Typography>
                    <Typography color="text.secondary">
                      Healthy Nodes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PerformanceIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6" component="div">
                      {clusterInfo?.cluster?.leader || 'None'}
                    </Typography>
                    <Typography color="text.secondary">
                      Current Leader
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box>
                  <Typography variant="h6" component="div">
                    {clusterInfo?.cluster?.currentNode}
                  </Typography>
                  <Typography color="text.secondary">
                    Current Node
                  </Typography>
                  <Chip 
                    label={clusterInfo?.cluster?.isCurrentNodeLeader ? "Leader" : "Follower"} 
                    color={clusterInfo?.cluster?.isCurrentNodeLeader ? "primary" : "default"}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Cluster Health */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cluster Health
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Healthy Nodes: {clusterInfo?.cluster?.healthyNodes} / {clusterInfo?.cluster?.totalNodes}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(clusterInfo?.cluster?.healthyNodes / clusterInfo?.cluster?.totalNodes) * 100 || 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Node Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Node Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Node ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clusterInfo?.cluster?.nodes?.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <NodeIcon sx={{ mr: 1, fontSize: 20 }} />
                          {node.id}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getNodeStatusIcon(node.status)}
                          label={node.status}
                          color={getNodeStatusColor(node.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{node.port}</TableCell>
                      <TableCell>
                        <Chip 
                          label={node.isLeader ? "Leader" : "Follower"} 
                          color={node.isLeader ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(node.lastSeen).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => window.open(`http://localhost:${node.port}/health`, '_blank')}
                          disabled={node.status !== 'healthy'}
                        >
                          <HealthyIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Load Balancer Stats */}
        {clusterInfo?.loadBalancer && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Load Balancer Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Available Nodes
                  </Typography>
                  <Typography variant="h6">
                    {clusterInfo.loadBalancer.availableNodes}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Round Robin Index
                  </Typography>
                  <Typography variant="h6">
                    {clusterInfo.loadBalancer.roundRobinIndex}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Timeout (ms)
                  </Typography>
                  <Typography variant="h6">
                    {clusterInfo.loadBalancer.timeout}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Max Retries
                  </Typography>
                  <Typography variant="h6">
                    {clusterInfo.loadBalancer.retryCount}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </motion.div>
  );
};

export default ClusterStatus;