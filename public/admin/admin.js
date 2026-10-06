document.addEventListener('DOMContentLoaded', async () => {
  let posts = [];
  let currentPostId = null;
  let currentUser = null;
  let currentFilter = 'mine'; // 'mine' ou 'all'

  const userInfoEl = document.getElementById('user-info');
  const sidebarTitleEl = document.getElementById('sidebar-title');
  const filterTabsEl = document.getElementById('filter-tabs');
  const postsListEl = document.getElementById('posts-list');
  const postForm = document.getElementById('post-form');
  const postIdInput = document.getElementById('post-id');
  const postAuthorBanner = document.getElementById('post-author-banner');
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  const statusSelect = document.getElementById('status');
  const summaryInput = document.getElementById('summary');
  const contentInput = document.getElementById('content');
  const previewBox = document.getElementById('preview');
  const deleteBtn = document.getElementById('delete-btn');
  const newPostBtn = document.getElementById('new-post-btn');

  try {
    const meRes = await fetch('/api/admin/me');
    if (!meRes.ok) throw new Error('Non authentifié');
    const data = await meRes.json();
    currentUser = data.user;

    const roleLabel = currentUser.role === 'admin' ? 'Administrateur' : 'Auteur';
    userInfoEl.innerHTML = `
      <span>${escapeHtml(currentUser.username)}</span>
      <span class="role-badge ${currentUser.role}">${roleLabel}</span>
      ${currentUser.avatar ? `<img src="${currentUser.avatar}" alt="Avatar" class="user-avatar">` : ''}
      <a href="/auth/logout" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Déconnexion</a>
    `;

    // Si administrateur, activer les onglets de filtrage
    if (currentUser.role === 'admin') {
      filterTabsEl.style.display = 'flex';
      setupFilterTabs();
    } else {
      sidebarTitleEl.textContent = 'Mes articles';
    }
  } catch (err) {
    window.location.href = '/auth/discord';
    return;
  }

  function setupFilterTabs() {
    const tabs = filterTabsEl.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        sidebarTitleEl.textContent = currentFilter === 'all' ? 'Tous les articles' : 'Mes articles';
        await loadPosts();
      });
    });
  }

  function updatePreview() {
    const rawMarkdown = contentInput.value;
    const rawHtml = marked.parse(rawMarkdown);
    previewBox.innerHTML = DOMPurify.sanitize(rawHtml);
  }

  contentInput.addEventListener('input', updatePreview);

  async function loadPosts(selectId = null) {
    try {
      const url = currentUser.role === 'admin'
        ? `/api/admin/posts?filter=${currentFilter}`
        : '/api/admin/posts';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur de chargement');
      posts = await res.json();

      renderPostsList();

      if (posts.length > 0) {
        if (selectId) {
          const target = posts.find(p => p.id == selectId);
          if (target) selectPost(target);
          else selectPost(posts[0]);
        } else if (!currentPostId) {
          selectPost(posts[0]);
        }
      } else {
        newPostForm();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderPostsList() {
    if (posts.length === 0) {
      postsListEl.innerHTML = `
        <li style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Aucun article pour le moment.<br>Cliquez sur "+ Nouvel article" pour commencer.
        </li>
      `;
      return;
    }

    postsListEl.innerHTML = posts.map(post => {
      const isMine = post.author_id === currentUser.id;
      const showAuthor = currentUser.role === 'admin' && currentFilter === 'all';

      return `
        <li class="post-item ${post.id === currentPostId ? 'active' : ''}" data-id="${post.id}">
          <div class="post-item-title">${escapeHtml(post.title)}</div>
          <div class="post-item-meta">
            <span class="badge ${post.status}">${post.status === 'published' ? 'Publié' : 'Brouillon'}</span>
            <span>${new Date(post.updated_at || post.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          ${showAuthor ? `
            <div class="author-tag">
              ${post.author_avatar ? `<img src="${escapeHtml(post.author_avatar)}" class="author-tag-avatar">` : ''}
              <span>${escapeHtml(post.author_name || 'Inconnu')} ${isMine ? '(Vous)' : ''}</span>
            </div>
          ` : ''}
        </li>
      `;
    }).join('');

    document.querySelectorAll('.post-item').forEach(li => {
      li.addEventListener('click', () => {
        const id = li.getAttribute('data-id');
        const post = posts.find(p => p.id == id);
        if (post) selectPost(post);
      });
    });
  }

  function selectPost(post) {
    currentPostId = post.id;
    postIdInput.value = post.id;
    titleInput.value = post.title;
    slugInput.value = post.slug || '';
    statusSelect.value = post.status;
    summaryInput.value = post.summary || '';
    contentInput.value = post.content || '';
    deleteBtn.style.display = 'block';

    const isMine = post.author_id === currentUser.id;
    if (postAuthorBanner) {
      postAuthorBanner.style.display = 'flex';
      postAuthorBanner.innerHTML = `
        <span>✍️ Auteur : <strong>${escapeHtml(post.author_name || 'Inconnu')}</strong> ${isMine ? '(Vous)' : ''}</span>
        ${post.published_at ? `<span>• Publié le ${new Date(post.published_at).toLocaleDateString('fr-FR')}</span>` : ''}
      `;
    }

    updatePreview();
    renderPostsList();
  }

  function newPostForm() {
    currentPostId = null;
    postIdInput.value = '';
    titleInput.value = '';
    slugInput.value = '';
    statusSelect.value = 'draft';
    summaryInput.value = '';
    contentInput.value = '# Nouvel article\n\nCommencez à rédiger ici...';
    deleteBtn.style.display = 'none';

    if (postAuthorBanner) {
      postAuthorBanner.style.display = 'flex';
      postAuthorBanner.innerHTML = `<span>✍️ Nouvel article rédigé par <strong>${escapeHtml(currentUser.username)}</strong></span>`;
    }

    updatePreview();
    renderPostsList();
  }

  newPostBtn.addEventListener('click', newPostForm);

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const postData = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      summary: summaryInput.value.trim(),
      content: contentInput.value,
      status: statusSelect.value
    };

    const isEdit = !!currentPostId;
    const url = isEdit ? `/api/admin/posts/${currentPostId}` : '/api/admin/posts';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erreur lors de l\'enregistrement');
      }

      const savedPost = await res.json();
      alert(isEdit ? 'Article mis à jour avec succès !' : 'Article créé avec succès !');
      await loadPosts(savedPost.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentPostId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const res = await fetch(`/api/admin/posts/${currentPostId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erreur lors de la suppression');
      }

      alert('Article supprimé.');
      currentPostId = null;
      await loadPosts();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  await loadPosts();
});
