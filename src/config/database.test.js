import { initDatabase, closeDatabase } from './database.js';
import { postService, slugify, generateUniqueSlug } from '../services/post.service.js';
import { userService } from '../services/user.service.js';
import { commentService } from '../services/comment.service.js';
import assert from 'assert';

console.log('--- Lancement des tests de la base de données & du système multi-auteurs ---');

const db = initDatabase(':memory:');
assert.ok(db, 'La base de données en mémoire doit être initialisée');
console.log('✔ Connexion SQLite établie en mémoire');

const adminUser = userService.upsert({
  id: 'admin_123',
  username: 'AliceAdmin',
  avatar: 'https://example.com/avatar.png',

  role: 'admin'
});
assert.strictEqual(adminUser.id, 'admin_123');
assert.strictEqual(adminUser.role, 'admin');

const authorUser = userService.upsert({
  id: 'author_456',
  username: 'BobAuthor',
  avatar: 'https://example.com/avatar.png',

  role: 'author'
});
assert.strictEqual(authorUser.id, 'author_456');
assert.strictEqual(authorUser.role, 'author');
console.log('✔ Gestion des utilisateurs (Admin & Auteur) validée');

assert.strictEqual(slugify('Mon Premier Article !'), 'mon-premier-article');
assert.strictEqual(slugify('Élégant & Simple 123'), 'elegant-simple-123');
console.log('✔ Fonction slugify validée');

const postAlice = postService.create({
  title: 'Guide complet Node.js',
  summary: 'Tout sur Node.js.',
  content: '# Guide Node.js',
  status: 'published',
  author_id: adminUser.id,
  author_name: adminUser.username,
  author_avatar: adminUser.avatar
});
assert.strictEqual(postAlice.author_id, 'admin_123');
assert.strictEqual(postAlice.slug, 'guide-complet-nodejs');
assert.strictEqual(postAlice.status, 'published');

const postBobSameTitle = postService.create({
  title: 'Guide complet Node.js',
  summary: 'Une autre version du guide.',
  content: '# Guide Node.js par Bob',
  status: 'draft',
  author_id: authorUser.id,
  author_name: authorUser.username,
  author_avatar: authorUser.avatar
});
assert.strictEqual(postBobSameTitle.slug, 'guide-complet-nodejs-2');
console.log('✔ Gestion automatique des collisions de slug validée');

const alicePosts = postService.getAll({ authorId: adminUser.id });
assert.strictEqual(alicePosts.length, 1);
assert.strictEqual(alicePosts[0].id, postAlice.id);

const bobPosts = postService.getAll({ authorId: authorUser.id });
assert.strictEqual(bobPosts.length, 1);
assert.strictEqual(bobPosts[0].id, postBobSameTitle.id);
console.log('✔ Filtrage par auteur validé');

// 5. Test récupération publique (seulement publiés) et inclusion du contenu
const publicPosts = postService.getAll({ publishedOnly: true });
assert.strictEqual(publicPosts.length, 1);
assert.strictEqual(publicPosts[0].id, postAlice.id);
assert.strictEqual(publicPosts[0].content, undefined);

const adminPostsWithContent = postService.getAll({ authorId: authorUser.id, includeContent: true });
assert.strictEqual(adminPostsWithContent.length, 1);
assert.strictEqual(adminPostsWithContent[0].content, '# Guide Node.js par Bob');
console.log('✔ Liste avec/sans content (includeContent) validée');

const updatedBob = postService.update(postBobSameTitle.id, {
  title: 'Guide Node.js par Bob (Mis à jour)',
  status: 'published'
});
assert.strictEqual(updatedBob.title, 'Guide Node.js par Bob (Mis à jour)');
assert.strictEqual(updatedBob.status, 'published');
assert.ok(updatedBob.published_at);

const deleted = postService.delete(postBobSameTitle.id);
assert.strictEqual(deleted, true);
assert.strictEqual(postService.getById(postBobSameTitle.id), undefined);
console.log('✔ Mise à jour et suppression d\'article validées');

// 7. Test du système de commentaires des lecteurs
const comment1 = commentService.create({
  postId: postAlice.id,
  authorName: 'LecteurCurieux',
  content: 'Super article sur Node.js, très clair !'
});
assert.strictEqual(comment1.author_name, 'LecteurCurieux');
assert.strictEqual(comment1.content, 'Super article sur Node.js, très clair !');
assert.strictEqual(comment1.post_id, postAlice.id);

const comment2 = commentService.create({
  postId: postAlice.id,
  authorName: '',
  content: 'Deuxième commentaire anonyme.'
});
assert.strictEqual(comment2.author_name, 'Anonyme');

const aliceComments = commentService.getByPostId(postAlice.id);
assert.strictEqual(aliceComments.length, 2);
assert.strictEqual(commentService.getCountByPostId(postAlice.id), 2);

// Vérifier que getById et getAll retournent le bon comment_count
const postWithCount = postService.getById(postAlice.id);
assert.strictEqual(postWithCount.comment_count, 2);

const deletedComment = commentService.delete(comment2.id);
assert.strictEqual(deletedComment, true);
assert.strictEqual(commentService.getCountByPostId(postAlice.id), 1);
console.log('✔ Système de commentaires des lecteurs validé');

closeDatabase();
console.log('--- Tous les tests du système multi-auteurs ont réussi avec succès ! 🎉 ---');
