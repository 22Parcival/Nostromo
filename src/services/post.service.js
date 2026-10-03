import { getDb } from '../config/database.js';

export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const postService = {
  create({
    title,
    slug,
    summary = '',
    content,
    status = 'draft',
    cover_image = '',
    author_id = '',
    author_name = ''
  }) {
    const db = getDb();
    const finalSlug = slugify(slug && slug.trim() !== '' ? slug : title);
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const stmt = db.prepare(`
      INSERT INTO posts (
        title, slug, summary, content, status, cover_image, author_id, author_name, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      finalSlug,
      summary,
      content,
      status,
      cover_image,
      author_id,
      author_name,
      publishedAt
    );

    return this.getById(result.lastInsertRowid);
  },

  getById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
    return stmt.get(id);
  },

  getBySlug(slug, publishedOnly = false) {
    const db = getDb();
    const query = publishedOnly
      ? 'SELECT * FROM posts WHERE slug = ? AND status = "published"'
      : 'SELECT * FROM posts WHERE slug = ?';
    const stmt = db.prepare(query);
    return stmt.get(slug);
  },

  getAll({ publishedOnly = false, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    const query = publishedOnly
      ? `SELECT id, title, slug, summary, status, cover_image, author_name, created_at, published_at
         FROM posts
         WHERE status = 'published'
         ORDER BY published_at DESC, created_at DESC
         LIMIT ? OFFSET ?`
      : `SELECT id, title, slug, summary, status, cover_image, author_name, created_at, updated_at, published_at
         FROM posts
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    return stmt.all(limit, offset);
  },

  update(id, fields = {}) {
    const db = getDb();
    const existing = this.getById(id);
    if (!existing) {
      return null;
    }

    const updates = [];
    const values = [];

    if (fields.title !== undefined) {
      updates.push('title = ?');
      values.push(fields.title);
    }
    if (fields.slug !== undefined) {
      updates.push('slug = ?');
      values.push(slugify(fields.slug));
    }
    if (fields.summary !== undefined) {
      updates.push('summary = ?');
      values.push(fields.summary);
    }
    if (fields.content !== undefined) {
      updates.push('content = ?');
      values.push(fields.content);
    }
    if (fields.status !== undefined) {
      updates.push('status = ?');
      values.push(fields.status);

      if (fields.status === 'published' && !existing.published_at) {
        updates.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (fields.cover_image !== undefined) {
      updates.push('cover_image = ?');
      values.push(fields.cover_image);
    }

    updates.push("updated_at = datetime('now')");

    if (updates.length === 1) {
      return existing;
    }

    values.push(id);
    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...values);

    return this.getById(id);
  },

  delete(id) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
