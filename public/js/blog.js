document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');

  const handleRoute = async () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/article/')) {
      const slug = hash.replace('#/article/', '');
      await renderArticle(slug);
    } else {
      await renderHome();
    }
  };

  async function renderHome() {
    app.innerHTML = `
      <section class="hero">
        <h2>Bienvenue sur le Blog</h2>
        <p>Articles rédigés en Markdown et propulsés par Nostromo CMS.</p>
      </section>
      <div id="posts-container" class="posts-grid">
        <p style="text-align: center; color: var(--text-muted);">Chargement des articles...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Erreur réseau');
      const posts = await res.json();

      const container = document.getElementById('posts-container');
      if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Aucun article publié pour le moment.</p>';
        return;
      }

      container.innerHTML = posts.map(post => `
        <article class="post-card" onclick="location.hash='#/article/${post.slug}'">
          <h3>${escapeHtml(post.title)}</h3>
          <div class="post-meta">
            Publié le ${new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR')} 
            ${post.author_name ? `• par ${escapeHtml(post.author_name)}` : ''}
          </div>
          <p class="post-summary">${escapeHtml(post.summary || 'Lire l\'article complet...')}</p>
          <a href="#/article/${post.slug}" class="btn">Lire l'article →</a>
        </article>
      `).join('');
    } catch (err) {
      console.error(err);
      document.getElementById('posts-container').innerHTML = '<p style="text-align: center; color: #f87171;">Impossible de charger les articles.</p>';
    }
  }

  async function renderArticle(slug) {
    app.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Chargement de l'article...</p>`;

    try {
      const res = await fetch(`/api/posts/${slug}`);
      if (!res.ok) {
        app.innerHTML = `
          <div style="text-align: center;">
            <h2>Article introuvable</h2>
            <p>L'article demandée n'existe pas ou n'est plus publié.</p>
            <a href="#" class="btn">← Retour à l'accueil</a>
          </div>
        `;
        return;
      }

      const post = await res.json();
      const rawHtml = marked.parse(post.content);
      const cleanHtml = DOMPurify.sanitize(rawHtml);

      app.innerHTML = `
        <div class="article-container">
          <a href="#" style="color: var(--primary); text-decoration: none; display: inline-block; margin-bottom: 1.5rem;">← Retour aux articles</a>
          <h1>${escapeHtml(post.title)}</h1>
          <div class="post-meta">
            Publié le ${new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR')} 
            ${post.author_name ? `• par ${escapeHtml(post.author_name)}` : ''}
          </div>
          <hr>
          <div class="markdown-body">
            ${cleanHtml}
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
      app.innerHTML = '<p style="text-align: center; color: #f87171;">Erreur lors du chargement de l\'article.</p>';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('hashchange', handleRoute);
  await handleRoute();
});
