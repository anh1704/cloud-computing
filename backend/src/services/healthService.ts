import { SERVER_CONFIGS, OTHER_SERVERS } from '../config/servers';

export interface HealthStatus {
  serverId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

class HealthService {
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeHealthStatuses();
  }

  // Khởi tạo trạng thái sức khỏe cho tất cả server
  private initializeHealthStatuses() {
    SERVER_CONFIGS.forEach(server => {
      this.healthStatuses.set(server.id, {
        serverId: server.id,
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: 0
      });
    });
  }

  // Bắt đầu kiểm tra sức khỏe định kỳ
  startHealthChecks(intervalMs: number = 30000) {
    console.log(`[HEALTH] Starting health checks every ${intervalMs}ms`);
    
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServers();
    }, intervalMs);

    // Kiểm tra ngay lập tức
    this.checkAllServers();
  }

  // Dừng kiểm tra sức khỏe
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[HEALTH] Stopped health checks');
    }
  }

  // Kiểm tra tất cả server
  private async checkAllServers() {
    const promises = OTHER_SERVERS.map(server => this.checkServerHealth(server.id, server.url));
    await Promise.allSettled(promises);
  }

  // Kiểm tra sức khỏe của một server
  private async checkServerHealth(serverId: string, serverUrl: string) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Health-Check': 'true'
        }
      });
      
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      this.healthStatuses.set(serverId, {
        serverId,
        isHealthy,
        lastCheck: new Date(),
        responseTime,
        error: isHealthy ? undefined : `HTTP ${response.status}`
      });

      console.log(`[HEALTH] ${serverId}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.healthStatuses.set(serverId, {
        serverId,
        isHealthy: false,
        lastCheck: new Date(),
        responseTime,
        error: errorMessage
      });

      console.log(`[HEALTH] ${serverId}: UNHEALTHY (${responseTime}ms) - ${errorMessage}`);
    }
  }

  // Lấy trạng thái sức khỏe của tất cả server
  getAllHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  // Lấy trạng thái sức khỏe của một server
  getServerHealth(serverId: string): HealthStatus | undefined {
    return this.healthStatuses.get(serverId);
  }

  // Lấy danh sách server khỏe mạnh
  getHealthyServers(): HealthStatus[] {
    return this.getAllHealthStatuses().filter(status => status.isHealthy);
  }

  // Lấy server khỏe mạnh có priority cao nhất
  getPrimaryHealthyServer(): HealthStatus | undefined {
    const healthyServers = this.getHealthyServers();
    return healthyServers.sort((a, b) => {
      const serverA = SERVER_CONFIGS.find(s => s.id === a.serverId);
      const serverB = SERVER_CONFIGS.find(s => s.id === b.serverId);
      return (serverA?.priority || 999) - (serverB?.priority || 999);
    })[0];
  }

  // Kiểm tra xem có server nào khỏe mạnh không
  hasHealthyServers(): boolean {
    return this.getHealthyServers().length > 0;
  }

  // Lấy thống kê sức khỏe
  getHealthStats() {
    const allStatuses = this.getAllHealthStatuses();
    const healthyCount = allStatuses.filter(s => s.isHealthy).length;
    const totalCount = allStatuses.length;
    
    return {
      total: totalCount,
      healthy: healthyCount,
      unhealthy: totalCount - healthyCount,
      healthPercentage: totalCount > 0 ? (healthyCount / totalCount) * 100 : 0
    };
  }
}

export const healthService = new HealthService();
