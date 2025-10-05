const db = require('./database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { username, email, password, full_name, role = 'user' } = userData;
    const password_hash = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, is_active, created_at
    `;
    
    const result = await db.query(query, [username, email, password_hash, full_name, role]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, username, email, full_name, avatar_url, role, is_active, 
             peer_id, is_online, last_seen, created_at, updated_at
      FROM users WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, username, email, password_hash, full_name, avatar_url, 
             role, is_active, peer_id, is_online, last_seen, created_at, updated_at
      FROM users WHERE email = $1
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = `
      SELECT id, username, email, password_hash, full_name, avatar_url, 
             role, is_active, peer_id, is_online, last_seen, created_at, updated_at
      FROM users WHERE username = $1
    `;
    
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  static async updatePeerId(userId, peerId) {
    const query = `
      UPDATE users SET peer_id = $1, is_online = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, peer_id, is_online
    `;
    
    const result = await db.query(query, [peerId, userId]);
    return result.rows[0];
  }

  static async updateOnlineStatus(userId, isOnline) {
    const query = `
      UPDATE users SET is_online = $1, 
             last_seen = CASE WHEN $1 = false THEN CURRENT_TIMESTAMP ELSE last_seen END,
             updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, is_online, last_seen
    `;
    
    const result = await db.query(query, [isOnline, userId]);
    return result.rows[0];
  }

  static async getOnlineUsers() {
    const query = `
      SELECT id, username, full_name, avatar_url, peer_id, last_seen
      FROM users 
      WHERE is_online = true AND peer_id IS NOT NULL
      ORDER BY username
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateProfile(userId, updates) {
    const allowedFields = ['full_name', 'avatar_url'];
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

    values.push(userId);
    const query = `
      UPDATE users SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, username, email, full_name, avatar_url, role, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;