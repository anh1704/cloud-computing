import React from 'react';
import { Box, Typography } from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Application settings will be implemented here.
      </Typography>
    </Box>
  );
};

export default Settings;