document.addEventListener('DOMContentLoaded', async () => {
  let posts = [];
  let currentPostId = null;

  const userInfoEl = document.getElementById('user-info');
  const postsListEl = document.getElementById('posts-list');
  const postForm = document.getElementById('post-form');
  const postIdInput = document.getElementById('post-id');
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  const statusSelect = document.getElementById('status');
  const summaryInput = document.getElementById('summary');
  const contentInput = document.getElementById('content');
  const previewBox = document.getElementById('preview');
  const deleteBtn = document.getElementById('delete-btn');
  const newPostBtn = document.getElementById('new-post-btn');

  // 1. Charger les infos utilisateur
  try {
    const meRes = await fetch('/api/admin/me');
    if (!meRes.ok) throw new Error('Non authentifié');
    const data = await meRes.json();
    userInfoEl.innerHTML = `
      <span>${escapeHtml(data.user.username)}</span>
      ${data.user.avatar ? `<img src="${data.user.avatar}" alt="Avatar" class="user-avatar">` : ''}
      <a href="/auth/logout" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Déconnexion</a>
    `;
  } catch (err) {
    window.location.href = '/auth/discord';
    return;
  }

  // 2. Prévisualisation Markdown en temps réel
  function updatePreview() {
    const rawMarkdown = contentInput.value;
    const rawHtml = marked.parse(rawMarkdown);
    previewBox.innerHTML = DOMPurify.sanitize(rawHtml);
  }

  contentInput.addEventListener('input', updatePreview);

  // 3. Charger la liste des articles
  async function loadPosts(selectId = null) {
    try {
      const res = await fetch('/api/admin/posts');
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
    postsListEl.innerHTML = posts.map(post => `
      <li class="post-item ${post.id === currentPostId ? 'active' : ''}" data-id="${post.id}">
        <div class="post-item-title">${escapeHtml(post.title)}</div>
        <div class="post-item-meta">
          <span class="badge ${post.status}">${post.status === 'published' ? 'Publié' : 'Brouillon'}</span>
          <span>${new Date(post.updated_at || post.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </li>
    `).join('');

    // Attacher les clics
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

    updatePreview();
    renderPostsList();
  }

  newPostBtn.addEventListener('click', newPostForm);

  // 4. Soumission du formulaire (Création / Modification)
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

  // 5. Suppression d'un article
  deleteBtn.addEventListener('click', async () => {
    if (!currentPostId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const res = await fetch(`/api/admin/posts/${currentPostId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

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

  // Initialisation
  await loadPosts();
});
