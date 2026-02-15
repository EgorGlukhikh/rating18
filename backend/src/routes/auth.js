const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyTelegramAuthPayload } = require('../lib/telegram');
const { upsertTelegramUser, getUserById } = require('../lib/store');

const router = express.Router();
const TOKEN_COOKIE = 'rating_auth_token';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev_only_change_me_please_1234567890';
}

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.full_name,
      role: user.role,
      tg: user.telegram_id
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

function extractAuthToken(req) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    return String(req.cookies[TOKEN_COOKIE]);
  }
  return '';
}

function getHostOrigin(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const forwardedHost = String(req.get('x-forwarded-host') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  return `${protocol}://${host}`;
}

function resolveReturnUrl(req, value) {
  const hostOrigin = getHostOrigin(req);
  const fallbackRaw = process.env.FRONTEND_URL || hostOrigin;

  let fallback;
  try {
    fallback = new URL(fallbackRaw, hostOrigin);
  } catch (_) {
    fallback = new URL(hostOrigin);
  }

  if (!value) return fallback;

  try {
    const requested = new URL(value, hostOrigin);
    const allowedOrigins = new Set([hostOrigin, fallback.origin]);
    if (!allowedOrigins.has(requested.origin)) return fallback;
    return requested;
  } catch (_) {
    return fallback;
  }
}

function mapTelegramPayload(input) {
  return {
    id: input.id,
    first_name: input.first_name,
    last_name: input.last_name,
    username: input.username,
    photo_url: input.photo_url,
    auth_date: input.auth_date,
    hash: input.hash
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    photo_url: user.photo_url,
    role: user.role,
    provider: user.provider
  };
}

function normalizeBotUsername(input) {
  return String(input || '').trim().replace(/^@+/, '');
}

function isValidBotUsername(username) {
  return /^[a-zA-Z0-9_]{5,}$/.test(username);
}

router.get('/telegram/config', (req, res) => {
  res.json({
    success: true,
    botUsername: normalizeBotUsername(process.env.TELEGRAM_BOT_USERNAME || '')
  });
});

router.get('/telegram/start', (req, res) => {
  const botUsername = normalizeBotUsername(process.env.TELEGRAM_BOT_USERNAME || '');
  if (!botUsername) {
    return res.status(500).send('TELEGRAM_BOT_USERNAME is not configured on server');
  }
  if (!isValidBotUsername(botUsername)) {
    return res.status(500).send('TELEGRAM_BOT_USERNAME format is invalid');
  }

  const returnTo = req.query.returnTo ? String(req.query.returnTo) : '';
  const callbackBase = process.env.FRONTEND_URL || getHostOrigin(req);
  const callbackUrl = new URL('/api/auth/telegram/callback', callbackBase);
  if (returnTo) callbackUrl.searchParams.set('returnTo', returnTo);

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Вход через Telegram</title>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#f5efe4; margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; color:#2c2845; }
    .card { background:#fff; border-radius:14px; padding:28px; max-width:420px; box-shadow:0 10px 24px rgba(0,0,0,0.08); text-align:center; }
    .muted { color:#6c757d; font-size:14px; margin-top:10px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Вход через Telegram</h2>
    <p class="muted">Нажмите кнопку Telegram ниже, чтобы продолжить авторизацию.</p>
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="${botUsername}"
      data-size="large"
      data-radius="8"
      data-request-access="write"
      data-auth-url="${callbackUrl.toString()}">
    </script>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

router.get('/telegram/callback', async (req, res) => {
  const payload = mapTelegramPayload(req.query || {});
  const verification = verifyTelegramAuthPayload(payload, process.env.TELEGRAM_BOT_TOKEN, Number(process.env.TELEGRAM_MAX_AUTH_AGE_SEC || 86400));

  const returnUrl = resolveReturnUrl(req, req.query.returnTo);

  if (!verification.ok) {
    returnUrl.searchParams.set('tg_error', verification.reason);
    return res.redirect(returnUrl.toString());
  }

  const user = await upsertTelegramUser(payload);
  const token = signUserToken(user);

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  returnUrl.searchParams.set('tg_token', token);
  return res.redirect(returnUrl.toString());
});

router.post('/telegram/callback', async (req, res) => {
  const payload = mapTelegramPayload(req.body || {});
  const verification = verifyTelegramAuthPayload(payload, process.env.TELEGRAM_BOT_TOKEN, Number(process.env.TELEGRAM_MAX_AUTH_AGE_SEC || 86400));

  if (!verification.ok) {
    return res.status(401).json({ success: false, message: verification.reason });
  }

  const user = await upsertTelegramUser(payload);
  const token = signUserToken(user);

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  return res.json({ success: true, token, user: sanitizeUser(user) });
});

router.get('/me', async (req, res) => {
  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (_) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, { sameSite: 'lax' });
  res.json({ success: true });
});

module.exports = router;
