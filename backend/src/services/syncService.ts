import { OTHER_SERVERS } from '../config/servers';

export interface SyncEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: Date;
  serverId: string;
}

class SyncService {
  private syncQueue: SyncEvent[] = [];
  private isProcessing = false;

  // Thêm event vào queue để đồng bộ
  async addSyncEvent(type: SyncEvent['type'], table: string, data: any) {
    const event: SyncEvent = {
      type,
      table,
      data,
      timestamp: new Date(),
      serverId: process.env.SERVER_ID || 'server-a'
    };

    this.syncQueue.push(event);
    console.log(`[SYNC] Added event: ${type} on ${table}`, event);
    
    // Xử lý ngay lập tức
    this.processSyncQueue();
  }

  // Xử lý queue đồng bộ
  private async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[SYNC] Processing ${this.syncQueue.length} events`);

    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift();
      if (event) {
        await this.broadcastEvent(event);
      }
    }

    this.isProcessing = false;
  }

  // Gửi event đến tất cả server khác
  private async broadcastEvent(event: SyncEvent) {
    const promises = OTHER_SERVERS.map(server => 
      this.sendEventToServer(server.url, event)
    );

    try {
      await Promise.allSettled(promises);
      console.log(`[SYNC] Event broadcasted to ${OTHER_SERVERS.length} servers`);
    } catch (error) {
      console.error('[SYNC] Error broadcasting event:', error);
    }
  }

  // Gửi event đến một server cụ thể
  private async sendEventToServer(serverUrl: string, event: SyncEvent) {
    try {
      const response = await fetch(`${serverUrl}/api/sync/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-ID': process.env.SERVER_ID || 'server-a'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Server ${serverUrl} responded with ${response.status}`);
      }

      console.log(`[SYNC] Successfully sent event to ${serverUrl}`);
    } catch (error) {
      console.error(`[SYNC] Failed to send event to ${serverUrl}:`, error);
    }
  }

  // Nhận event từ server khác
  async receiveEvent(event: SyncEvent) {
    console.log(`[SYNC] Received event from ${event.serverId}:`, event);
    
    // Chỉ xử lý nếu event không phải từ server hiện tại
    if (event.serverId === (process.env.SERVER_ID || 'server-a')) {
      console.log('[SYNC] Ignoring event from self');
      return;
    }

    // Xử lý event dựa trên loại
    switch (event.type) {
      case 'CREATE':
        await this.handleCreateEvent(event);
        break;
      case 'UPDATE':
        await this.handleUpdateEvent(event);
        break;
      case 'DELETE':
        await this.handleDeleteEvent(event);
        break;
    }
  }

  // Xử lý event CREATE
  private async handleCreateEvent(event: SyncEvent) {
    const { pool } = await import('../db');
    
    try {
      if (event.table === 'products') {
        const { name, description, price, category, stock, image_url } = event.data;
        await pool.query(
          `INSERT INTO products (name, description, price, category, stock, image_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [name, description, price, category, stock, image_url, event.timestamp]
        );
        console.log(`[SYNC] Created product: ${name}`);
      }
    } catch (error) {
      console.error('[SYNC] Error handling CREATE event:', error);
    }
  }

  // Xử lý event UPDATE
  private async handleUpdateEvent(event: SyncEvent) {
    const { pool } = await import('../db');
    
    try {
      if (event.table === 'products') {
        const { id, name, description, price, category, stock, image_url } = event.data;
        await pool.query(
          `UPDATE products 
           SET name=$1, description=$2, price=$3, category=$4, stock=$5, image_url=$6
           WHERE id=$7`,
          [name, description, price, category, stock, image_url, id]
        );
        console.log(`[SYNC] Updated product: ${id}`);
      }
    } catch (error) {
      console.error('[SYNC] Error handling UPDATE event:', error);
    }
  }

  // Xử lý event DELETE
  private async handleDeleteEvent(event: SyncEvent) {
    const { pool } = await import('../db');
    
    try {
      if (event.table === 'products') {
        const { id } = event.data;
        await pool.query('DELETE FROM products WHERE id=$1', [id]);
        console.log(`[SYNC] Deleted product: ${id}`);
      }
    } catch (error) {
      console.error('[SYNC] Error handling DELETE event:', error);
    }
  }
}

export const syncService = new SyncService();
