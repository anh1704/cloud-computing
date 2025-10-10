# Distributed System Architecture Guide

## Overview

This Product Management System now uses a distributed architecture with multiple nodes for high availability and fault tolerance. When one node fails, other nodes continue to serve requests, ensuring system reliability.

## Architecture Components

### 1. Node Manager
- **Purpose**: Manages cluster membership and health monitoring
- **Features**:
  - Node registration and discovery
  - Health checks and failure detection
  - Leader election for coordination
  - Automatic node cleanup

### 2. Load Balancer
- **Purpose**: Distributes requests across healthy nodes
- **Strategies**:
  - Round-robin load distribution
  - Health-based routing
  - Automatic failover to healthy nodes
  - Request retry mechanism

### 3. Data Sync Service
- **Purpose**: Maintains data consistency across all nodes
- **Features**:
  - Real-time data synchronization
  - Conflict resolution
  - Bulk data transfer for new nodes
  - Data consistency verification

## How It Works

### Node Registration
1. Each node starts with a unique ID and port
2. Nodes discover and register with each other
3. Health checks maintain node status
4. Failed nodes are automatically removed

### Load Balancing
1. Requests are distributed across healthy nodes
2. If a node fails, requests are redirected
3. New nodes automatically join the load balancing pool
4. Multiple fallback strategies ensure reliability

### Data Synchronization
1. All data changes are propagated to other nodes
2. New nodes receive full data sync on join
3. Consistency checks detect and resolve conflicts
4. Leader nodes coordinate sync operations

## Starting the Distributed System

### Single Node (Development)
```bash
# Start single node on port 5000
cd backend
npm start
```

### Multi-Node Cluster (Production)
```bash
# Start 3 nodes on ports 5000, 5001, 5002
./start-cluster.sh 3 5000

# Or manually start each node:
PORT=5000 NODE_ID=node-5000 npm start &
PORT=5001 NODE_ID=node-5001 DISCOVERY_NODES=localhost:5000 npm start &
PORT=5002 NODE_ID=node-5002 DISCOVERY_NODES=localhost:5000,localhost:5001 npm start &
```

### Environment Variables
```bash
# Node Configuration
PORT=5000                    # Port for this node
NODE_ID=node-5000           # Unique node identifier
DISCOVERY_NODES=localhost:5001,localhost:5002  # Other nodes to discover

# Database (each node can have separate DB)
DATABASE_URL=postgresql://user:pass@localhost:5432/db_node_0
```

## Cluster Management

### Health Monitoring
- Automatic health checks every 10 seconds
- Failed nodes removed after 60 seconds of inactivity
- Real-time cluster status via `/api/nodes/cluster`

### Manual Operations
```bash
# Check cluster status
curl http://localhost:5000/api/nodes/cluster

# Check data consistency
curl -X POST http://localhost:5000/api/sync/consistency-check

# Resolve conflicts (leader only)
curl -X POST http://localhost:5000/api/sync/resolve-conflicts

# Node discovery
curl http://localhost:5000/api/nodes/discover
```

## High Availability Features

### Automatic Failover
- Requests automatically redirect to healthy nodes
- No single point of failure
- Graceful degradation under load

### Data Redundancy
- All nodes maintain complete data copies
- Real-time synchronization ensures consistency
- Automatic conflict resolution

### Leader Election
- Automatic leader selection for coordination
- Leader handles complex sync operations
- Seamless leader failover when needed

## Monitoring & Troubleshooting

### Cluster Status Page
Access the web interface at `/cluster` to view:
- Node health status
- Load balancer statistics  
- Data consistency status
- Real-time cluster metrics

### Log Files
```bash
# View logs for each node
tail -f logs/node-5000.log
tail -f logs/node-5001.log
tail -f logs/node-5002.log
```

### Common Issues

#### Node Registration Failure
- Check if target node is running
- Verify network connectivity
- Ensure DISCOVERY_NODES is correctly formatted

#### Data Inconsistency
- Run consistency check: `/api/sync/consistency-check`
- Use conflict resolution: `/api/sync/resolve-conflicts`
- Check network connectivity between nodes

#### Load Balancer Issues
- Verify node health status
- Check for network timeouts
- Review load balancer logs

## Production Deployment

### Database Setup
Each node should have access to the same PostgreSQL database or use database clustering for true distribution.

### Network Configuration
- Ensure all nodes can communicate
- Configure proper firewall rules
- Use service discovery in containerized environments

### Monitoring
- Set up health check endpoints
- Monitor cluster status dashboards
- Configure alerts for node failures

### Scaling
- Add new nodes dynamically
- Nodes auto-discover and sync
- Remove nodes gracefully

## Security Considerations

- Inter-node communication authentication
- Secure database connections
- Network segmentation
- Health check endpoint protection
- Rate limiting for sync operations

## Performance Tuning

- Adjust health check intervals
- Configure sync batch sizes
- Optimize database connections
- Tune load balancer timeouts
- Monitor resource usage per node

This distributed architecture provides fault tolerance, scalability, and high availability for the Product Management System while maintaining data consistency across all nodes.