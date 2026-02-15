const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function ensureUsersFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch (_) {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  }
}

async function readUsers() {
  await ensureUsersFile();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function writeUsers(users) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function parseAdminTelegramIds() {
  return String(process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isAdminTelegramId(telegramId) {
  const adminIds = parseAdminTelegramIds();
  return adminIds.includes(String(telegramId));
}

function buildDisplayName(payload) {
  const first = String(payload.first_name || '').trim();
  const last = String(payload.last_name || '').trim();
  const joined = `${first} ${last}`.trim();
  if (joined) return joined;
  if (payload.username) return `@${payload.username}`;
  return `Пользователь ${payload.id}`;
}

async function upsertTelegramUser(payload) {
  const users = await readUsers();
  const telegramId = String(payload.id);
  const now = new Date().toISOString();

  const idx = users.findIndex((u) => String(u.telegram_id) === telegramId);
  const baseUser = {
    id: `tg_${telegramId}`,
    telegram_id: telegramId,
    provider: 'telegram',
    username: payload.username || '',
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    full_name: buildDisplayName(payload),
    photo_url: payload.photo_url || '',
    role: isAdminTelegramId(telegramId) ? 'admin' : 'user',
    updated_at: now
  };

  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      ...baseUser,
      created_at: users[idx].created_at || now,
      last_login_at: now
    };
    await writeUsers(users);
    return users[idx];
  }

  const created = {
    ...baseUser,
    created_at: now,
    last_login_at: now
  };
  users.push(created);
  await writeUsers(users);
  return created;
}

async function getUserById(userId) {
  const users = await readUsers();
  return users.find((u) => String(u.id) === String(userId)) || null;
}

module.exports = {
  readUsers,
  writeUsers,
  upsertTelegramUser,
  getUserById
};
