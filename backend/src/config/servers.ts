// Cấu hình danh sách các server trong cluster
export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastHealthCheck: Date;
  priority: number; // 1 = highest priority (primary)
}

export const SERVER_CONFIGS: ServerConfig[] = [
  {
    id: 'server-a',
    name: 'Primary Server',
    url: process.env.SERVER_A_URL || 'https://backend-r978.onrender.com',
    isActive: true,
    lastHealthCheck: new Date(),
    priority: 1
  },
  {
    id: 'server-b', 
    name: 'Secondary Server',
    url: process.env.SERVER_B_URL || 'https://backend-b.onrender.com',
    isActive: true,
    lastHealthCheck: new Date(),
    priority: 2
  },
  {
    id: 'server-c',
    name: 'Tertiary Server', 
    url: process.env.SERVER_C_URL || 'https://backend-c.onrender.com',
    isActive: true,
    lastHealthCheck: new Date(),
    priority: 3
  }
];

// Lấy server hiện tại dựa trên SERVER_ID environment variable
export const CURRENT_SERVER_ID = process.env.SERVER_ID || 'server-a';
export const CURRENT_SERVER = SERVER_CONFIGS.find(s => s.id === CURRENT_SERVER_ID);

// Lấy danh sách các server khác (không bao gồm server hiện tại)
export const OTHER_SERVERS = SERVER_CONFIGS.filter(s => s.id !== CURRENT_SERVER_ID);
