export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter via Discord.' });
    }
    return res.redirect('/auth/discord');
  }

  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.session.user.role !== 'admin') {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'Accès refusé : privilèges administrateur requis.' });
      }
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>403 - Accès Administrateur Requis</title>
          <style>
            body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; max-width: 420px; }
            h1 { color: #f87171; margin-top: 0; }
            p { line-height: 1.5; color: #cbd5e1; }
            a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 1.5rem; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>403 - Accès Refusé</h1>
            <p>Cette action nécessite les droits d'administrateur du blog.</p>
            <a href="/admin">← Retourner à votre espace</a>
          </div>
        </body>
        </html>
      `);
    }

    next();
  });
}
