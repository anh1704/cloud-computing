const User = require('../models/User');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> user info
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.is_active) {
          return next(new Error('Invalid user'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  async handleConnection(socket) {
    try {
      const user = socket.user;
      console.log(`User ${user.username} connected with socket ${socket.id}`);

      // Store connection mappings
      this.connectedUsers.set(user.id, socket.id);
      this.userSockets.set(socket.id, user);

      // Update user online status
      await User.updateOnlineStatus(user.id, true);

      // Join user to their personal room
      socket.join(`user:${user.id}`);

      // Broadcast user online status
      socket.broadcast.emit('user:online', {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url
      });

      // Send initial data
      socket.emit('connection:success', {
        message: 'Connected successfully',
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      });

      // Handle product updates
      socket.on('product:update', (data) => {
        this.handleProductUpdate(socket, data);
      });

      // Handle product creation
      socket.on('product:create', (data) => {
        this.handleProductCreate(socket, data);
      });

      // Handle product deletion
      socket.on('product:delete', (data) => {
        this.handleProductDelete(socket, data);
      });

      // Handle sync requests
      socket.on('sync:request', (data) => {
        this.handleSyncRequest(socket, data);
      });

      // Handle sync responses
      socket.on('sync:response', (data) => {
        this.handleSyncResponse(socket, data);
      });

      // Handle P2P connection requests
      socket.on('p2p:connect', (data) => {
        this.handleP2PConnect(socket, data);
      });

      // Handle P2P data sharing
      socket.on('p2p:share', (data) => {
        this.handleP2PShare(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

    } catch (error) {
      console.error('Socket connection error:', error);
      socket.emit('error', { message: 'Connection failed' });
    }
  }

  async handleDisconnect(socket) {
    try {
      const user = this.userSockets.get(socket.id);
      if (user) {
        console.log(`User ${user.username} disconnected`);

        // Remove connection mappings
        this.connectedUsers.delete(user.id);
        this.userSockets.delete(socket.id);

        // Update user offline status
        await User.updateOnlineStatus(user.id, false);

        // Broadcast user offline status
        socket.broadcast.emit('user:offline', {
          id: user.id,
          username: user.username
        });
      }
    } catch (error) {
      console.error('Socket disconnect error:', error);
    }
  }

  handleProductUpdate(socket, data) {
    try {
      const user = socket.user;
      
      // Broadcast product update to all connected clients except sender
      socket.broadcast.emit('product:updated', {
        ...data,
        updated_by: user.username,
        timestamp: new Date().toISOString()
      });

      console.log(`Product ${data.id} updated by ${user.username}`);
    } catch (error) {
      console.error('Product update broadcast error:', error);
    }
  }

  handleProductCreate(socket, data) {
    try {
      const user = socket.user;
      
      // Broadcast new product to all connected clients except sender
      socket.broadcast.emit('product:created', {
        ...data,
        created_by: user.username,
        timestamp: new Date().toISOString()
      });

      console.log(`Product created by ${user.username}`);
    } catch (error) {
      console.error('Product create broadcast error:', error);
    }
  }

  handleProductDelete(socket, data) {
    try {
      const user = socket.user;
      
      // Broadcast product deletion to all connected clients except sender
      socket.broadcast.emit('product:deleted', {
        id: data.id,
        deleted_by: user.username,
        timestamp: new Date().toISOString()
      });

      console.log(`Product ${data.id} deleted by ${user.username}`);
    } catch (error) {
      console.error('Product delete broadcast error:', error);
    }
  }

  handleSyncRequest(socket, data) {
    try {
      const user = socket.user;
      const { peer_id, data_type } = data;

      // Find target user's socket
      const targetUserId = this.getUserIdByPeerId(peer_id);
      const targetSocketId = this.connectedUsers.get(targetUserId);

      if (targetSocketId) {
        this.io.to(targetSocketId).emit('sync:request', {
          from_user: user.username,
          from_peer_id: user.peer_id,
          data_type,
          timestamp: new Date().toISOString()
        });

        socket.emit('sync:request_sent', {
          to_peer_id: peer_id,
          data_type,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('sync:error', {
          message: 'Target peer is not online'
        });
      }
    } catch (error) {
      console.error('Sync request error:', error);
      socket.emit('sync:error', { message: 'Failed to send sync request' });
    }
  }

  handleSyncResponse(socket, data) {
    try {
      const user = socket.user;
      const { to_peer_id, sync_data, data_type } = data;

      // Find target user's socket
      const targetUserId = this.getUserIdByPeerId(to_peer_id);
      const targetSocketId = this.connectedUsers.get(targetUserId);

      if (targetSocketId) {
        this.io.to(targetSocketId).emit('sync:response', {
          from_user: user.username,
          from_peer_id: user.peer_id,
          data_type,
          sync_data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Sync response error:', error);
    }
  }

  handleP2PConnect(socket, data) {
    try {
      const user = socket.user;
      const { target_peer_id, connection_data } = data;

      // Find target user's socket
      const targetUserId = this.getUserIdByPeerId(target_peer_id);
      const targetSocketId = this.connectedUsers.get(targetUserId);

      if (targetSocketId) {
        this.io.to(targetSocketId).emit('p2p:connect_request', {
          from_user: user.username,
          from_peer_id: user.peer_id,
          connection_data,
          timestamp: new Date().toISOString()
        });

        socket.emit('p2p:connect_sent', {
          to_peer_id: target_peer_id,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('p2p:error', {
          message: 'Target peer is not online'
        });
      }
    } catch (error) {
      console.error('P2P connect error:', error);
      socket.emit('p2p:error', { message: 'Failed to connect to peer' });
    }
  }

  handleP2PShare(socket, data) {
    try {
      const user = socket.user;
      const { target_peer_id, shared_data } = data;

      // Find target user's socket
      const targetUserId = this.getUserIdByPeerId(target_peer_id);
      const targetSocketId = this.connectedUsers.get(targetUserId);

      if (targetSocketId) {
        this.io.to(targetSocketId).emit('p2p:data_received', {
          from_user: user.username,
          from_peer_id: user.peer_id,
          shared_data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('P2P share error:', error);
    }
  }

  getUserIdByPeerId(peerId) {
    // This would need to be implemented to find user ID by peer ID
    // For now, we'll assume peer_id maps to user_id directly
    // In a real implementation, you'd query the database
    return peerId;
  }

  // Utility methods
  getUserSocket(userId) {
    const socketId = this.connectedUsers.get(userId);
    return socketId ? this.io.sockets.sockets.get(socketId) : null;
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  sendToUser(userId, event, data) {
    const socket = this.getUserSocket(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.values()).map(user => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url
    }));
  }
}

module.exports = SocketService;