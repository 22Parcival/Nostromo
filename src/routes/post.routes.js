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

router.get('/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    let post = null;

    // Si l'identifiant est un nombre entier, tester par ID d'abord
    if (/^\d+$/.test(identifier)) {
      post = postService.getById(Number(identifier), true);
    }

    // Si non trouvé ou si l'identifiant est une chaîne (slug), chercher par slug
    if (!post) {
      post = postService.getBySlug(identifier, true);
    }

    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    res.json(post);
  } catch (error) {
    console.error('[API ERROR] Get post by identifier:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.' });
  }
});

export default router;
