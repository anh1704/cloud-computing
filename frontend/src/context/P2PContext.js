import React, { createContext, useContext, useState, useEffect } from 'react';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const P2PContext = createContext({});

export const useP2P = () => {
  const context = useContext(P2PContext);
  if (!context) {
    throw new Error('useP2P must be used within a P2PProvider');
  }
  return context;
};

export const P2PProvider = ({ children }) => {
  const [peerId, setPeerId] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [connections, setConnections] = useState([]);
  const [syncRequests, setSyncRequests] = useState([]);
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (user && connected) {
      initializeP2P();
    }

    return () => {
      cleanup();
    };
  }, [user, connected]);

  useEffect(() => {
    if (socket) {
      setupSocketListeners();
    }

    return () => {
      removeSocketListeners();
    };
  }, [socket]);

  const initializeP2P = async () => {
    try {
      const newPeerId = uuidv4();
      setPeerId(newPeerId);
      
      // Update peer ID on server
      await usersAPI.updatePeerId(newPeerId);
      console.log('P2P initialized with peer ID:', newPeerId);
    } catch (error) {
      console.error('P2P initialization error:', error);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    // P2P signal handling
    const handleP2PSignal = (event) => {
      const { peerId: remotePeerId, signal } = event.detail;
      const peer = peers.get(remotePeerId);
      
      if (peer) {
        try {
          peer.signal(signal);
        } catch (error) {
          console.error('P2P signal error:', error);
        }
      }
    };

    // P2P connection request
    const handleP2PConnectRequest = (event) => {
      const { from_user, from_peer_id, connection_data } = event.detail;
      
      setSyncRequests(prev => [...prev, {
        id: uuidv4(),
        type: 'connection',
        from_user,
        from_peer_id,
        connection_data,
        timestamp: new Date().toISOString()
      }]);
    };

    // P2P data received
    const handleP2PDataReceived = (event) => {
      const { from_user, from_peer_id, shared_data } = event.detail;
      
      toast.success(`Data received from ${from_user}`);
      
      // Process received data
      window.dispatchEvent(new CustomEvent('p2pDataProcessed', {
        detail: { from_user, from_peer_id, shared_data }
      }));
    };

    window.addEventListener('p2pSignal', handleP2PSignal);
    window.addEventListener('p2pConnectRequest', handleP2PConnectRequest);
    window.addEventListener('p2pDataReceived', handleP2PDataReceived);

    return () => {
      window.removeEventListener('p2pSignal', handleP2PSignal);
      window.removeEventListener('p2pConnectRequest', handleP2PConnectRequest);
      window.removeEventListener('p2pDataReceived', handleP2PDataReceived);
    };
  };

  const removeSocketListeners = () => {
    // Clean up event listeners
  };

  const createPeerConnection = (targetPeerId, isInitiator = false) => {
    try {
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

      // Handle peer events
      peer.on('error', (err) => {
        console.error(`Peer connection error with ${targetPeerId}:`, err);
        peers.delete(targetPeerId);
        setPeers(new Map(peers));
        toast.error(`Connection failed with peer ${targetPeerId}`);
      });

      peer.on('signal', (data) => {
        console.log(`Sending signal to ${targetPeerId}`);
        if (socket) {
          socket.emit('p2p:signal', {
            target_peer_id: targetPeerId,
            signal: data
          });
        }
      });

      peer.on('connect', () => {
        console.log(`Connected to peer ${targetPeerId}`);
        toast.success(`Connected to peer ${targetPeerId}`);
        
        setConnections(prev => {
          const exists = prev.find(conn => conn.peer_id === targetPeerId);
          if (exists) return prev;
          return [...prev, {
            peer_id: targetPeerId,
            status: 'connected',
            connected_at: new Date().toISOString()
          }];
        });
      });

      peer.on('data', (data) => {
        handlePeerData(targetPeerId, data);
      });

      peer.on('close', () => {
        console.log(`Peer connection closed with ${targetPeerId}`);
        peers.delete(targetPeerId);
        setPeers(new Map(peers));
        
        setConnections(prev => prev.filter(conn => conn.peer_id !== targetPeerId));
        toast.info(`Disconnected from peer ${targetPeerId}`);
      });

      peers.set(targetPeerId, peer);
      setPeers(new Map(peers));

      return peer;
    } catch (error) {
      console.error('Create peer connection error:', error);
      toast.error('Failed to create peer connection');
      return null;
    }
  };

  const handlePeerData = (peerId, data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'sync_request':
          handleSyncRequest(peerId, message);
          break;
        case 'sync_response':
          handleSyncResponse(peerId, message);
          break;
        case 'product_update':
          handleProductUpdate(peerId, message);
          break;
        case 'heartbeat':
          sendToPeer(peerId, { type: 'heartbeat_response', timestamp: Date.now() });
          break;
        default:
          console.log(`Unknown P2P message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Handle peer data error:', error);
    }
  };

  const handleSyncRequest = (peerId, message) => {
    setSyncRequests(prev => [...prev, {
      id: uuidv4(),
      type: 'sync',
      peer_id: peerId,
      data_type: message.data_type,
      request_id: message.request_id,
      timestamp: message.timestamp
    }]);
    
    toast(`Sync request received for ${message.data_type}`, {
      icon: '🔄',
    });
  };

  const handleSyncResponse = (peerId, message) => {
    toast.success('Sync data received');
    
    window.dispatchEvent(new CustomEvent('syncDataReceived', {
      detail: {
        peer_id: peerId,
        data: message.data,
        data_type: message.data_type,
        request_id: message.request_id
      }
    }));
  };

  const handleProductUpdate = (peerId, message) => {
    toast.info(`Product update received from peer`);
    
    window.dispatchEvent(new CustomEvent('p2pProductUpdate', {
      detail: {
        peer_id: peerId,
        product: message.product,
        action: message.action
      }
    }));
  };

  const connectToPeer = (targetPeerId) => {
    if (peers.has(targetPeerId)) {
      toast.info('Already connected to this peer');
      return;
    }

    const peer = createPeerConnection(targetPeerId, true);
    if (peer && socket) {
      socket.emit('p2p:connect', {
        target_peer_id: targetPeerId,
        connection_data: { peerId }
      });
    }
  };

  const acceptConnection = (requestPeerId) => {
    const peer = createPeerConnection(requestPeerId, false);
    
    setSyncRequests(prev => prev.filter(req => req.from_peer_id !== requestPeerId));
    toast.success('Connection accepted');
  };

  const rejectConnection = (requestPeerId) => {
    setSyncRequests(prev => prev.filter(req => req.from_peer_id !== requestPeerId));
    toast.info('Connection rejected');
  };

  const sendToPeer = (peerId, data) => {
    const peer = peers.get(peerId);
    if (peer && peer.connected) {
      try {
        peer.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Send to peer error:', error);
        return false;
      }
    }
    return false;
  };

  const sendSyncRequest = (peerId, dataType) => {
    const requestId = uuidv4();
    const message = {
      type: 'sync_request',
      data_type: dataType,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

    if (sendToPeer(peerId, message)) {
      toast.success('Sync request sent');
      return requestId;
    } else {
      toast.error('Failed to send sync request');
      return null;
    }
  };

  const sendSyncResponse = (peerId, data, dataType, requestId) => {
    const message = {
      type: 'sync_response',
      data,
      data_type: dataType,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

    if (sendToPeer(peerId, message)) {
      toast.success('Sync data sent');
    } else {
      toast.error('Failed to send sync data');
    }
  };

  const sendProductUpdate = (peerId, product, action = 'update') => {
    const message = {
      type: 'product_update',
      product,
      action,
      timestamp: new Date().toISOString()
    };

    if (sendToPeer(peerId, message)) {
      toast.success('Product update sent');
    } else {
      toast.error('Failed to send product update');
    }
  };

  const disconnectFromPeer = (peerId) => {
    const peer = peers.get(peerId);
    if (peer) {
      peer.destroy();
      peers.delete(peerId);
      setPeers(new Map(peers));
      
      setConnections(prev => prev.filter(conn => conn.peer_id !== peerId));
      toast.info(`Disconnected from peer ${peerId}`);
    }
  };

  const cleanup = () => {
    peers.forEach(peer => peer.destroy());
    setPeers(new Map());
    setConnections([]);
    setSyncRequests([]);
    setPeerId(null);
  };

  const value = {
    peerId,
    peers: Array.from(peers.keys()),
    connections,
    syncRequests,
    connectToPeer,
    acceptConnection,
    rejectConnection,
    sendSyncRequest,
    sendSyncResponse,
    sendProductUpdate,
    disconnectFromPeer,
    sendToPeer,
  };

  return (
    <P2PContext.Provider value={value}>
      {children}
    </P2PContext.Provider>
  );
};