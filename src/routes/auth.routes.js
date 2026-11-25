import { Router } from 'express';
import crypto from 'crypto';
import { userService } from '../services/user.service.js';

const router = Router();
const ALLOWED_DISCORD_ID = "751472879421358182";

router.get('/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http:


  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state: state
  });

  res.redirect(`https:

});

router.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session?.oauthState) {
    return res.status(400).send('Erreur CSRF : State invalide ou expiré.');
  }
  delete req.session.oauthState;

  if (!code) {
    return res.status(400).send('Code d\'autorisation manquant.');
  }

  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http:


  try {
    const tokenResponse = await fetch('https:

      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Erreur Discord Token (${tokenResponse.status}): ${errText}`);
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch('https:

      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userResponse.ok) {
      throw new Error('Impossible de récupérer le profil Discord.');
    }

    const discordUser = await userResponse.json();

    if (discordUser.id !== ALLOWED_DISCORD_ID) {
      console.warn(`[AUTH REFUSED] Discord ID non autorisé a tenté de se connecter : ${discordUser.id} (${discordUser.username})`);
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>403 - Accès Refusé</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f4f4f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #141414; padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); text-align: center; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #e06c75; margin-top: 0; font-size: 1.4rem; }
            p { line-height: 1.6; color: #a1a1aa; font-size: 0.9rem; }
            a { color: #dba0a0; text-decoration: none; display: inline-block; margin-top: 1.5rem; font-weight: 500; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>403 - Accès Refusé</h1>
            <p>Ce compte Discord (${discordUser.username}#${discordUser.discriminator || '0'} - ${discordUser.id}) n'est pas autorisé à administrer ce site.</p>
            <p>Seul le propriétaire est habilité à accéder au panel d'administration.</p>
            <a href="/">← Retour au blog</a>
          </div>
        </body>
        </html>
      `);
    }

    const avatarUrl = discordUser.avatar
      ? `https:

      : null;

    const userRecord = userService.upsert({
      id: discordUser.id,
      username: discordUser.username,
      avatar: avatarUrl,
      role: 'admin'
    });

    req.session.user = {
      id: userRecord.id,
      username: userRecord.username,
      avatar: userRecord.avatar,
      role: 'admin'
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    res.status(500).send('Erreur lors de l\'authentification Discord.');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
