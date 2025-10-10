import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext({});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);

  const connectSocket = () => {
    if (socket) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    
    const newSocket = io(WS_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      toast.success('Connected to real-time updates');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      toast.error('Disconnected from real-time updates');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('connection:success', (data) => {
      console.log('Connection success:', data);
    });

    // User presence events
    newSocket.on('user:online', (userData) => {
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.id === userData.id);
        if (exists) return prev;
        return [...prev, userData];
      });
    });

    newSocket.on('user:offline', (userData) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userData.id));
    });

    // Product events
    newSocket.on('product:created', (data) => {
      toast.success(`New product "${data.name}" created by ${data.created_by}`);
      // Trigger product list refresh
      window.dispatchEvent(new CustomEvent('productCreated', { detail: data }));
    });

    newSocket.on('product:updated', (data) => {
      toast.success(`Product "${data.name}" updated by ${data.updated_by}`);
      // Trigger product list refresh
      window.dispatchEvent(new CustomEvent('productUpdated', { detail: data }));
    });

    newSocket.on('product:deleted', (data) => {
      toast.success(`Product deleted by ${data.deleted_by}`);
      // Trigger product list refresh
      window.dispatchEvent(new CustomEvent('productDeleted', { detail: data }));
    });

    // Sync events
    newSocket.on('sync:request', (data) => {
      toast(`Sync request from ${data.from_user}`, {
        icon: '🔄',
      });
      window.dispatchEvent(new CustomEvent('syncRequest', { detail: data }));
    });

    newSocket.on('sync:response', (data) => {
      toast.success(`Sync response from ${data.from_user}`);
      window.dispatchEvent(new CustomEvent('syncResponse', { detail: data }));
    });

    // Cluster events (replaces P2P)
    newSocket.on('cluster:node_joined', (data) => {
      toast.success(`New node joined cluster: ${data.nodeId}`);
    });

    newSocket.on('cluster:node_left', (data) => {
      toast.warning(`Node left cluster: ${data.nodeId}`);
    });

    newSocket.on('cluster:sync_complete', (data) => {
      toast.success('Data synchronized across cluster');
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Socket error occurred');
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
    }
  };

  const emitProductUpdate = (productData) => {
    if (socket && connected) {
      socket.emit('product:update', productData);
    }
  };

  const emitProductCreate = (productData) => {
    if (socket && connected) {
      socket.emit('product:create', productData);
    }
  };

  const emitProductDelete = (productId) => {
    if (socket && connected) {
      socket.emit('product:delete', { id: productId });
    }
  };

  const emitSyncRequest = (peerId, dataType) => {
    if (socket && connected) {
      socket.emit('sync:request', { peer_id: peerId, data_type: dataType });
    }
  };

  const emitSyncResponse = (peerId, syncData, dataType) => {
    if (socket && connected) {
      socket.emit('sync:response', { to_peer_id: peerId, sync_data: syncData, data_type: dataType });
    }
  };

  // Removed P2P functions - using distributed cluster instead

  const value = {
    socket,
    connected,
    onlineUsers,
    emitProductUpdate,
    emitProductCreate,
    emitProductDelete,
    emitSyncRequest,
    emitSyncResponse,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};