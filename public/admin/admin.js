document.addEventListener('DOMContentLoaded', async () => {
  let posts = [];
  let currentPostId = null;
  let currentUser = null;
  let currentFilter = 'mine';

  let searchQuery = '';

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

  const navTabBlog = document.getElementById('nav-tab-blog');
  const navTabSite = document.getElementById('nav-tab-site');
  const studioLayout = document.querySelector('.studio-layout');
  const siteConfigSection = document.getElementById('site-config-section');
  const saveSiteConfigBtn = document.getElementById('save-site-config-btn');
  const siteConfigStatus = document.getElementById('site-config-status');
  const cfgWelcomeText = document.getElementById('cfg-welcome-text');
  const cfgFeaturedTitle = document.getElementById('cfg-featured-title');
  const cfgFeaturedBadge = document.getElementById('cfg-featured-badge');
  const cfgFeaturedDesc = document.getElementById('cfg-featured-desc');
  const cfgFeaturedLink = document.getElementById('cfg-featured-link');
  const projectsContainer = document.getElementById('projects-items-container');
  const addProjectBtn = document.getElementById('add-project-btn');
  const toastNotification = document.getElementById('toast-notification');

  let currentSiteProjects = [];

  function showToast(message) {
    if (!toastNotification) return;
    toastNotification.innerHTML = `<span>✔</span> <span>${escapeHtml(message)}</span>`;
    toastNotification.style.display = 'flex';
    setTimeout(() => {
      toastNotification.style.display = 'none';
    }, 3500);
  }



  function switchTab(targetTab) {
    if (targetTab === 'site') {
      navTabBlog.classList.remove('active');
      navTabBlog.setAttribute('aria-selected', 'false');
      navTabSite.classList.add('active');
      navTabSite.setAttribute('aria-selected', 'true');
      studioLayout.style.display = 'none';
      siteConfigSection.style.display = 'block';
      loadSiteConfig();
    } else {
      navTabSite.classList.remove('active');
      navTabSite.setAttribute('aria-selected', 'false');
      navTabBlog.classList.add('active');
      navTabBlog.setAttribute('aria-selected', 'true');
      siteConfigSection.style.display = 'none';
      studioLayout.style.display = 'flex';
    }
  }

  if (navTabBlog && navTabSite) {
    navTabBlog.addEventListener('click', () => switchTab('blog'));
    navTabSite.addEventListener('click', () => switchTab('site'));
  }



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



  if (postsSearchInput) {
    postsSearchInput.addEventListener('input', () => {
      searchQuery = postsSearchInput.value.trim().toLowerCase();
      renderPostsList();
    });
  }



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



  function updatePreview() {
    const rawMarkdown = contentInput.value;
    const rawHtml = marked.parse(rawMarkdown);
    previewBox.innerHTML = DOMPurify.sanitize(rawHtml);

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
          insertTextAtCursor(contentInput, '[', '](https:

          break;
        case 'list':
          insertTextAtCursor(contentInput, '\n- ', '\n');
          break;
      }
    });
  });



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

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      submitPost();
    }
  });



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



  async function loadSiteConfig() {
    if (siteConfigStatus) {
      siteConfigStatus.innerHTML = '<span style="color: var(--text-tertiary);">⏳ Chargement...</span>';
    }

    try {
      const res = await fetch('/api/admin/site-config');
      if (!res.ok) throw new Error('Impossible de charger la configuration');
      const data = await res.json();

      if (cfgWelcomeText) {
        cfgWelcomeText.value = data.welcome_text || '';
      }

      const featured = data.featured_project || {};
      if (cfgFeaturedTitle) cfgFeaturedTitle.value = featured.title || '';
      if (cfgFeaturedBadge) cfgFeaturedBadge.value = featured.badge || '';
      if (cfgFeaturedDesc) cfgFeaturedDesc.value = featured.description || '';
      if (cfgFeaturedLink) cfgFeaturedLink.value = featured.link || '';

      currentSiteProjects = Array.isArray(data.projects_list) ? data.projects_list : [];
      renderProjectsList();

      if (siteConfigStatus) {
        siteConfigStatus.innerHTML = '<span style="color: var(--text-tertiary);">✔ Synchronisé</span>';
      }
    } catch (err) {
      console.error(err);
      if (siteConfigStatus) {
        siteConfigStatus.innerHTML = '<span style="color: var(--danger);">Erreur de chargement</span>';
      }
    }
  }

  function renderProjectsList() {
    if (!projectsContainer) return;

    if (currentSiteProjects.length === 0) {
      projectsContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-tertiary); font-size: 0.82rem; background: var(--bg-surface); border-radius: 6px; border: 1px dashed var(--border-default);">
          Aucun projet dans la liste.<br>Cliquez sur "Ajouter un projet" pour en créer un.
        </div>
      `;
      return;
    }

    projectsContainer.innerHTML = currentSiteProjects.map((p, idx) => `
      <div class="project-item-card" data-idx="${idx}">
        <div class="project-item-header">
          <span class="project-item-index">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            Projet #${idx + 1}
          </span>
          <button type="button" class="btn btn-ghost btn-sm btn-delete-project" data-idx="${idx}" style="color: var(--danger);" title="Supprimer ce projet">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Supprimer</span>
          </button>
        </div>
        <div class="project-item-body-grid">
          <div>
            <label class="config-label">Titre</label>
            <input type="text" class="form-input project-title-input" value="${escapeHtml(p.title || '')}" placeholder="Titre...">
          </div>
          <div>
            <label class="config-label">Lien / URL</label>
            <input type="text" class="form-input project-link-input" value="${escapeHtml(p.link || '')}" placeholder="https:

          </div>
        </div>
        <div>
          <label class="config-label">Description</label>
          <input type="text" class="form-input project-desc-input" value="${escapeHtml(p.description || '')}" placeholder="Courte description...">
        </div>
      </div>
    `).join('');

    projectsContainer.querySelectorAll('.project-item-card').forEach(card => {
      const idx = Number(card.getAttribute('data-idx'));
      const titleInp = card.querySelector('.project-title-input');
      const linkInp = card.querySelector('.project-link-input');
      const descInp = card.querySelector('.project-desc-input');

      titleInp.addEventListener('input', () => {
        currentSiteProjects[idx].title = titleInp.value;
      });
      linkInp.addEventListener('input', () => {
        currentSiteProjects[idx].link = linkInp.value;
      });
      descInp.addEventListener('input', () => {
        currentSiteProjects[idx].description = descInp.value;
      });
    });

    projectsContainer.querySelectorAll('.btn-delete-project').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        currentSiteProjects.splice(idx, 1);
        renderProjectsList();
      });
    });
  }

  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', () => {
      currentSiteProjects.push({
        title: 'Nouveau projet',
        description: 'Description du projet',
        link: '#'
      });
      renderProjectsList();

      setTimeout(() => {
        const lastCard = projectsContainer.querySelector('.project-item-card:last-child');
        if (lastCard) {
          lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const firstInp = lastCard.querySelector('.project-title-input');
          if (firstInp) firstInp.focus();
        }
      }, 50);
    });
  }

  if (saveSiteConfigBtn) {
    saveSiteConfigBtn.addEventListener('click', async () => {
      if (siteConfigStatus) {
        siteConfigStatus.innerHTML = '<span style="color: var(--primary);">⏳ Sauvegarde en cours...</span>';
      }

      const payload = {
        welcome_text: cfgWelcomeText ? cfgWelcomeText.value.trim() : '',
        featured_project: {
          title: cfgFeaturedTitle ? cfgFeaturedTitle.value.trim() : '',
          badge: cfgFeaturedBadge ? cfgFeaturedBadge.value.trim() : '',
          description: cfgFeaturedDesc ? cfgFeaturedDesc.value.trim() : '',
          link: cfgFeaturedLink ? cfgFeaturedLink.value.trim() : ''
        },
        projects_list: currentSiteProjects
      };

      try {
        const res = await fetch('/api/admin/site-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erreur lors de la sauvegarde');
        }

        if (siteConfigStatus) {
          siteConfigStatus.innerHTML = '<span style="color: var(--text-tertiary);">✔ Enregistré</span>';
        }
        showToast('Configuration de parcival.fr mise à jour avec succès !');
      } catch (err) {
        alert('Erreur : ' + err.message);
        if (siteConfigStatus) {
          siteConfigStatus.innerHTML = '<span style="color: var(--danger);">Erreur</span>';
        }
      }
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  await loadPosts();
});
