const Peer = require('simple-peer');
const { v4: uuidv4 } = require('uuid');

class P2PService {
  constructor(io) {
    this.io = io;
    this.peers = new Map(); // peerId -> peer instance
    this.connections = new Map(); // userId -> Set of connected peer IDs
    this.dataBuffers = new Map(); // peerId -> data buffer for large transfers
  }

  initialize() {
    console.log('P2P Service initialized');
  }

  createPeer(userId, isInitiator = false) {
    try {
      const peerId = uuidv4();
      
      const peer = new Peer({
        initiator: isInitiator,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
          ]
        }
      });

      // Store peer instance
      this.peers.set(peerId, {
        peer,
        userId,
        connectedTo: new Set(),
        lastActivity: Date.now()
      });

      // Initialize user connections if not exists
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }

      // Handle peer events
      this.setupPeerEvents(peerId, peer, userId);

      return { peerId, peer };
    } catch (error) {
      console.error('Create peer error:', error);
      throw error;
    }
  }

  setupPeerEvents(peerId, peer, userId) {
    peer.on('error', (err) => {
      console.error(`Peer ${peerId} error:`, err);
      this.cleanupPeer(peerId);
    });

    peer.on('signal', (data) => {
      console.log(`Peer ${peerId} signal generated`);
      
      // Send signal data through WebSocket
      this.io.to(`user:${userId}`).emit('p2p:signal', {
        peerId,
        signal: data,
        timestamp: new Date().toISOString()
      });
    });

    peer.on('connect', () => {
      console.log(`Peer ${peerId} connected`);
      
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.lastActivity = Date.now();
        
        // Notify user of successful connection
        this.io.to(`user:${userId}`).emit('p2p:connected', {
          peerId,
          timestamp: new Date().toISOString()
        });
      }
    });

    peer.on('data', (data) => {
      this.handlePeerData(peerId, data, userId);
    });

    peer.on('close', () => {
      console.log(`Peer ${peerId} connection closed`);
      this.cleanupPeer(peerId);
    });

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (peer.connected) {
        peer.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  handlePeerData(peerId, data, userId) {
    try {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.lastActivity = Date.now();
      }

      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'heartbeat':
          // Respond to heartbeat
          this.sendToPeer(peerId, {
            type: 'heartbeat_response',
            timestamp: Date.now()
          });
          break;

        case 'sync_request':
          this.handleSyncRequest(peerId, message, userId);
          break;

        case 'sync_response':
          this.handleSyncResponse(peerId, message, userId);
          break;

        case 'product_update':
          this.handleProductUpdate(peerId, message, userId);
          break;

        case 'bulk_data':
          this.handleBulkData(peerId, message, userId);
          break;

        case 'file_chunk':
          this.handleFileChunk(peerId, message, userId);
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Handle peer data error:', error);
    }
  }

  handleSyncRequest(peerId, message, userId) {
    try {
      console.log(`Sync request from peer ${peerId}:`, message);
      
      // Notify user through WebSocket
      this.io.to(`user:${userId}`).emit('p2p:sync_request', {
        peerId,
        dataType: message.dataType,
        requestId: message.requestId,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Handle sync request error:', error);
    }
  }

  handleSyncResponse(peerId, message, userId) {
    try {
      console.log(`Sync response from peer ${peerId}`);
      
      // Notify user through WebSocket
      this.io.to(`user:${userId}`).emit('p2p:sync_response', {
        peerId,
        data: message.data,
        requestId: message.requestId,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Handle sync response error:', error);
    }
  }

  handleProductUpdate(peerId, message, userId) {
    try {
      console.log(`Product update from peer ${peerId}:`, message.product);
      
      // Notify user through WebSocket
      this.io.to(`user:${userId}`).emit('p2p:product_update', {
        peerId,
        product: message.product,
        action: message.action,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Handle product update error:', error);
    }
  }

  handleBulkData(peerId, message, userId) {
    try {
      console.log(`Bulk data from peer ${peerId}, chunk ${message.chunkIndex}/${message.totalChunks}`);
      
      // Initialize buffer if not exists
      if (!this.dataBuffers.has(peerId)) {
        this.dataBuffers.set(peerId, {
          chunks: new Map(),
          totalChunks: message.totalChunks,
          dataType: message.dataType,
          requestId: message.requestId
        });
      }

      const buffer = this.dataBuffers.get(peerId);
      buffer.chunks.set(message.chunkIndex, message.data);

      // Check if all chunks received
      if (buffer.chunks.size === buffer.totalChunks) {
        const completeData = this.reassembleChunks(buffer.chunks);
        
        // Notify user through WebSocket
        this.io.to(`user:${userId}`).emit('p2p:bulk_data_complete', {
          peerId,
          data: completeData,
          dataType: buffer.dataType,
          requestId: buffer.requestId,
          timestamp: new Date().toISOString()
        });

        // Clean up buffer
        this.dataBuffers.delete(peerId);
      }
    } catch (error) {
      console.error('Handle bulk data error:', error);
    }
  }

  handleFileChunk(peerId, message, userId) {
    try {
      // Handle file transfer chunks
      console.log(`File chunk from peer ${peerId}: ${message.filename}`);
      
      this.io.to(`user:${userId}`).emit('p2p:file_chunk', {
        peerId,
        filename: message.filename,
        chunk: message.chunk,
        chunkIndex: message.chunkIndex,
        totalChunks: message.totalChunks,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Handle file chunk error:', error);
    }
  }

  sendToPeer(peerId, data) {
    try {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo && peerInfo.peer.connected) {
        peerInfo.peer.send(JSON.stringify(data));
        peerInfo.lastActivity = Date.now();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Send to peer error:', error);
      return false;
    }
  }

  sendBulkData(peerId, data, dataType, requestId = null) {
    try {
      const dataString = JSON.stringify(data);
      const chunkSize = 16384; // 16KB chunks
      const totalChunks = Math.ceil(dataString.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, dataString.length);
        const chunk = dataString.slice(start, end);

        const message = {
          type: 'bulk_data',
          chunkIndex: i,
          totalChunks,
          data: chunk,
          dataType,
          requestId,
          timestamp: new Date().toISOString()
        };

        if (!this.sendToPeer(peerId, message)) {
          console.error(`Failed to send chunk ${i} to peer ${peerId}`);
          return false;
        }

        // Small delay between chunks to prevent overwhelming
        setTimeout(() => {}, 10);
      }

      return true;
    } catch (error) {
      console.error('Send bulk data error:', error);
      return false;
    }
  }

  reassembleChunks(chunksMap) {
    try {
      const sortedChunks = Array.from(chunksMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, data]) => data);
      
      const completeDataString = sortedChunks.join('');
      return JSON.parse(completeDataString);
    } catch (error) {
      console.error('Reassemble chunks error:', error);
      return null;
    }
  }

  connectPeers(peerId1, peerId2) {
    try {
      const peer1Info = this.peers.get(peerId1);
      const peer2Info = this.peers.get(peerId2);

      if (!peer1Info || !peer2Info) {
        throw new Error('One or both peers not found');
      }

      // Add to connection tracking
      peer1Info.connectedTo.add(peerId2);
      peer2Info.connectedTo.add(peerId1);

      console.log(`Connected peers ${peerId1} and ${peerId2}`);
      return true;
    } catch (error) {
      console.error('Connect peers error:', error);
      return false;
    }
  }

  disconnectPeer(peerId) {
    try {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        // Destroy peer connection
        peerInfo.peer.destroy();
        
        // Remove from connections
        const userId = peerInfo.userId;
        const userConnections = this.connections.get(userId);
        if (userConnections) {
          userConnections.delete(peerId);
        }

        // Clean up
        this.cleanupPeer(peerId);
        
        console.log(`Disconnected peer ${peerId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Disconnect peer error:', error);
      return false;
    }
  }

  cleanupPeer(peerId) {
    try {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        // Remove from user connections
        const userConnections = this.connections.get(peerInfo.userId);
        if (userConnections) {
          userConnections.delete(peerId);
        }

        // Clean up connected peers
        peerInfo.connectedTo.forEach(connectedPeerId => {
          const connectedPeerInfo = this.peers.get(connectedPeerId);
          if (connectedPeerInfo) {
            connectedPeerInfo.connectedTo.delete(peerId);
          }
        });
      }

      // Remove peer and data buffer
      this.peers.delete(peerId);
      this.dataBuffers.delete(peerId);
    } catch (error) {
      console.error('Cleanup peer error:', error);
    }
  }

  getUserPeers(userId) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return [];

    return Array.from(userConnections).map(peerId => {
      const peerInfo = this.peers.get(peerId);
      return {
        peerId,
        connected: peerInfo ? peerInfo.peer.connected : false,
        lastActivity: peerInfo ? peerInfo.lastActivity : null
      };
    });
  }

  getActivePeersCount() {
    return this.peers.size;
  }

  // Cleanup inactive peers periodically
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [peerId, peerInfo] of this.peers.entries()) {
        if (now - peerInfo.lastActivity > timeout) {
          console.log(`Cleaning up inactive peer ${peerId}`);
          this.cleanupPeer(peerId);
        }
      }
    }, 60000); // Check every minute
  }
}

module.exports = P2PService;