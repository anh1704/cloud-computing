import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Button } from '@mui/material';
import { Share, Sync, People } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useP2P } from '../../context/P2PContext';
import { useSocket } from '../../context/SocketContext';

const P2PSync = () => {
  const { peerId, connections, syncRequests } = useP2P();
  const { onlineUsers } = useSocket();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        P2P Synchronization
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Connect and sync data with other users in real-time
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Peer Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Your P2P Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Share color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Peer ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {peerId || 'Initializing...'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip
                  label={`${connections.length} Active Connections`}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={`${syncRequests.length} Pending Requests`}
                  color="warning"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Online Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Online Users ({onlineUsers.length})
              </Typography>
              {onlineUsers.length === 0 ? (
                <Typography color="text.secondary">
                  No other users are currently online
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {onlineUsers.map((user) => (
                    <Box
                      key={user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <People />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {user.full_name || user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Sync />}
                      >
                        Connect
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sync Requests */}
        {syncRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Pending Sync Requests
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {syncRequests.map((request) => (
                    <Box
                      key={request.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {request.type === 'connection' ? 'Connection' : 'Sync'} request
                        {request.from_user && ` from ${request.from_user}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained">
                          Accept
                        </Button>
                        <Button size="small" variant="outlined">
                          Reject
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

export default P2PSync;