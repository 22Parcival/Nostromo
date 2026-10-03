export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter via Discord.' });
    }
    return res.redirect('/auth/discord');
  }

  const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map(id => id.trim());

  if (!adminIds.includes(req.session.user.id)) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(403).json({ error: 'Accès refusé : ID non autorisé.' });
    }
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>403 - Accès Refusé</title>
        <style>
          body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; max-width: 400px; }
          h1 { color: #f87171; margin-top: 0; }
          a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 1.5rem; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>403 - Accès Refusé</h1>
          <p>Vous n'avez pas les privilèges requis pour accéder au panel d'administration.</p>
          <a href="/auth/logout">Se déconnecter / Changer de compte</a>
        </div>
      </body>
      </html>
    `);
  }

  next();
}
