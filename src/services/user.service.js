import { getDb } from '../config/database.js';

export const userService = {
  upsert({ id, username, avatar = null, role = null }) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (existing) {
      const finalRole = role !== null && role !== undefined ? role : existing.role;
      const stmt = db.prepare(`
        UPDATE users
        SET username = ?, avatar = ?, role = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(username, avatar || '', finalRole, id);
      return this.getById(id);
    }

    const stmt = db.prepare(`
      INSERT INTO users (id, username, avatar, role)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, username, avatar || '', role || 'author');

    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT id, username, avatar, role, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
  },

  getAll() {
    const db = getDb();
    const stmt = db.prepare('SELECT id, username, avatar, role, created_at FROM users ORDER BY created_at ASC');
    return stmt.all();
  }
};
