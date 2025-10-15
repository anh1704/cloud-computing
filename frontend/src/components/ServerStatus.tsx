import React, { useState, useEffect } from 'react';
import { serverManager, ServerConfig } from '../services/serverManager';

interface ServerStatusProps {
  className?: string;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({ className = '' }) => {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [currentServer, setCurrentServer] = useState<ServerConfig | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    unhealthy: 0,
    healthPercentage: 0
  });

  useEffect(() => {
    const updateStatus = () => {
      setServers(serverManager.getAllServers());
      setCurrentServer(serverManager.getCurrentServer());
      setStats(serverManager.getServerStats());
    };

    // Cập nhật ngay lập tức
    updateStatus();

    // Cập nhật mỗi 5 giây
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? '🟢' : '🔴';
  };

  const getHealthBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Server Status</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Health:</span>
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getHealthBarColor(stats.healthPercentage)}`}
              style={{ width: `${stats.healthPercentage}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(stats.healthPercentage)}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {servers.map((server) => (
          <div 
            key={server.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              server.id === currentServer?.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getStatusIcon(server.isHealthy)}</span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-800">{server.name}</span>
                  {server.id === currentServer?.id && (
                    <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{server.url}</p>
                <p className="text-xs text-gray-500">
                  Last check: {server.lastCheck.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${getStatusColor(server.isHealthy)}`}>
                {server.isHealthy ? 'Healthy' : 'Unhealthy'}
              </span>
              <p className="text-xs text-gray-500">Priority: {server.priority}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
            <p className="text-sm text-gray-600">Healthy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.unhealthy}</p>
            <p className="text-sm text-gray-600">Unhealthy</p>
          </div>
        </div>
      </div>

      {stats.unhealthy > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-sm text-yellow-800">
              {stats.unhealthy} server(s) are unhealthy. The system will automatically failover to healthy servers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
