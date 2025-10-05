import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

const Categories = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Categories
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          Add Category
        </Button>
      </Box>
      
      <Typography variant="body1" color="text.secondary">
        Category management interface will be implemented here.
      </Typography>
    </Box>
  );
};

export default Categories;