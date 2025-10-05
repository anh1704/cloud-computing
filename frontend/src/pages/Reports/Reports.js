import React from 'react';
import { Box, Typography } from '@mui/material';

const Reports = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Reports & Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Analytics and reporting dashboard will be implemented here.
      </Typography>
    </Box>
  );
};

export default Reports;