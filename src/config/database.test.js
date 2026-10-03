import { initDatabase, closeDatabase } from './database.js';
import { postService, slugify } from '../services/post.service.js';
import assert from 'assert';

console.log('--- Lancement des tests de la base de données & du service posts ---');

// 1. Initialisation d'une base en mémoire pour les tests
const db = initDatabase(':memory:');
assert.ok(db, 'La base de données en mémoire doit être initialisée');
console.log('✔ Connexion SQLite établie en mémoire');

// Test de slugify
assert.strictEqual(slugify('Mon Premier Article !'), 'mon-premier-article');
assert.strictEqual(slugify('Élégant & Simple 123'), 'elegant-simple-123');
console.log('✔ Fonction slugify validée');

// 2. Test de création (Create)
const newPost = postService.create({
  title: 'Mon Premier Article de Test',
  summary: 'Ceci est un résumé de test.',
  content: '# Hello World\nContenu Markdown de test.',
  status: 'draft',
  author_id: '123456789',
  author_name: 'AdminTest'
});

assert.ok(newPost.id, 'L\'article créé doit avoir un ID');
assert.strictEqual(newPost.title, 'Mon Premier Article de Test');
assert.strictEqual(newPost.slug, 'mon-premier-article-de-test');
assert.strictEqual(newPost.status, 'draft');
console.log('✔ Création d\'article (Draft) réussie');

// 3. Test de lecture (Read / Get)
const fetchedById = postService.getById(newPost.id);
assert.deepStrictEqual(fetchedById, newPost);

const fetchedBySlug = postService.getBySlug('mon-premier-article-de-test');
assert.strictEqual(fetchedBySlug.id, newPost.id);
console.log('✔ Lecture par ID et par Slug réussie');

// 4. Test de mise à jour (Update)
const updatedPost = postService.update(newPost.id, {
  title: 'Mon Super Article Mis à Jour',
  status: 'published'
});

assert.strictEqual(updatedPost.title, 'Mon Super Article Mis à Jour');
assert.strictEqual(updatedPost.status, 'published');
assert.ok(updatedPost.published_at, 'Un article publié doit avoir une date de publication');
console.log('✔ Mise à jour et publication réussies');

// Test getAll (publishedOnly)
const publishedList = postService.getAll({ publishedOnly: true });
assert.strictEqual(publishedList.length, 1);
assert.strictEqual(publishedList[0].id, newPost.id);
console.log('✔ Récupération filtrée (publishedOnly) réussie');

// 5. Test de suppression (Delete)
const deleted = postService.delete(newPost.id);
assert.strictEqual(deleted, true);

const afterDelete = postService.getById(newPost.id);
assert.strictEqual(afterDelete, undefined);
console.log('✔ Suppression d\'article réussie');

closeDatabase();
console.log('--- Tous les tests de la base de données ont réussi avec succès ! ---');
