const express = require('express');
const router = express.Router();

// Register a new node to the cluster
router.post('/register', (req, res) => {
  try {
    const { nodeId, port } = req.body;
    
    if (!nodeId || !port) {
      return res.status(400).json({ 
        error: 'NodeId and port are required' 
      });
    }
    
    const app = req.app;
    const nodeManager = app.get('nodeManager');
    
    if (!nodeManager) {
      return res.status(500).json({ 
        error: 'NodeManager not initialized' 
      });
    }
    
    // Đăng ký node mới
    nodeManager.registerNode(nodeId, port, 'healthy');
    
    // Trả về thông tin cluster hiện tại
    const clusterInfo = nodeManager.getClusterStats();
    
    console.log(`Node ${nodeId} registered successfully from port ${port}`);
    
    res.json({
      success: true,
      message: 'Node registered successfully',
      nodeId: nodeId,
      cluster: clusterInfo
    });
    
  } catch (error) {
    console.error('Node registration error:', error.message);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Heartbeat endpoint
router.post('/heartbeat', (req, res) => {
  try {
    const { nodeId } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ 
        error: 'NodeId is required for heartbeat' 
      });
    }
    
    const app = req.app;
    const nodeManager = app.get('nodeManager');
    
    if (!nodeManager) {
      return res.status(500).json({ 
        error: 'NodeManager not initialized' 
      });
    }
    
    // Cập nhật trạng thái node
    nodeManager.updateNodeStatus(nodeId, 'healthy');
    
    res.json({
      success: true,
      timestamp: Date.now(),
      cluster: nodeManager.getClusterStats()
    });
    
  } catch (error) {
    console.error('Heartbeat error:', error.message);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Get cluster information
router.get('/cluster', (req, res) => {
  try {
    const app = req.app;
    const nodeManager = app.get('nodeManager');
    const loadBalancer = app.get('loadBalancer');
    
    if (!nodeManager) {
      return res.status(500).json({ 
        error: 'NodeManager not initialized' 
      });
    }
    
    const clusterStats = nodeManager.getClusterStats();
    const loadBalancerStats = loadBalancer ? loadBalancer.getStats() : null;
    
    res.json({
      cluster: clusterStats,
      loadBalancer: loadBalancerStats,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Cluster info error:', error.message);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Discover other nodes
router.get('/discover', (req, res) => {
  try {
    const app = req.app;
    const nodeManager = app.get('nodeManager');
    
    if (!nodeManager) {
      return res.status(500).json({ 
        error: 'NodeManager not initialized' 
      });
    }
    
    const healthyNodes = nodeManager.getHealthyNodes();
    
    res.json({
      currentNode: nodeManager.nodeId,
      healthyNodes: healthyNodes,
      totalNodes: nodeManager.getAllNodes().length
    });
    
  } catch (error) {
    console.error('Node discovery error:', error.message);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Leave cluster
router.post('/leave', (req, res) => {
  try {
    const { nodeId } = req.body;
    
    const app = req.app;
    const nodeManager = app.get('nodeManager');
    
    if (!nodeManager) {
      return res.status(500).json({ 
        error: 'NodeManager not initialized' 
      });
    }
    
    if (nodeId === nodeManager.nodeId) {
      return res.status(400).json({ 
        error: 'Cannot remove self from cluster' 
      });
    }
    
    // Remove node from cluster
    nodeManager.nodes.delete(nodeId);
    
    console.log(`Node ${nodeId} left the cluster`);
    
    res.json({
      success: true,
      message: `Node ${nodeId} removed from cluster`,
      cluster: nodeManager.getClusterStats()
    });
    
  } catch (error) {
    console.error('Node leave error:', error.message);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;