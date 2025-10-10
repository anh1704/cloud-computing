class DataSyncService {
  constructor(nodeManager, loadBalancer) {
    this.nodeManager = nodeManager;
    this.loadBalancer = loadBalancer;
    this.syncQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    
    // Lắng nghe các sự kiện từ node manager
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Khi có node mới join
    this.nodeManager.on('nodeRegistered', (nodeInfo) => {
      console.log(`Node ${nodeInfo.nodeId} joined. Initiating full sync...`);
      this.fullSyncToNode(nodeInfo.nodeId);
    });

    // Khi node bị remove
    this.nodeManager.on('nodeRemoved', (nodeInfo) => {
      console.log(`Node ${nodeInfo.nodeId} removed from cluster`);
    });

    // Khi có leader mới
    this.nodeManager.on('leaderElected', (leader) => {
      if (leader.id === this.nodeManager.nodeId) {
        console.log('This node is now the leader. Managing sync operations...');
      }
    });
  }

  // Thêm operation vào sync queue
  queueSync(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      retries: 0
    });

    if (!this.isProcessing) {
      this.processSyncQueue();
    }
  }

  // Xử lý sync queue
  async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift();
      
      try {
        await this.executeSyncOperation(operation);
        console.log(`Sync operation completed: ${operation.type}`);
      } catch (error) {
        console.error(`Sync operation failed:`, error.message);
        
        // Retry logic
        operation.retries++;
        if (operation.retries < this.maxRetries) {
          console.log(`Retrying sync operation (${operation.retries}/${this.maxRetries})`);
          this.syncQueue.push(operation);
        } else {
          console.error(`Sync operation failed after ${this.maxRetries} retries:`, operation);
        }
      }
    }

    this.isProcessing = false;
  }

  // Thực hiện sync operation
  async executeSyncOperation(operation) {
    const { type, action, data, targetNode } = operation;

    if (targetNode) {
      // Sync đến node cụ thể
      return await this.loadBalancer.makeRequest(
        { id: targetNode.id, port: targetNode.port },
        `/api/sync/${type}`,
        'POST',
        { action, data }
      );
    } else {
      // Broadcast đến tất cả nodes
      return await this.loadBalancer.broadcast(
        `/api/sync/${type}`,
        { action, data },
        'POST'
      );
    }
  }

  // Sync products
  async syncProduct(action, productData) {
    this.queueSync({
      type: 'products',
      action, // create, update, delete
      data: productData
    });
  }

  // Sync categories
  async syncCategory(action, categoryData) {
    this.queueSync({
      type: 'categories',
      action, // create, update, delete
      data: categoryData
    });
  }

  // Sync users
  async syncUser(action, userData) {
    this.queueSync({
      type: 'users',
      action, // create, update, delete
      data: userData
    });
  }

  // Full sync khi node mới join
  async fullSyncToNode(nodeId) {
    const targetNode = this.nodeManager.nodes.get(nodeId);
    if (!targetNode) {
      throw new Error(`Node ${nodeId} not found`);
    }

    try {
      // Chỉ leader thực hiện full sync
      if (!this.nodeManager.isLeader()) {
        console.log('Not a leader, skipping full sync');
        return;
      }

      console.log(`Starting full sync to node ${nodeId}`);

      // Sync products
      const Product = require('../models/Product');
      const products = await Product.getAll();
      
      if (products.length > 0) {
        await this.loadBalancer.makeRequest(
          targetNode,
          '/api/sync/products/bulk',
          'POST',
          { products }
        );
      }

      // Sync categories  
      const Category = require('../models/Category');
      const categories = await Category.getAll();
      
      if (categories.length > 0) {
        await this.loadBalancer.makeRequest(
          targetNode,
          '/api/sync/categories/bulk',
          'POST',
          { categories }
        );
      }

      console.log(`Full sync completed for node ${nodeId}`);
      
    } catch (error) {
      console.error(`Full sync failed for node ${nodeId}:`, error.message);
      throw error;
    }
  }

  // Kiểm tra tính nhất quán dữ liệu
  async checkDataConsistency() {
    const healthyNodes = this.nodeManager.getHealthyNodes()
      .filter(node => node.id !== this.nodeManager.nodeId);

    if (healthyNodes.length === 0) {
      return { consistent: true, message: 'Only one node active' };
    }

    try {
      // Lấy hash của dữ liệu từ các nodes
      const promises = healthyNodes.map(node => 
        this.loadBalancer.makeRequest(node, '/api/sync/hash', 'GET')
      );

      const results = await Promise.allSettled(promises);
      const hashes = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      // So sánh với hash local
      const Product = require('../models/Product');
      const Category = require('../models/Category');
      
      const localProducts = await Product.getAll();
      const localCategories = await Category.getAll();
      
      const localHash = this.calculateDataHash({
        products: localProducts,
        categories: localCategories
      });

      const allHashes = [localHash, ...hashes.map(h => h.dataHash)];
      const uniqueHashes = [...new Set(allHashes)];

      const isConsistent = uniqueHashes.length === 1;

      return {
        consistent: isConsistent,
        message: isConsistent ? 'Data is consistent across all nodes' : 'Data inconsistency detected',
        hashes: allHashes,
        nodeCount: healthyNodes.length + 1
      };

    } catch (error) {
      console.error('Data consistency check failed:', error.message);
      return {
        consistent: false,
        message: `Consistency check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Tính hash của dữ liệu
  calculateDataHash(data) {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  // Resolve data conflicts
  async resolveConflicts() {
    const consistencyResult = await this.checkDataConsistency();
    
    if (consistencyResult.consistent) {
      return { resolved: true, message: 'No conflicts to resolve' };
    }

    if (!this.nodeManager.isLeader()) {
      throw new Error('Only leader can resolve conflicts');
    }

    try {
      // Thực hiện full sync từ leader đến tất cả nodes
      const healthyNodes = this.nodeManager.getHealthyNodes()
        .filter(node => node.id !== this.nodeManager.nodeId);

      const syncPromises = healthyNodes.map(node => 
        this.fullSyncToNode(node.id)
      );

      await Promise.allSettled(syncPromises);

      return {
        resolved: true,
        message: `Conflicts resolved by syncing from leader to ${healthyNodes.length} nodes`
      };

    } catch (error) {
      console.error('Conflict resolution failed:', error.message);
      return {
        resolved: false,
        message: `Conflict resolution failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Lấy sync statistics
  getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      maxRetries: this.maxRetries,
      nodeManager: this.nodeManager.getClusterStats(),
      lastSyncTime: this.lastSyncTime || null
    };
  }
}

module.exports = DataSyncService;