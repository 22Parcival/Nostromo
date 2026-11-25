

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
              <div class="card-footer-meta">
                ${post.comment_count > 0 ? `<span class="card-comments-badge" title="${post.comment_count} commentaire${post.comment_count > 1 ? 's' : ''}">💬 ${post.comment_count}</span>` : ''}
                <span class="read-more-link">view →</span>
              </div>
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
              <span>•</span>
              <a href="#comments-section" class="article-comments-link" style="color: var(--emerald); text-decoration: none;">💬 <span id="meta-comment-count">${post.comment_count || 0}</span> commentaire${(post.comment_count || 0) > 1 ? 's' : ''}</a>
            </div>
            <h1 class="article-headline">${escapeHtml(post.title)}</h1>
            ${post.summary ? `<p class="article-summary-lead">${escapeHtml(post.summary)}</p>` : ''}
          </header>

          ${post.cover_image ? `<img src="${escapeHtml(post.cover_image)}" alt="" class="article-modal-cover">` : ''}

          <div class="markdown-body">
            ${cleanHtml}
          </div>

          <section class="comments-section" id="comments-section">
            <div class="comments-header">
              <div class="comments-title-wrap">
                <span class="comments-icon">💬</span>
                <h3 class="comments-title">Commentaires (<span id="comments-count">${post.comment_count || 0}</span>)</h3>
              </div>
              <span class="comments-hint">Discussions & retours de lecture</span>
            </div>

            <form id="comment-form" class="comment-form">
              <div class="comment-field">
                <label for="comment-author" class="comment-label">Votre pseudo ou nom</label>
                <input type="text" id="comment-author" class="comment-input" placeholder="Parcival, Alex, CyberDev..." maxlength="50" autocomplete="nickname">
              </div>
              <div class="comment-field">
                <label for="comment-body" class="comment-label">Votre message</label>
                <textarea id="comment-body" class="comment-textarea" placeholder="Partagez votre avis, une question ou une remarque sur cet article..." rows="3" maxlength="1000" required></textarea>
              </div>
              <div class="comment-form-actions">
                <span class="comment-counter"><span id="comment-char-count">0</span> / 1000</span>
                <button type="submit" id="comment-submit-btn" class="comment-submit-btn">
                  <span>Publier</span>
                  <span class="btn-arrow">→</span>
                </button>
              </div>
              <div id="comment-feedback" class="comment-feedback" style="display: none;"></div>
            </form>

            <div class="comments-list-wrapper">
              <div id="comments-list" class="comments-list">
                <div class="comments-loading">Chargement des commentaires...</div>
              </div>
            </div>
          </section>
        </article>
      `;

      modalContent.scrollTop = 0;
      setupComments(post);
    } catch (err) {
      console.error(err);
      modalContent.innerHTML = `
        <div class="error-state">
          <p>Erreur inattendue lors de la récupération de l'article.</p>
        </div>
      `;
    }
  }

  async function setupComments(post) {
    const form = document.getElementById('comment-form');
    const authorInput = document.getElementById('comment-author');
    const bodyInput = document.getElementById('comment-body');
    const charCount = document.getElementById('comment-char-count');
    const submitBtn = document.getElementById('comment-submit-btn');
    const feedback = document.getElementById('comment-feedback');
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');
    const metaCount = document.getElementById('meta-comment-count');

    if (!form || !commentsList) return;

    const savedName = localStorage.getItem('nostromo_reader_name') || '';
    if (authorInput && savedName) {
      authorInput.value = savedName;
    }

    if (bodyInput && charCount) {
      bodyInput.addEventListener('input', () => {
        charCount.textContent = bodyInput.value.length;
      });
    }

    let isAdmin = false;
    try {
      const meRes = await fetch('/api/admin/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        isAdmin = meData?.user?.role === 'admin';
      }
    } catch {
      isAdmin = false;
    }

    async function fetchAndRenderComments() {
      try {
        const res = await fetch(`/api/posts/${post.slug || post.id}/comments`);
        if (!res.ok) throw new Error('Erreur de chargement');
        const comments = await res.json();

        if (commentsCount) commentsCount.textContent = comments.length;
        if (metaCount) metaCount.textContent = comments.length;

        if (comments.length === 0) {
          commentsList.innerHTML = `
            <div class="comments-empty">
              <span class="comments-empty-icon">💭</span>
              <p>Aucun commentaire pour le moment.<br>Soyez le premier à partager votre avis !</p>
            </div>
          `;
          return;
        }

        commentsList.innerHTML = comments.map(c => renderCommentCard(c, isAdmin)).join('');
        attachCommentListeners();
      } catch (err) {
        console.error(err);
        commentsList.innerHTML = `
          <div class="comments-error">
            <p>Impossible de charger les commentaires.</p>
          </div>
        `;
      }
    }

    function renderCommentCard(c, showDelete) {
      const dateFormatted = formatCommentDate(c.created_at);
      const initials = getInitials(c.author_name);
      return `
        <div class="comment-item" id="comment-${c.id}">
          <div class="comment-avatar">${escapeHtml(initials)}</div>
          <div class="comment-content-wrap">
            <div class="comment-item-header">
              <span class="comment-author-name">${escapeHtml(c.author_name || 'Anonyme')}</span>
              <span class="comment-dot">•</span>
              <span class="comment-date" title="${escapeHtml(c.created_at)}">${escapeHtml(dateFormatted)}</span>
              ${showDelete ? `
                <button type="button" class="btn-delete-comment" data-id="${c.id}" title="Supprimer ce commentaire (Modération)">
                  ✕ Supprimer
                </button>
              ` : ''}
            </div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
          </div>
        </div>
      `;
    }

    function attachCommentListeners() {
      if (!isAdmin) return;
      commentsList.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', async () => {
          const commentId = btn.getAttribute('data-id');
          if (!confirm('Supprimer définitivement ce commentaire ?')) return;
          try {
            const delRes = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
            if (delRes.ok) {
              const el = document.getElementById(`comment-${commentId}`);
              if (el) el.remove();
              const remaining = commentsList.querySelectorAll('.comment-item').length;
              if (commentsCount) commentsCount.textContent = remaining;
              if (metaCount) metaCount.textContent = remaining;
              if (remaining === 0) {
                commentsList.innerHTML = `
                  <div class="comments-empty">
                    <span class="comments-empty-icon">💭</span>
                    <p>Aucun commentaire pour le moment.<br>Soyez le premier à partager votre avis !</p>
                  </div>
                `;
              }
            } else {
              alert('Erreur lors de la suppression.');
            }
          } catch (e) {
            alert('Erreur : ' + e.message);
          }
        });
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = authorInput.value.trim() || 'Anonyme';
      const content = bodyInput.value.trim();

      if (!content) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Envoi...</span>`;

      try {
        const postRes = await fetch(`/api/posts/${post.slug || post.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_name: author, content })
        });

        if (!postRes.ok) {
          const errData = await postRes.json();
          throw new Error(errData.error || 'Erreur lors de l\'envoi.');
        }

        const newComment = await postRes.json();

        if (author && author !== 'Anonyme') {
          localStorage.setItem('nostromo_reader_name', author);
        }

        bodyInput.value = '';
        if (charCount) charCount.textContent = '0';

        if (feedback) {
          feedback.textContent = '✔ Commentaire publié avec succès !';
          feedback.className = 'comment-feedback success';
          feedback.style.display = 'block';
          setTimeout(() => { feedback.style.display = 'none'; }, 3500);
        }

        const emptyState = commentsList.querySelector('.comments-empty');
        if (emptyState) {
          commentsList.innerHTML = '';
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderCommentCard(newComment, isAdmin);
        const cardNode = tempDiv.firstElementChild;
        commentsList.appendChild(cardNode);
        attachCommentListeners();

        const total = commentsList.querySelectorAll('.comment-item').length;
        if (commentsCount) commentsCount.textContent = total;
        if (metaCount) metaCount.textContent = total;

        cardNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        if (feedback) {
          feedback.textContent = '❌ ' + err.message;
          feedback.className = 'comment-feedback error';
          feedback.style.display = 'block';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Publier</span><span class="btn-arrow">→</span>`;
      }
    });

    await fetchAndRenderComments();
  }

  function formatCommentDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString.endsWith('Z') || dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (isNaN(date.getTime())) return dateString;
    if (diffSec < 60) return "À l'instant";
    if (diffSec < 3600) return `Il y a ${Math.max(1, Math.floor(diffSec / 60))} min`;
    if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getInitials(name) {
    const cleaned = String(name || 'A').trim();
    if (!cleaned) return 'A';
    const parts = cleaned.split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
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
