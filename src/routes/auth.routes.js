import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// Redirection vers Discord OAuth2
router.get('/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    state: state
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

// Callback après autorisation Discord
router.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.oauthState) {
    return res.status(400).send('Erreur CSRF : State invalide ou expiré.');
  }
  delete req.session.oauthState;

  if (!code) {
    return res.status(400).send('Code d\'autorisation manquant.');
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Erreur Discord Token (${tokenResponse.status}): ${errText}`);
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userResponse.ok) {
      throw new Error('Impossible de récupérer le profil Discord.');
    }

    const discordUser = await userResponse.json();

    // Vérification de la liste blanche
    const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
      .split(',')
      .map(id => id.trim());

    if (!adminIds.includes(discordUser.id)) {
      console.warn(`[AUTH] Accès refusé pour l'ID Discord non autorisé : ${discordUser.id} (${discordUser.username})`);
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
            <p>Votre identifiant Discord (<code>${discordUser.id}</code>) ne figure pas dans la liste blanche des administrateurs de ce blog.</p>
            <a href="/">← Retour au site public</a>
          </div>
        </body>
        </html>
      `);
    }

    // Enregistrement en session
    req.session.user = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    res.status(500).send('Erreur lors de l\'authentification Discord.');
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
