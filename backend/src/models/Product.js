const db = require('./database');

class Product {
  static async create(productData) {
    const { 
      name, description, price, category_id, stock_quantity = 0, 
      min_stock_level = 0, image_url, created_by 
    } = productData;
    
    const query = `
      INSERT INTO products (name, description, price, category_id, quantity, 
                           min_stock_level, image_url, created_by, last_updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *, quantity as stock_quantity
    `;
    
    const result = await db.query(query, [
      name, description, price, category_id, stock_quantity, 
      min_stock_level, image_url, created_by
    ]);
    
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, p.quantity as stock_quantity, c.name as category_name, c.color as category_color,
             u1.username as created_by_username,
             u2.username as last_updated_by_username
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_updated_by = u2.id
      WHERE p.status = 'active'
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.category_id) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.low_stock) {
      query += ` AND p.quantity <= p.min_stock_level`;
    }

    query += ` ORDER BY p.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT p.*, p.quantity as stock_quantity, c.name as category_name, c.color as category_color,
             u1.username as created_by_username,
             u2.username as last_updated_by_username
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.last_updated_by = u2.id
      WHERE p.id = $1 AND p.status = 'active'
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, productData, userId) {
    const { name, description, price, category_id, stock_quantity, status, image_url } = productData;
    
    const query = `
      UPDATE products SET 
        name = $1, description = $2, price = $3, category_id = $4, 
        quantity = $5, status = $6, image_url = $7, last_updated_by = $8,
        version = version + 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND status != 'deleted'
      RETURNING *, quantity as stock_quantity
    `;
    
    const values = [name, description, price, category_id, stock_quantity, status, image_url, userId, id];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const query = `
      UPDATE products SET status = 'deleted', last_updated_by = $1, 
             version = version + 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'active'
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, id]);
    return result.rows[0];
  }

  static async updateStock(id, quantity, userId) {
    const query = `
      UPDATE products SET quantity = $1, last_updated_by = $2, 
             version = version + 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'active'
      RETURNING *
    `;
    
    const result = await db.query(query, [quantity, userId, id]);
    return result.rows[0];
  }

  static async getLowStockProducts() {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.quantity <= p.min_stock_level AND p.status = 'active'
      ORDER BY (p.quantity::float / GREATEST(p.min_stock_level, 1)) ASC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async getProductStats() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE quantity <= min_stock_level) as low_stock_count,
        SUM(quantity * price) as total_inventory_value,
        AVG(price) as average_price
      FROM products 
      WHERE status = 'active'
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }

  static async getPendingSyncProducts() {
    const query = `
      SELECT * FROM products 
      WHERE sync_status = 'pending' AND status = 'active'
      ORDER BY updated_at ASC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async markAsSynced(id) {
    const query = `
      UPDATE products SET sync_status = 'synced', last_sync = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async bulkSync(products, userId) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const product of products) {
        const { id, ...updates } = product;
        
        if (id) {
          // Update existing product
          const allowedFields = ['name', 'description', 'price', 'sku', 'category_id', 'quantity', 'min_stock_level', 'image_url'];
          const setClause = [];
          const values = [];
          let paramCount = 1;

          for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
              setClause.push(`${key} = $${paramCount}`);
              values.push(value);
              paramCount++;
            }
          }

          if (setClause.length > 0) {
            setClause.push(`last_updated_by = $${paramCount}`);
            values.push(userId);
            paramCount++;
            
            setClause.push(`sync_status = 'synced'`);
            setClause.push(`last_sync = CURRENT_TIMESTAMP`);
            
            values.push(id);
            const updateQuery = `
              UPDATE products SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
              WHERE id = $${paramCount}
              RETURNING *
            `;
            
            const result = await client.query(updateQuery, values);
            if (result.rows[0]) {
              results.push(result.rows[0]);
            }
          }
        } else {
          // Create new product
          const insertQuery = `
            INSERT INTO products (name, description, price, sku, category_id, quantity, 
                                 min_stock_level, image_url, created_by, last_updated_by, sync_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 'synced')
            RETURNING *
          `;
          
          const result = await client.query(insertQuery, [
            updates.name, updates.description, updates.price, updates.sku, 
            updates.category_id, updates.quantity || 0, updates.min_stock_level || 0, 
            updates.image_url, userId
          ]);
          
          results.push(result.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Product;