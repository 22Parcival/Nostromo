import { getDb } from '../config/database.js';
import { postService } from './post.service.js';

export const siteConfigService = {
  get(key) {
    const db = getDb();
    const row = db.prepare('SELECT key, value, updated_at FROM site_config WHERE key = ?').get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },

  getAll() {
    const db = getDb();
    const rows = db.prepare('SELECT key, value, updated_at FROM site_config').all();
    const result = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }

    // Récupérer le dernier article publié en bonus
    const latestPosts = postService.getAll({ publishedOnly: true, limit: 1 });
    result.latest_post = latestPosts.length > 0 ? latestPosts[0] : null;

    return result;
  },

  set(key, value) {
    const db = getDb();
    const strValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    const stmt = db.prepare(`
      INSERT INTO site_config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `);
    stmt.run(key, strValue);
  },

  setMany(configs) {
    for (const [key, value] of Object.entries(configs)) {
      this.set(key, value);
    }
    return this.getAll();
  }
};
