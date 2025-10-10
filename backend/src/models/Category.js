const db = require('./database');

class Category {
  static async create(categoryData) {
    const { name, description, color = '#007bff', icon = 'folder', created_by } = categoryData;
    
    const query = `
      INSERT INTO categories (name, description, color, icon, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [name, description, color, icon, created_by]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT c.*, u.username as created_by_username,
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      GROUP BY c.id, u.username
      ORDER BY c.name
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT c.*, u.username as created_by_username,
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      WHERE c.id = $1
      GROUP BY c.id, u.username
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedFields = ['name', 'description', 'color', 'icon'];
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

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE categories SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    // Check if category has products
    const checkQuery = `
      SELECT COUNT(*) as product_count
      FROM products
      WHERE category_id = $1 AND status = 'active'
    `;
    
    const checkResult = await db.query(checkQuery, [id]);
    const productCount = parseInt(checkResult.rows[0].product_count);
    
    if (productCount > 0) {
      throw new Error(`Cannot delete category. It contains ${productCount} product(s).`);
    }

    const query = `
      DELETE FROM categories WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getCategoryStats() {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COUNT(p.id) as product_count,
        SUM(p.quantity) as total_quantity,
        SUM(p.quantity * p.price) as total_value,
        AVG(p.price) as average_price
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY product_count DESC, c.name
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async getPopularCategories(limit = 5) {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      GROUP BY c.id, c.name, c.color, c.icon
      HAVING COUNT(p.id) > 0
      ORDER BY product_count DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  // Lấy tất cả categories để sync
  static async getAll() {
    const query = `
      SELECT * FROM categories 
      ORDER BY id ASC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  // Xóa tất cả categories (dùng cho bulk sync)
  static async deleteAll() {
    const query = `DELETE FROM categories`;
    const result = await db.query(query);
    return result.rowCount;
  }
}

module.exports = Category;