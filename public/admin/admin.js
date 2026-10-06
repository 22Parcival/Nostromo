document.addEventListener('DOMContentLoaded', async () => {
  let posts = [];
  let currentPostId = null;
  let currentUser = null;
  let currentFilter = 'mine'; // 'mine' ou 'all'
  let searchQuery = '';

  // Elements du DOM
  const userInfoEl = document.getElementById('user-info');
  const sidebarTitleEl = document.getElementById('sidebar-title');
  const filterTabsEl = document.getElementById('filter-tabs');
  const postsSearchInput = document.getElementById('posts-search');
  const postsListEl = document.getElementById('posts-list');
  const postForm = document.getElementById('post-form');
  const postIdInput = document.getElementById('post-id');
  const postAuthorBanner = document.getElementById('post-author-banner');
  const saveStatusIndicator = document.getElementById('save-status-indicator');
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  const statusSelect = document.getElementById('status');
  const summaryInput = document.getElementById('summary');
  const coverImageInput = document.getElementById('cover-image');
  const coverFileInput = document.getElementById('cover-file-input');
  const coverPreviewWrapper = document.getElementById('cover-preview-wrapper');
  const coverPreviewImg = document.getElementById('cover-preview-img');
  const removeCoverBtn = document.getElementById('remove-cover-btn');
  const imageFileInput = document.getElementById('image-file-input');
  const uploadStatusEl = document.getElementById('upload-status');
  const wordCountEl = document.getElementById('word-count');
  const contentInput = document.getElementById('content');
  const previewBox = document.getElementById('preview');
  const splitWorkspace = document.getElementById('split-workspace');
  const deleteBtn = document.getElementById('delete-btn');
  const newPostBtn = document.getElementById('new-post-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');

  // ==========================================================================
  // THÈME CLAIR / SOMBRE
  // ==========================================================================
  function initTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeToggleBtn.setAttribute('title', currentTheme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre');

    themeToggleBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const nextTheme = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('nostromo_theme', nextTheme);
      themeToggleBtn.setAttribute('title', nextTheme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre');
    });
  }
  initTheme();

  // ==========================================================================
  // AUTHENTIFICATION
  // ==========================================================================
  try {
    const meRes = await fetch('/api/admin/me');
    if (!meRes.ok) throw new Error('Non authentifié');
    const data = await meRes.json();
    currentUser = data.user;

    const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Auteur';
    userInfoEl.innerHTML = `
      ${currentUser.avatar ? `<img src="${currentUser.avatar}" alt="Avatar" class="user-avatar">` : ''}
      <span>${escapeHtml(currentUser.username)}</span>
      <span class="role-tag ${currentUser.role}">${roleLabel}</span>
      <a href="/auth/logout" class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.76rem;" title="Se déconnecter">Quitter</a>
    `;

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

  // ==========================================================================
  // RECHERCHE EN TEMPS RÉEL DANS LA SIDEBAR
  // ==========================================================================
  if (postsSearchInput) {
    postsSearchInput.addEventListener('input', () => {
      searchQuery = postsSearchInput.value.trim().toLowerCase();
      renderPostsList();
    });
  }

  // ==========================================================================
  // ONGLETS DU MODE ÉDITEUR (RÉDIGER / SCINDÉ / APERÇU)
  // ==========================================================================
  const viewModeTabs = document.querySelectorAll('.view-mode-tab');
  viewModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewModeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.getAttribute('data-mode');
      splitWorkspace.className = `split-workspace mode-${mode}`;
      if (mode === 'preview' || mode === 'split') {
        updatePreview();
      }
    });
  });

  // ==========================================================================
  // PRÉVISUALISATION & COMPTEUR DE MOTS
  // ==========================================================================
  function updatePreview() {
    const rawMarkdown = contentInput.value;
    const rawHtml = marked.parse(rawMarkdown);
    previewBox.innerHTML = DOMPurify.sanitize(rawHtml);

    // Compteur de mots
    const words = rawMarkdown.trim() ? rawMarkdown.trim().split(/\s+/).length : 0;
    if (wordCountEl) {
      wordCountEl.textContent = `${words} ${words > 1 ? 'mots' : 'mot'}`;
    }
  }

  contentInput.addEventListener('input', () => {
    updatePreview();
    setUnsavedChanges(true);
  });

  titleInput.addEventListener('input', () => setUnsavedChanges(true));
  summaryInput.addEventListener('input', () => setUnsavedChanges(true));
  slugInput.addEventListener('input', () => setUnsavedChanges(true));

  function setUnsavedChanges(hasChanges) {
    if (saveStatusIndicator) {
      if (hasChanges) {
        saveStatusIndicator.innerHTML = '<span style="color: var(--badge-draft-text);">● Non enregistré</span>';
      } else {
        saveStatusIndicator.innerHTML = '<span style="color: var(--text-tertiary);">✔ À jour</span>';
      }
    }
  }

  // ==========================================================================
  // GESTION DE L'IMAGE DE COUVERTURE
  // ==========================================================================
  function updateCoverPreview() {
    const url = coverImageInput.value.trim();
    if (url) {
      coverPreviewImg.src = url;
      coverPreviewWrapper.style.display = 'inline-block';
    } else {
      coverPreviewWrapper.style.display = 'none';
      coverPreviewImg.src = '';
    }
  }

  coverImageInput.addEventListener('input', updateCoverPreview);

  if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', () => {
      coverImageInput.value = '';
      updateCoverPreview();
      setUnsavedChanges(true);
    });
  }

  if (coverFileInput) {
    coverFileInput.addEventListener('change', async () => {
      if (coverFileInput.files.length > 0) {
        const file = coverFileInput.files[0];
        const url = await uploadImageFile(file);
        if (url) {
          coverImageInput.value = url;
          updateCoverPreview();
          setUnsavedChanges(true);
        }
        coverFileInput.value = '';
      }
    });
  }

  // ==========================================================================
  // BARRE D'OUTILS MARKDOWN & INSERTION
  // ==========================================================================
  function insertTextAtCursor(textarea, textBefore, textAfter = '') {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const selected = textarea.value.substring(startPos, endPos);
    const before = textarea.value.substring(0, startPos);
    const after = textarea.value.substring(endPos, textarea.value.length);

    textarea.value = before + textBefore + (selected || '') + textAfter + after;
    textarea.selectionStart = startPos + textBefore.length;
    textarea.selectionEnd = startPos + textBefore.length + (selected ? selected.length : 0);
    textarea.focus();
    updatePreview();
    setUnsavedChanges(true);
  }

  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      switch (tool) {
        case 'bold':
          insertTextAtCursor(contentInput, '**', '**');
          break;
        case 'italic':
          insertTextAtCursor(contentInput, '*', '*');
          break;
        case 'h2':
          insertTextAtCursor(contentInput, '\n## ', '\n');
          break;
        case 'h3':
          insertTextAtCursor(contentInput, '\n### ', '\n');
          break;
        case 'quote':
          insertTextAtCursor(contentInput, '\n> ', '\n');
          break;
        case 'code':
          insertTextAtCursor(contentInput, '\n```\n', '\n```\n');
          break;
        case 'link':
          insertTextAtCursor(contentInput, '[', '](https://)');
          break;
        case 'list':
          insertTextAtCursor(contentInput, '\n- ', '\n');
          break;
      }
    });
  });

  // ==========================================================================
  // TÉLÉVERSEMENT D'IMAGES (BUTTON, DRAG&DROP, PASTE)
  // ==========================================================================
  async function uploadImageFile(file) {
    if (!file) return null;
    uploadStatusEl.style.display = 'inline';
    uploadStatusEl.textContent = '⏳ Téléversement...';

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erreur lors du téléversement.');
      }

      const data = await res.json();
      uploadStatusEl.textContent = '✔ Envoyée !';
      setTimeout(() => { uploadStatusEl.style.display = 'none'; }, 2000);
      return data.url;
    } catch (err) {
      alert('Erreur d\'upload : ' + err.message);
      uploadStatusEl.style.display = 'none';
      return null;
    }
  }

  if (imageFileInput) {
    imageFileInput.addEventListener('change', async () => {
      if (imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0];
        const url = await uploadImageFile(file);
        if (url) {
          insertTextAtCursor(contentInput, `\n![${file.name}](${url})\n`);
        }
        imageFileInput.value = '';
      }
    });
  }

  contentInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    contentInput.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(type => {
    contentInput.addEventListener(type, () => {
      contentInput.classList.remove('dragover');
    });
  });

  contentInput.addEventListener('drop', async (e) => {
    e.preventDefault();
    contentInput.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      const url = await uploadImageFile(file);
      if (url) {
        insertTextAtCursor(contentInput, `\n![${file.name}](${url})\n`);
      }
    }
  });

  contentInput.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const url = await uploadImageFile(file);
        if (url) {
          insertTextAtCursor(contentInput, `\n![Image](${url})\n`);
        }
        break;
      }
    }
  });

  // ==========================================================================
  // CHARGEMENT & AFFICHAGE DES ARTICLES
  // ==========================================================================
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
    let filtered = posts;
    if (searchQuery) {
      filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery));
    }

    if (filtered.length === 0) {
      postsListEl.innerHTML = `
        <li style="padding: 2rem 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.82rem;">
          ${searchQuery ? 'Aucun article correspondant.' : 'Aucun article rédigé.<br>Cliquez sur "Nouveau" pour commencer.'}
        </li>
      `;
      return;
    }

    postsListEl.innerHTML = filtered.map(post => {
      const isMine = post.author_id === currentUser.id;
      const showAuthor = currentUser.role === 'admin' && currentFilter === 'all';

      return `
        <li class="post-item ${post.id === currentPostId ? 'active' : ''}" data-id="${post.id}">
          <div class="post-item-title">${escapeHtml(post.title)}</div>
          <div class="post-item-meta">
            <span class="badge-status ${post.status}">${post.status === 'published' ? 'Publié' : 'Brouillon'}</span>
            <span>${new Date(post.updated_at || post.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          ${showAuthor ? `
            <div class="author-chip-mini">
              ${post.author_avatar ? `<img src="${escapeHtml(post.author_avatar)}" alt="Avatar">` : ''}
              <span>${escapeHtml(post.author_name || 'Inconnu')} ${isMine ? '(Vous)' : ''}</span>
            </div>
          ` : ''}
        </li>
      `;
    }).join('');

    postsListEl.querySelectorAll('.post-item').forEach(li => {
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
    coverImageInput.value = post.cover_image || '';
    contentInput.value = post.content || '';
    deleteBtn.style.display = 'inline-flex';

    updateCoverPreview();

    const isMine = post.author_id === currentUser.id;
    if (postAuthorBanner) {
      postAuthorBanner.style.display = 'inline-flex';
      postAuthorBanner.innerHTML = `
        <span>✍️ Auteur : <strong>${escapeHtml(post.author_name || 'Inconnu')}</strong> ${isMine ? '(Vous)' : ''}</span>
      `;
    }

    setUnsavedChanges(false);
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
    coverImageInput.value = '';
    contentInput.value = '# Nouvel article\n\nCommencez à rédiger votre contenu Markdown ici...';
    deleteBtn.style.display = 'none';

    updateCoverPreview();

    if (postAuthorBanner) {
      postAuthorBanner.style.display = 'inline-flex';
      postAuthorBanner.innerHTML = `<span>✍️ Nouvel article rédigé par <strong>${escapeHtml(currentUser.username)}</strong></span>`;
    }

    setUnsavedChanges(false);
    updatePreview();
    renderPostsList();
  }

  newPostBtn.addEventListener('click', newPostForm);

  // ==========================================================================
  // ENREGISTREMENT (SUBMIT & RACCOURCI CTRL+S)
  // ==========================================================================
  async function submitPost() {
    if (!titleInput.value.trim() || !contentInput.value.trim()) {
      alert('Veuillez renseigner au moins le titre et le contenu de l\'article.');
      return;
    }

    const postData = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      summary: summaryInput.value.trim(),
      cover_image: coverImageInput.value.trim(),
      content: contentInput.value,
      status: statusSelect.value
    };

    const isEdit = !!currentPostId;
    const url = isEdit ? `/api/admin/posts/${currentPostId}` : '/api/admin/posts';
    const method = isEdit ? 'PUT' : 'POST';

    if (saveStatusIndicator) {
      saveStatusIndicator.innerHTML = '<span style="color: var(--primary);">⏳ Enregistrement...</span>';
    }

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
      setUnsavedChanges(false);
      await loadPosts(savedPost.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
      setUnsavedChanges(true);
    }
  }

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitPost();
  });

  // Raccourci clavier universel : Ctrl+S ou Cmd+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      submitPost();
    }
  });

  // ==========================================================================
  // SUPPRESSION D'ARTICLE
  // ==========================================================================
  deleteBtn.addEventListener('click', async () => {
    if (!currentPostId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.')) return;

    try {
      const res = await fetch(`/api/admin/posts/${currentPostId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erreur lors de la suppression');
      }

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
