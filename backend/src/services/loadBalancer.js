const axios = require('axios');

class LoadBalancer {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.roundRobinIndex = 0;
    this.retryCount = 3;
    this.timeout = 5000; // 5 seconds
  }

  // Load balancing strategies
  async roundRobin(path, method = 'GET', data = null, headers = {}) {
    const healthyNodes = this.nodeManager.getHealthyNodes()
      .filter(node => node.id !== this.nodeManager.nodeId); // Exclude current node

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available for load balancing');
    }

    // Get next node in round-robin fashion
    const targetNode = healthyNodes[this.roundRobinIndex % healthyNodes.length];
    this.roundRobinIndex++;

    return this.makeRequest(targetNode, path, method, data, headers);
  }

  async leastConnections(path, method = 'GET', data = null, headers = {}) {
    // For simplicity, we'll use round-robin here
    // In a real implementation, you'd track active connections per node
    return this.roundRobin(path, method, data, headers);
  }

  async healthBased(path, method = 'GET', data = null, headers = {}) {
    const healthyNodes = this.nodeManager.getHealthyNodes()
      .filter(node => node.id !== this.nodeManager.nodeId)
      .sort((a, b) => (Date.now() - a.lastSeen) - (Date.now() - b.lastSeen)); // Most recent first

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available');
    }

    return this.makeRequest(healthyNodes[0], path, method, data, headers);
  }

  // Failover: Try multiple nodes until one succeeds
  async withFailover(path, method = 'GET', data = null, headers = {}, strategy = 'roundRobin') {
    const healthyNodes = this.nodeManager.getHealthyNodes()
      .filter(node => node.id !== this.nodeManager.nodeId);

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available for failover');
    }

    let lastError = null;

    for (const node of healthyNodes) {
      try {
        const result = await this.makeRequest(node, path, method, data, headers);
        console.log(`Successfully executed on node ${node.id}`);
        return result;
      } catch (error) {
        console.log(`Failed to execute on node ${node.id}:`, error.message);
        lastError = error;
        
        // Mark node as unhealthy if request fails
        this.nodeManager.updateNodeStatus(node.id, 'unhealthy');
        continue;
      }
    }

    throw new Error(`All nodes failed. Last error: ${lastError?.message}`);
  }

  // Make HTTP request to specific node
  async makeRequest(node, path, method = 'GET', data = null, headers = {}) {
    const url = `http://localhost:${node.port}${path}`;
    
    const config = {
      method: method.toLowerCase(),
      url,
      timeout: this.timeout,
      headers: {
        'X-Node-Source': this.nodeManager.nodeId,
        ...headers
      }
    };

    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
        // Connection failed - mark node as unhealthy
        this.nodeManager.updateNodeStatus(node.id, 'unhealthy');
      }
      throw error;
    }
  }

  // Broadcast data to all healthy nodes
  async broadcast(path, data, method = 'POST') {
    const healthyNodes = this.nodeManager.getHealthyNodes()
      .filter(node => node.id !== this.nodeManager.nodeId);

    if (healthyNodes.length === 0) {
      console.log('No other healthy nodes to broadcast to');
      return { success: 0, failed: 0, results: [] };
    }

    const promises = healthyNodes.map(async (node) => {
      try {
        const result = await this.makeRequest(node, path, method, data);
        return { 
          nodeId: node.id, 
          success: true, 
          result 
        };
      } catch (error) {
        return { 
          nodeId: node.id, 
          success: false, 
          error: error.message 
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = results.length - successCount;

    console.log(`Broadcast completed: ${successCount} success, ${failedCount} failed`);

    return {
      success: successCount,
      failed: failedCount,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };
  }

  // Synchronize data across all nodes
  async syncData(dataType, data) {
    try {
      const result = await this.broadcast(`/api/sync/${dataType}`, data, 'POST');
      
      if (result.success === 0 && result.failed > 0) {
        console.warn(`Data sync failed for ${dataType}. All nodes unreachable.`);
      } else if (result.failed > 0) {
        console.warn(`Partial sync failure for ${dataType}: ${result.failed} nodes failed`);
      } else {
        console.log(`Data sync successful for ${dataType} across ${result.success} nodes`);
      }

      return result;
    } catch (error) {
      console.error(`Failed to sync ${dataType}:`, error.message);
      throw error;
    }
  }

  // Get load balancer stats
  getStats() {
    const clusterStats = this.nodeManager.getClusterStats();
    
    return {
      ...clusterStats,
      loadBalancer: {
        roundRobinIndex: this.roundRobinIndex,
        timeout: this.timeout,
        retryCount: this.retryCount,
        availableNodes: this.nodeManager.getHealthyNodes().length - 1 // Exclude self
      }
    };
  }
}

module.exports = LoadBalancer;