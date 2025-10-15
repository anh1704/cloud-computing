// Quản lý danh sách server và failover
export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  isHealthy: boolean;
  lastCheck: Date;
  priority: number;
}

export interface HealthStatus {
  serverId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

class ServerManager {
  private servers: ServerConfig[] = [
    {
      id: 'server-a',
      name: 'Primary Server',
      url: import.meta.env.PROD ? 'https://backend-server-a.onrender.com' : 'http://localhost:4000',
      isHealthy: true,
      lastCheck: new Date(),
      priority: 1
    },
    {
      id: 'server-b',
      name: 'Secondary Server', 
      url: import.meta.env.PROD ? 'https://backend-server-b.onrender.com' : 'http://localhost:4001',
      isHealthy: true,
      lastCheck: new Date(),
      priority: 2
    },
    {
      id: 'server-c',
      name: 'Tertiary Server',
      url: import.meta.env.PROD ? 'https://backend-server-c.onrender.com' : 'http://localhost:4002', 
      isHealthy: true,
      lastCheck: new Date(),
      priority: 3
    }
  ];

  private currentServerIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePreferredServer();
    this.startHealthChecks();
  }

  // Khởi tạo server ưu tiên dựa trên URL parameter
  private initializePreferredServer() {
    const urlParams = new URLSearchParams(window.location.search);
    const preferredServer = urlParams.get('server');
    
    if (preferredServer) {
      const serverIndex = this.servers.findIndex(s => s.id === `server-${preferredServer}`);
      if (serverIndex !== -1) {
        this.currentServerIndex = serverIndex;
        console.log(`[ServerManager] Using preferred server: ${this.servers[serverIndex].name}`);
      } else {
        console.warn(`[ServerManager] Invalid server parameter: ${preferredServer}`);
      }
    }
  }

  // Bắt đầu kiểm tra sức khỏe định kỳ
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServers();
    }, 30000); // Check every 30 seconds

    // Kiểm tra ngay lập tức
    this.checkAllServers();
  }

  // Dừng kiểm tra sức khỏe
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Kiểm tra tất cả server
  private async checkAllServers() {
    const promises = this.servers.map(server => this.checkServerHealth(server));
    await Promise.allSettled(promises);
  }

  // Kiểm tra sức khỏe của một server
  private async checkServerHealth(server: ServerConfig) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${server.url}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Health-Check': 'true'
        }
      });
      
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      server.isHealthy = isHealthy;
      server.lastCheck = new Date();

      console.log(`[ServerManager] ${server.name}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
    } catch (error) {
      server.isHealthy = false;
      server.lastCheck = new Date();
      console.log(`[ServerManager] ${server.name}: UNHEALTHY - ${error}`);
    }
  }

  // Lấy server hiện tại
  getCurrentServer(): ServerConfig {
    return this.servers[this.currentServerIndex];
  }

  // Lấy danh sách server khỏe mạnh
  getHealthyServers(): ServerConfig[] {
    return this.servers.filter(server => server.isHealthy);
  }

  // Lấy server khỏe mạnh có priority cao nhất
  getPrimaryHealthyServer(): ServerConfig | undefined {
    const healthyServers = this.getHealthyServers();
    return healthyServers.sort((a, b) => a.priority - b.priority)[0];
  }

  // Chuyển sang server tiếp theo
  switchToNextServer(): boolean {
    const healthyServers = this.getHealthyServers();
    if (healthyServers.length === 0) {
      console.error('[ServerManager] No healthy servers available');
      return false;
    }

    // Tìm server khỏe mạnh tiếp theo
    const currentServer = this.getCurrentServer();
    const currentIndex = healthyServers.findIndex(s => s.id === currentServer.id);
    const nextIndex = (currentIndex + 1) % healthyServers.length;
    const nextServer = healthyServers[nextIndex];

    // Cập nhật currentServerIndex
    this.currentServerIndex = this.servers.findIndex(s => s.id === nextServer.id);
    
    console.log(`[ServerManager] Switched to ${nextServer.name}`);
    return true;
  }

  // Thực hiện request với failover
  async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const currentServer = this.getCurrentServer();
      
      if (!currentServer.isHealthy) {
        console.log(`[ServerManager] Current server ${currentServer.name} is unhealthy, switching...`);
        if (!this.switchToNextServer()) {
          throw new Error('No healthy servers available');
        }
        continue;
      }

      try {
        const url = `${currentServer.url}${endpoint}`;
        console.log(`[ServerManager] Making request to ${currentServer.name}: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[ServerManager] Request failed on ${currentServer.name}:`, lastError.message);
        
        // Đánh dấu server hiện tại là unhealthy
        currentServer.isHealthy = false;
        
        // Chuyển sang server tiếp theo
        if (!this.switchToNextServer()) {
          break;
        }
      }
    }

    throw lastError || new Error('All servers failed');
  }

  // Lấy thống kê server
  getServerStats() {
    const healthyCount = this.servers.filter(s => s.isHealthy).length;
    const totalCount = this.servers.length;
    
    return {
      total: totalCount,
      healthy: healthyCount,
      unhealthy: totalCount - healthyCount,
      healthPercentage: totalCount > 0 ? (healthyCount / totalCount) * 100 : 0,
      currentServer: this.getCurrentServer(),
      healthyServers: this.getHealthyServers()
    };
  }

  // Lấy tất cả server
  getAllServers(): ServerConfig[] {
    return [...this.servers];
  }
}

export const serverManager = new ServerManager();
