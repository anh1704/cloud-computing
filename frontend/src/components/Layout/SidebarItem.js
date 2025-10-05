import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import { motion } from 'framer-motion';

const SidebarItem = ({ item, isActive, onClick }) => {
  const { text, icon: Icon } = item;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <ListItem disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={onClick}
          sx={{
            borderRadius: 2,
            mx: 1,
            backgroundColor: isActive ? alpha('#1976d2', 0.1) : 'transparent',
            color: isActive ? 'primary.main' : 'text.primary',
            '&:hover': {
              backgroundColor: isActive
                ? alpha('#1976d2', 0.15)
                : alpha('#000000', 0.04),
            },
            '& .MuiListItemIcon-root': {
              color: isActive ? 'primary.main' : 'text.secondary',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={text}
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
            }}
          />
        </ListItemButton>
      </ListItem>
    </motion.div>
  );
};

export default SidebarItem;