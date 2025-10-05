import React from 'react';
import { Box, Typography } from '@mui/material';

const ProductDetail = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Product Detail
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Detailed product view will be implemented here.
      </Typography>
    </Box>
  );
};

export default ProductDetail;