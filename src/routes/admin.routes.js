import { Router } from 'express';
import { postService } from '../services/post.service.js';

const router = Router();

/**
 * GET /api/admin/me
 * Renvoie les informations de l'administrateur connecté.
 */
router.get('/me', (req, res) => {
  res.json({ user: req.session.user });
});

/**
 * GET /api/admin/posts
 * Récupère tous les articles (brouillons et publiés).
 */
router.get('/posts', (req, res) => {
  try {
    const posts = postService.getAll({ publishedOnly: false });
    res.json(posts);
  } catch (error) {
    console.error('[ADMIN API ERROR] Get all posts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles.' });
  }
});

/**
 * GET /api/admin/posts/:id
 * Récupère un article par son ID (admin).
 */
router.get('/posts/:id', (req, res) => {
  try {
    const post = postService.getById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }
    res.json(post);
  } catch (error) {
    console.error('[ADMIN API ERROR] Get post by id:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.' });
  }
});

/**
 * POST /api/admin/posts
 * Crée un nouvel article.
 */
router.post('/posts', (req, res) => {
  try {
    const { title, slug, summary, content, status, cover_image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Le titre et le contenu sont obligatoires.' });
    }

    const newPost = postService.create({
      title,
      slug,
      summary,
      content,
      status: status === 'published' ? 'published' : 'draft',
      cover_image: cover_image || '',
      author_id: req.session.user.id,
      author_name: req.session.user.username
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error('[ADMIN API ERROR] Create post:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ce slug existe déjà. Veuillez en choisir un autre.' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'article.' });
  }
});

/**
 * PUT /api/admin/posts/:id
 * Met à jour un article existant.
 */
router.put('/posts/:id', (req, res) => {
  try {
    const { title, slug, summary, content, status, cover_image } = req.body;
    const updated = postService.update(req.params.id, {
      title,
      slug,
      summary,
      content,
      status,
      cover_image
    });

    if (!updated) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    res.json(updated);
  } catch (error) {
    console.error('[ADMIN API ERROR] Update post:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ce slug existe déjà. Veuillez en choisir un autre.' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article.' });
  }
});

/**
 * DELETE /api/admin/posts/:id
 * Supprime un article.
 */
router.delete('/posts/:id', (req, res) => {
  try {
    const success = postService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }
    res.json({ success: true, message: 'Article supprimé avec succès.' });
  } catch (error) {
    console.error('[ADMIN API ERROR] Delete post:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article.' });
  }
});

export default router;
