import { Router } from 'express';
import crypto from 'crypto';
import { userService } from '../services/user.service.js';

const router = Router();

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

    const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    const isSuperAdmin = adminIds.includes(discordUser.id);

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    // Enregistre ou met à jour l'utilisateur en BDD
    const userRecord = userService.upsert({
      id: discordUser.id,
      username: discordUser.username,
      avatar: avatarUrl,
      role: isSuperAdmin ? 'admin' : undefined
    });

    req.session.user = {
      id: userRecord.id,
      username: userRecord.username,
      avatar: userRecord.avatar,
      role: userRecord.role
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
