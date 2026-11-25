import { Router } from 'express';
import { postService } from '../services/post.service.js';
import { commentService } from '../services/comment.service.js';

const router = Router();

function findPublishedPost(identifier) {
  let post = null;
  if (/^\d+$/.test(identifier)) {
    post = postService.getById(Number(identifier), true);
  }
  if (!post) {
    post = postService.getBySlug(identifier, true);
  }
  return post;
}

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
    const post = findPublishedPost(req.params.identifier);

    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    const commentCount = commentService.getCountByPostId(post.id);
    res.json({ ...post, comment_count: commentCount });
  } catch (error) {
    console.error('[API ERROR] Get post by identifier:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.' });
  }
});

router.get('/:identifier/comments', (req, res) => {
  try {
    const post = findPublishedPost(req.params.identifier);
    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    const comments = commentService.getByPostId(post.id);
    res.json(comments);
  } catch (error) {
    console.error('[API ERROR] Get comments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
  }
});

router.post('/:identifier/comments', (req, res) => {
  try {
    const post = findPublishedPost(req.params.identifier);
    if (!post) {
      return res.status(404).json({ error: 'Article non trouvé.' });
    }

    const { author_name, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
    }

    const newComment = commentService.create({
      postId: post.id,
      authorName: author_name,
      content: content.trim()
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error('[API ERROR] Post comment:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de l\'enregistrement du commentaire.' });
  }
});

export default router;
