const crypto = require('node:crypto');

function buildDataCheckString(payload) {
  return Object.keys(payload)
    .filter((key) => key !== 'hash' && payload[key] !== undefined && payload[key] !== null)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n');
}

function safeEqualHex(a, b) {
  try {
    const aBuf = Buffer.from(String(a || ''), 'hex');
    const bBuf = Buffer.from(String(b || ''), 'hex');
    if (aBuf.length !== bBuf.length || aBuf.length === 0) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (_) {
    return false;
  }
}

function verifyTelegramAuthPayload(payload, botToken, maxAgeSec = 86400) {
  if (!botToken) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  const hash = String(payload.hash || '').trim();
  if (!hash) {
    return { ok: false, reason: 'Missing hash' };
  }

  const authDate = Number(payload.auth_date || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!authDate || Math.abs(nowSec - authDate) > maxAgeSec) {
    return { ok: false, reason: 'Telegram auth data is expired' };
  }

  const dataCheckString = buildDataCheckString(payload);
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!safeEqualHex(checkHash, hash)) {
    return { ok: false, reason: 'Invalid Telegram signature' };
  }

  return { ok: true };
}

module.exports = {
  verifyTelegramAuthPayload
};
