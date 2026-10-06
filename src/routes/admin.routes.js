import { Router } from 'express';
import { postService } from '../services/post.service.js';
import { userService } from '../services/user.service.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/me', (req, res) => {
  res.json({ user: req.session.user });
});

router.get('/posts', (req, res) => {
  try {
    const user = req.session.user;
    const { filter } = req.query;

    let posts;
    if (user.role === 'admin' && filter === 'all') {
      posts = postService.getAll({ publishedOnly: false });
    } else {
      posts = postService.getAll({ authorId: user.id, publishedOnly: false });
    }

    res.json(posts);
  } catch (error) {
    console.error('[ADMIN API ERROR] Get posts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles.' });
  }
});

router.get('/posts/:id', (req, res) => {
  try {
    const user = req.session.user;
    const post = postService.getById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    if (user.role !== 'admin' && post.author_id !== user.id) {
      return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas l\'auteur de cet article.' });
    }

    res.json(post);
  } catch (error) {
    console.error('[ADMIN API ERROR] Get post by id:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.' });
  }
});

router.post('/posts', (req, res) => {
  try {
    const user = req.session.user;
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
      author_id: user.id,
      author_name: user.username,
      author_avatar: user.avatar || ''
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error('[ADMIN API ERROR] Create post:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'article.' });
  }
});

router.put('/posts/:id', (req, res) => {
  try {
    const user = req.session.user;
    const existing = postService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    if (user.role !== 'admin' && existing.author_id !== user.id) {
      return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas autorisé à modifier cet article.' });
    }

    const { title, slug, summary, content, status, cover_image } = req.body;
    const updated = postService.update(req.params.id, {
      title,
      slug,
      summary,
      content,
      status,
      cover_image
    });

    res.json(updated);
  } catch (error) {
    console.error('[ADMIN API ERROR] Update post:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article.' });
  }
});

router.delete('/posts/:id', (req, res) => {
  try {
    const user = req.session.user;
    const existing = postService.getById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    if (user.role !== 'admin' && existing.author_id !== user.id) {
      return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas autorisé à supprimer cet article.' });
    }

    const success = postService.delete(req.params.id);
    if (!success) {
      return res.status(500).json({ error: 'Échec de la suppression.' });
    }

    res.json({ success: true, message: 'Article supprimé avec succès.' });
  } catch (error) {
    console.error('[ADMIN API ERROR] Delete post:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article.' });
  }
});

router.post('/upload', (req, res) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('[ADMIN UPLOAD ERROR]:', err);
      return res.status(400).json({ error: err.message || 'Erreur lors du téléversement de l\'image.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  });
});

export default router;
