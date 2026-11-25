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

  getAll({ authorId = null, postId = null } = {}) {
    const db = getDb();
    const whereClauses = [];
    const params = [];

    if (postId) {
      whereClauses.push('comments.post_id = ?');
      params.push(postId);
    }
    if (authorId) {
      whereClauses.push('posts.author_id = ?');
      params.push(authorId);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        comments.id,
        comments.post_id,
        comments.author_name,
        comments.content,
        comments.created_at,
        posts.title as post_title,
        posts.slug as post_slug,
        posts.author_id as post_author_id
      FROM comments
      INNER JOIN posts ON comments.post_id = posts.id
      ${where}
      ORDER BY comments.created_at DESC
    `;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  delete(id, user = null) {
    const db = getDb();
    if (user && user.role !== 'admin') {
      const comment = db.prepare(`
        SELECT comments.id 
        FROM comments 
        INNER JOIN posts ON comments.post_id = posts.id 
        WHERE comments.id = ? AND posts.author_id = ?
      `).get(id, user.id);
      if (!comment) {
        return false;
      }
    }

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
