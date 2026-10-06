import { initDatabase, closeDatabase } from './database.js';
import { postService, slugify, generateUniqueSlug } from '../services/post.service.js';
import { userService } from '../services/user.service.js';
import assert from 'assert';

console.log('--- Lancement des tests de la base de données & du système multi-auteurs ---');

const db = initDatabase(':memory:');
assert.ok(db, 'La base de données en mémoire doit être initialisée');
console.log('✔ Connexion SQLite établie en mémoire');

// 1. Test du service utilisateur
const adminUser = userService.upsert({
  id: 'admin_123',
  username: 'AliceAdmin',
  avatar: 'https://example.com/alice.png',
  role: 'admin'
});
assert.strictEqual(adminUser.id, 'admin_123');
assert.strictEqual(adminUser.role, 'admin');

const authorUser = userService.upsert({
  id: 'author_456',
  username: 'BobAuthor',
  avatar: 'https://example.com/bob.png',
  role: 'author'
});
assert.strictEqual(authorUser.id, 'author_456');
assert.strictEqual(authorUser.role, 'author');
console.log('✔ Gestion des utilisateurs (Admin & Auteur) validée');

// 2. Test slugify & slug unique
assert.strictEqual(slugify('Mon Premier Article !'), 'mon-premier-article');
assert.strictEqual(slugify('Élégant & Simple 123'), 'elegant-simple-123');
console.log('✔ Fonction slugify validée');

// 3. Création d'articles par plusieurs auteurs
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

// Deuxième article avec le même titre créé par Bob (test de collision de slug)
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

// 4. Test filtrage par auteur
const alicePosts = postService.getAll({ authorId: adminUser.id });
assert.strictEqual(alicePosts.length, 1);
assert.strictEqual(alicePosts[0].id, postAlice.id);

const bobPosts = postService.getAll({ authorId: authorUser.id });
assert.strictEqual(bobPosts.length, 1);
assert.strictEqual(bobPosts[0].id, postBobSameTitle.id);
console.log('✔ Filtrage par auteur validé');

// 5. Test récupération publique (seulement publiés)
const publicPosts = postService.getAll({ publishedOnly: true });
assert.strictEqual(publicPosts.length, 1);
assert.strictEqual(publicPosts[0].id, postAlice.id);
console.log('✔ Liste publique (publishedOnly) validée');

// 6. Test mise à jour et suppression
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

closeDatabase();
console.log('--- Tous les tests du système multi-auteurs ont réussi avec succès ! 🎉 ---');
