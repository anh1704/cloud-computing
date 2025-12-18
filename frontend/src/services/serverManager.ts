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
  private serverSwitchListeners: Array<() => void> = [];
  private requestLock = false;
  private switchingInProgress = false;
  private lastSwitchTime = 0;

  constructor() {
    this.initializePreferredServer();
    this.startHealthChecks();
  }

  // Subscribe to server switch events
  onServerSwitch(callback: () => void) {
    this.serverSwitchListeners.push(callback);
    return () => {
      this.serverSwitchListeners = this.serverSwitchListeners.filter(cb => cb !== callback);
    };
  }

  // Notify listeners when server switches
  private notifyServerSwitch() {
    this.serverSwitchListeners.forEach(callback => callback());
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
    // Debounce: Tránh switch quá nhanh (trong vòng 1 giây)
    const now = Date.now();
    if (now - this.lastSwitchTime < 1000) {
      console.log('[ServerManager] Switch too fast, debouncing...');
      return true; // Return true để không throw error
    }

    // Mutex: Chỉ cho phép 1 switch tại một thời điểm
    if (this.switchingInProgress) {
      console.log('[ServerManager] Switch already in progress, waiting...');
      return true;
    }

    this.switchingInProgress = true;
    this.lastSwitchTime = now;

    try {
      const healthyServers = this.getHealthyServers();
      if (healthyServers.length === 0) {
        console.error('[ServerManager] No healthy servers available');
        return false;
      }

      const currentServer = this.getCurrentServer();
      console.log(`[ServerManager] Current server before switch: ${currentServer.name} (${currentServer.url})`);

      // Tìm server khỏe mạnh tiếp theo
      const currentIndex = healthyServers.findIndex(s => s.id === currentServer.id);
      const nextIndex = (currentIndex + 1) % healthyServers.length;
      const nextServer = healthyServers[nextIndex];

      // Cập nhật currentServerIndex
      const oldIndex = this.currentServerIndex;
      this.currentServerIndex = this.servers.findIndex(s => s.id === nextServer.id);
      
      console.log(`[ServerManager] Switched from ${currentServer.name} (index ${oldIndex}) to ${nextServer.name} (index ${this.currentServerIndex}, url: ${nextServer.url})`);
      this.notifyServerSwitch(); // Notify listeners
      return true;
    } finally {
      this.switchingInProgress = false;
    }
  }

  // Thực hiện request với failover
  async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    let serversTriedCount = 0;
    const maxServersToTry = this.servers.length;
    
    while (serversTriedCount < maxServersToTry) {
      // Lấy server hiện tại MỖI LẦN để đảm bảo sync
      const currentServer = this.getCurrentServer();
      const serverUrl = currentServer.url;
      const serverName = currentServer.name;
      const serverIndex = this.currentServerIndex;
      
      if (!currentServer.isHealthy) {
        console.log(`[ServerManager] Current server ${serverName} is unhealthy, switching...`);
        if (!this.switchToNextServer()) {
          throw new Error('No healthy servers available');
        }
        serversTriedCount++;
        continue;
      }

      try {
        // Tạo URL với server HIỆN TẠI
        const url = `${serverUrl}${endpoint}`;
        console.log(`[ServerManager] Attempt ${serversTriedCount + 1}: Making request to ${serverName} (index ${serverIndex})`);
        console.log(`[ServerManager] Request URL: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // QUAN TRỌNG: Gọi fetch với URL đã lưu (không dùng currentServer.url)
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`[ServerManager] ✓ Success via ${serverName}`);
          return data;
        } else {
          // For client errors (4xx) we should NOT mark the server as unhealthy.
          // Try to parse a JSON body from the server to show a helpful message in the UI.
          const err = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status?: number; isClientError?: boolean; responseBody?: any };
          err.status = response.status;

          if (response.status >= 400 && response.status < 500) {
            err.isClientError = true;

            // attempt to parse JSON body, fallback to text or null
            try {
              const cloned = response.clone();
              const body = await cloned.json().catch(() => null);
              err.responseBody = body;
              // If body contains a message, prefer it as the error message
              if (body && (body.message || body.error)) {
                err.message = body.message || body.error;
              }
            } catch (e) {
              // ignore parse errors
            }
          } else {
            // for non-4xx we can also try to capture body for debugging
            try {
              const cloned = response.clone();
              err.responseBody = await cloned.json().catch(() => null);
            } catch {}
          }

          throw err;
        }
      } catch (error) {
        const errObj = error instanceof Error ? error : new Error('Unknown error');

        // If this is a client-side HTTP error (4xx), do not mark the server unhealthy or failover.
        if ((errObj as any).isClientError) {
          // Propagate the client error to the caller so it can handle validation/auth errors.
          throw errObj;
        }

        lastError = errObj;
        console.error(`[ServerManager] ✗ Request failed on ${serverName}:`, lastError.message);

        // Đánh dấu server hiện tại là unhealthy
        currentServer.isHealthy = false;

        // Chuyển sang server tiếp theo
        console.log(`[ServerManager] Switching to next server...`);
        if (!this.switchToNextServer()) {
          console.error(`[ServerManager] No more healthy servers to try`);
          break;
        }
        
        serversTriedCount++;
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
