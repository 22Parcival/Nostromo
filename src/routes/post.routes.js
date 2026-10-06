import { Router } from 'express';
import { postService } from '../services/post.service.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { author } = req.query;
    const posts = postService.getAll({
      publishedOnly: true,
      authorId: author || null
    });
    res.json(posts);
  } catch (error) {
    console.error('[API ERROR] Get posts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles.' });
  }
});

router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const post = postService.getBySlug(slug, true);

    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    res.json(post);
  } catch (error) {
    console.error('[API ERROR] Get post by slug:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.' });
  }
});

export default router;
