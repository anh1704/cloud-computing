const EventEmitter = require('events');
const cron = require('node-cron');

class NodeManager extends EventEmitter {
  constructor(nodeId, port) {
    super();
    this.nodeId = nodeId || `node-${port}-${Date.now()}`;
    this.port = port;
    this.nodes = new Map();
    this.isHealthy = true;
    this.lastHeartbeat = Date.now();
    
    // Đăng ký node này
    this.registerSelf();
    
    // Bắt đầu health check
    this.startHealthCheck();
  }

  registerSelf() {
    this.nodes.set(this.nodeId, {
      id: this.nodeId,
      port: this.port,
      status: 'healthy',
      lastSeen: Date.now(),
      isLeader: false
    });
    
    console.log(`Node ${this.nodeId} registered on port ${this.port}`);
  }

  // Đăng ký node khác trong cluster
  registerNode(nodeId, port, status = 'healthy') {
    this.nodes.set(nodeId, {
      id: nodeId,
      port: port,
      status: status,
      lastSeen: Date.now(),
      isLeader: false
    });
    
    console.log(`Registered external node: ${nodeId} on port ${port}`);
    this.emit('nodeRegistered', { nodeId, port, status });
  }

  // Cập nhật trạng thái node
  updateNodeStatus(nodeId, status) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = status;
      node.lastSeen = Date.now();
      
      console.log(`Node ${nodeId} status updated to: ${status}`);
      this.emit('nodeStatusChanged', { nodeId, status });
    }
  }

  // Lấy danh sách nodes healthy
  getHealthyNodes() {
    return Array.from(this.nodes.values()).filter(node => 
      node.status === 'healthy' && 
      (Date.now() - node.lastSeen) < 30000 // 30 seconds timeout
    );
  }

  // Lấy danh sách tất cả nodes
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  // Kiểm tra xem có phải leader không
  isLeader() {
    const node = this.nodes.get(this.nodeId);
    return node ? node.isLeader : false;
  }

  // Bầu chọn leader (node có ID nhỏ nhất trong số healthy nodes)
  electLeader() {
    const healthyNodes = this.getHealthyNodes();
    
    if (healthyNodes.length === 0) {
      console.log('No healthy nodes available');
      return null;
    }

    // Reset tất cả nodes
    healthyNodes.forEach(node => {
      this.nodes.get(node.id).isLeader = false;
    });

    // Chọn node có ID nhỏ nhất làm leader
    const leader = healthyNodes.sort((a, b) => a.id.localeCompare(b.id))[0];
    this.nodes.get(leader.id).isLeader = true;
    
    console.log(`New leader elected: ${leader.id}`);
    this.emit('leaderElected', leader);
    
    return leader;
  }

  // Health check tự động
  startHealthCheck() {
    // Kiểm tra mỗi 10 giây
    cron.schedule('*/10 * * * * *', () => {
      this.performHealthCheck();
    });

    // Cleanup nodes không hoạt động mỗi phút
    cron.schedule('* * * * *', () => {
      this.cleanupInactiveNodes();
    });
  }

  performHealthCheck() {
    // Cập nhật heartbeat của node hiện tại
    this.lastHeartbeat = Date.now();
    const currentNode = this.nodes.get(this.nodeId);
    if (currentNode) {
      currentNode.lastSeen = this.lastHeartbeat;
    }

    // Kiểm tra các node khác
    const healthyCount = this.getHealthyNodes().length;
    const totalCount = this.nodes.size;
    
    if (healthyCount < totalCount) {
      console.log(`Health check: ${healthyCount}/${totalCount} nodes healthy`);
      this.electLeader(); // Bầu lại leader nếu cần
    }

    this.emit('healthCheck', { 
      healthy: healthyCount, 
      total: totalCount,
      nodes: this.getAllNodes()
    });
  }

  cleanupInactiveNodes() {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    for (const [nodeId, node] of this.nodes.entries()) {
      if (nodeId !== this.nodeId && (now - node.lastSeen) > timeout) {
        console.log(`Removing inactive node: ${nodeId}`);
        this.nodes.delete(nodeId);
        this.emit('nodeRemoved', { nodeId });
      }
    }
  }

  // Broadcast tin nhắn đến tất cả nodes healthy
  broadcast(message, excludeSelf = true) {
    const healthyNodes = this.getHealthyNodes();
    const targets = excludeSelf ? 
      healthyNodes.filter(node => node.id !== this.nodeId) : 
      healthyNodes;

    targets.forEach(node => {
      this.emit('broadcast', { targetNode: node, message });
    });

    return targets.length;
  }

  // Lấy thống kê cluster
  getClusterStats() {
    const nodes = this.getAllNodes();
    const healthy = nodes.filter(n => n.status === 'healthy').length;
    const leader = nodes.find(n => n.isLeader);

    return {
      totalNodes: nodes.length,
      healthyNodes: healthy,
      currentNode: this.nodeId,
      isCurrentNodeLeader: this.isLeader(),
      leader: leader ? leader.id : null,
      nodes: nodes
    };
  }
}

module.exports = NodeManager;