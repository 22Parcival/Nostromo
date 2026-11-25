import { getDb } from '../config/database.js';

export const commentService = {
  getByPostId(postId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, post_id, author_name, content, created_at
      FROM comments
      WHERE post_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(postId);
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT id, post_id, author_name, content, created_at FROM comments WHERE id = ?');
    return stmt.get(id);
  },

  create({ postId, authorName, content }) {
    const db = getDb();
    const cleanAuthor = String(authorName || '').trim().slice(0, 50) || 'Anonyme';
    const cleanContent = String(content || '').trim().slice(0, 1000);

    if (!cleanContent) {
      throw new Error('Le contenu du commentaire ne peut pas être vide.');
    }

    const stmt = db.prepare(`
      INSERT INTO comments (post_id, author_name, content)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(postId, cleanAuthor, cleanContent);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  getCountByPostId(postId) {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?');
    const row = stmt.get(postId);
    return row ? row.count : 0;
  }
};
