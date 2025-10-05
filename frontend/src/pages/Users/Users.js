import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const Users = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You don't have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Admin user management interface will be implemented here.
      </Typography>
    </Box>
  );
};

export default Users;