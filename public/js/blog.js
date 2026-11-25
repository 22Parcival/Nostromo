

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('modal-content');
  const modalTitle = document.getElementById('modal-window-title');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalShareBtn = document.getElementById('modal-share-btn');
  const searchInput = document.getElementById('post-search');

  let allPosts = [];
  let currentSearch = '';
  let activeTag = 'ALL';

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !modal.classList.contains('open')) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  modalShareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const orig = modalShareBtn.innerHTML;
      modalShareBtn.innerHTML = '<span style="color:var(--emerald);">copied!</span>';
      setTimeout(() => {
        modalShareBtn.innerHTML = orig;
      }, 2000);
    });
  });

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderBentoGrid();
  });

  async function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#/article/')) {
      const slug = hash.replace('#/article/', '');
      await openArticle(slug);
    } else {
      closeModal(false);
      if (allPosts.length === 0) {
        await loadPosts();
      } else {
        renderBentoGrid();
      }
    }
  }

  async function loadPosts() {
    renderSkeleton();
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Erreur de chargement');
      allPosts = await res.json();
      renderHomeLayout();
    } catch (err) {
      console.error(err);
      app.innerHTML = `
        <div class="error-state">
          <h3>[!] Échec du chargement des articles</h3>
          <p>Impossible de contacter l'API Nostromo. Vérifiez la connexion.</p>
        </div>
      `;
    }
  }

  function renderSkeleton() {
    app.innerHTML = `
      <div class="bento-hero">
        <h1 class="bento-hero-title">blog.<span class="accent">parcival</span>.fr</h1>
        <p class="bento-hero-desc">Chargement des données du système en cours...</p>
      </div>
      <div class="bento-grid">
        <div class="empty-state">Initialisation du flux de données...</div>
      </div>
    `;
  }

  function renderHomeLayout() {
    app.innerHTML = `
      <section class="bento-hero">
        <h1 class="bento-hero-title">blog.<span class="accent">parcival</span>.fr</h1>
        <p class="bento-hero-desc">
          Notes de développement, architecture logicielle, réflexions tech et cybersécurité. 
          Alimenté par le moteur léger <strong>Nostromo CMS</strong>.
        </p>
        <div class="filter-tags-bar" id="tag-filters">
          <button class="tag-pill active" data-tag="ALL">TOUS LES ARTICLES (${allPosts.length})</button>
          <button class="tag-pill" data-tag="RECENT">RÉCENTS</button>
        </div>
      </section>

      <section class="bento-grid" id="posts-grid-container">
        <!-- Cartes d'articles insérées dynamiquement -->
      </section>
    `;

    const filterButtons = document.querySelectorAll('.tag-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTag = btn.dataset.tag;
        renderBentoGrid();
      });
    });

    renderBentoGrid();
  }

  function renderBentoGrid() {
    const gridContainer = document.getElementById('posts-grid-container');
    if (!gridContainer) return;

    let filtered = allPosts;

    if (currentSearch) {
      filtered = filtered.filter(p => 
        (p.title && p.title.toLowerCase().includes(currentSearch)) ||
        (p.summary && p.summary.toLowerCase().includes(currentSearch)) ||
        (p.slug && p.slug.toLowerCase().includes(currentSearch))
      );
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <h3>Aucun article ne correspond à vos critères.</h3>
          <p>Essayez une autre recherche ou réinitialisez le filtre.</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map(post => {
      const date = new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const coverStyle = post.cover_image 
        ? `style="background-image: url('${escapeHtml(post.cover_image)}')"` 
        : '';

      const coverClass = post.cover_image ? 'card-cover' : '';

      return `
        <article class="os-card" data-slug="${escapeHtml(post.slug)}">
          <div class="os-titlebar">
            <div class="os-controls">
              <span class="os-circle os-close"></span>
              <span class="os-circle os-minimize"></span>
              <span class="os-circle os-maximize"></span>
            </div>
            <div class="os-title">${escapeHtml(post.slug)}.md</div>
            <span class="os-badge">published</span>
          </div>
          
          ${post.cover_image ? `<div class="${coverClass}" ${coverStyle}></div>` : ''}

          <div class="card-body">
            <h2 class="card-title">${escapeHtml(post.title)}</h2>
            <p class="card-summary">${escapeHtml(post.summary || 'Lire la suite de cette note technique...')}</p>
            
            <div class="card-footer">
              <div class="card-author">
                ${post.author_avatar ? `<img src="${escapeHtml(post.author_avatar)}" class="author-avatar-small" alt="">` : ''}
                <span>${escapeHtml(post.author_name || 'Parcival')} • ${date}</span>
              </div>
              <span class="read-more-link">view →</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    gridContainer.querySelectorAll('.os-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        window.location.hash = `#/article/${slug}`;
      });
    });
  }

  async function openArticle(slug) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalTitle.textContent = `${slug}.md`;
    modalContent.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-dim);">
        <p>Chargement du fichier source...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/posts/${slug}`);
      if (!res.ok) {
        modalContent.innerHTML = `
          <div class="error-state">
            <h2>[404] Article introuvable</h2>
            <p>Le document demandé n'existe pas ou a été dépublié.</p>
          </div>
        `;
        return;
      }

      const post = await res.json();
      modalTitle.textContent = `${post.slug || 'article'}.md`;

      const dateStr = new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const words = (post.content || '').trim().split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(words / 200));

      const rawHtml = marked.parse(post.content || '');
      const cleanHtml = DOMPurify.sanitize(rawHtml);

      modalContent.innerHTML = `
        <article class="article-reader">
          <header class="article-header">
            <div class="article-meta-bar">
              <span>Auteur: <strong style="color: #fff;">${escapeHtml(post.author_name || 'Parcival')}</strong></span>
              <span>•</span>
              <span>Date: ${dateStr}</span>
              <span>•</span>
              <span class="accent">⏱ ~${readTime} min de lecture</span>
            </div>
            <h1 class="article-headline">${escapeHtml(post.title)}</h1>
            ${post.summary ? `<p class="article-summary-lead">${escapeHtml(post.summary)}</p>` : ''}
          </header>

          ${post.cover_image ? `<img src="${escapeHtml(post.cover_image)}" alt="" class="article-modal-cover">` : ''}

          <div class="markdown-body">
            ${cleanHtml}
          </div>
        </article>
      `;

      modalContent.scrollTop = 0;
    } catch (err) {
      console.error(err);
      modalContent.innerHTML = `
        <div class="error-state">
          <p>Erreur inattendue lors de la récupération de l'article.</p>
        </div>
      `;
    }
  }

  function closeModal(updateHash = true) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (updateHash && window.location.hash.startsWith('#/article/')) {
      window.location.hash = '';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('hashchange', handleRouting);
  handleRouting();
});
