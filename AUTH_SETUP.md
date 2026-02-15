# 🔐 Настройка системы авторизации

## Обзор методов авторизации

Платформа поддерживает 3 способа входа:

1. **Telegram** - OAuth через Telegram Login Widget
2. **MAX** - OAuth через платежную систему MAX
3. **Email** - Классическая регистрация с email и паролем

---

## 1️⃣ Telegram авторизация

### Создание Telegram Bot

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте команду `/newbot`
3. Введите имя бота: `Народный Рейтинг Удмуртии Bot`
4. Введите username: `udmurt_rating_bot` (или любой доступный)
5. Получите **Bot Token** (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Настройка домена

```bash
# Отправьте команду BotFather
/setdomain

# Выберите вашего бота
# Введите домен
https://yourdomain.ru
```

### Frontend интеграция

Добавьте в `<head>` вашего index.html:

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"></script>
```

Обновите функцию `loginWithTelegram()`:

```javascript
function loginWithTelegram() {
    // Опция 1: Popup окно (рекомендуется)
    const width = 550;
    const height = 470;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    window.open(
        `https://oauth.telegram.org/auth?bot_id=YOUR_BOT_ID&origin=${encodeURIComponent(window.location.origin)}&return_to=${encodeURIComponent(window.location.href)}`,
        'telegram-login',
        `width=${width},height=${height},left=${left},top=${top}`
    );
}

// Опция 2: Widget кнопка (альтернатива)
// Вместо кнопки используйте виджет:
<script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login="udmurt_rating_bot"
        data-size="large"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write">
</script>
```

### Backend обработка

```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Проверка подлинности данных от Telegram
function verifyTelegramAuth(data, botToken) {
    const secret = crypto.createHash('sha256')
        .update(botToken)
        .digest();

    const checkString = Object.keys(data)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');

    const hash = crypto
        .createHmac('sha256', secret)
        .update(checkString)
        .digest('hex');

    return hash === data.hash;
}

router.post('/auth/telegram/callback', async (req, res) => {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;

    // Проверка подлинности
    if (!verifyTelegramAuth(req.body, process.env.TELEGRAM_BOT_TOKEN)) {
        return res.status(401).json({
            success: false,
            message: 'Недействительная авторизация'
        });
    }

    // Проверка актуальности (не старше 1 часа)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - auth_date > 3600) {
        return res.status(401).json({
            success: false,
            message: 'Токен истек'
        });
    }

    try {
        // Найти или создать пользователя
        let user = await User.findOne({
            where: { telegram_id: id.toString() }
        });

        if (!user) {
            user = await User.create({
                telegram_id: id.toString(),
                full_name: `${first_name} ${last_name || ''}`.trim(),
                username: username,
                photo_url: photo_url,
                auth_provider: 'telegram'
            });
        } else {
            // Обновить данные профиля
            await user.update({
                full_name: `${first_name} ${last_name || ''}`.trim(),
                username: username,
                photo_url: photo_url
            });
        }

        // Создать JWT токен
        const token = jwt.sign(
            { userId: user.id, provider: 'telegram' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                full_name: user.full_name,
                photo_url: user.photo_url
            }
        });
    } catch (error) {
        console.error('Telegram auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

module.exports = router;
```

### Переменные окружения (.env)

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_ID=123456789
```

---

## 2️⃣ MAX авторизация

### Регистрация в MAX API

MAX (платежная система) предоставляет OAuth 2.0 авторизацию.

**Важно**: На момент написания документации публичное API MAX может быть недоступно. Необходимо:

1. Связаться с технической поддержкой MAX
2. Запросить доступ к OAuth API
3. Получить `client_id` и `client_secret`

### Альтернативный вариант

Если API MAX недоступен, рекомендуется использовать:
- **Госуслуги** (ЕСИА) - официальная государственная система
- **VK ID** - популярная российская платформа

### Настройка MAX OAuth (когда API доступен)

```javascript
// routes/auth.js
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');

passport.use('max', new OAuth2Strategy({
    authorizationURL: 'https://id.max.ru/oauth/authorize',
    tokenURL: 'https://id.max.ru/oauth/token',
    clientID: process.env.MAX_CLIENT_ID,
    clientSecret: process.env.MAX_CLIENT_SECRET,
    callbackURL: process.env.MAX_REDIRECT_URI,
    scope: ['profile', 'email']
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      // Получить данные пользователя
      const response = await fetch('https://id.max.ru/api/user', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await response.json();

      // Найти или создать пользователя
      let user = await User.findOne({
        where: { max_id: userData.id }
      });

      if (!user) {
        user = await User.create({
          max_id: userData.id,
          full_name: userData.name,
          email: userData.email,
          phone: userData.phone,
          auth_provider: 'max'
        });
      }

      return cb(null, user);
    } catch (error) {
      return cb(error);
    }
  }
));

// Маршруты
router.get('/auth/max',
  passport.authenticate('max')
);

router.get('/auth/max/callback',
  passport.authenticate('max', { session: false }),
  (req, res) => {
    // Создать JWT токен
    const token = jwt.sign(
      { userId: req.user.id, provider: 'max' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Перенаправить на фронтенд с токеном
    res.redirect(`/?token=${token}`);
  }
);
```

### Frontend

```javascript
function loginWithMAX() {
    window.location.href = '/api/auth/max';
}
```

### Переменные окружения

```env
MAX_CLIENT_ID=your_max_client_id
MAX_CLIENT_SECRET=your_max_client_secret
MAX_REDIRECT_URI=https://yourdomain.ru/api/auth/max/callback
```

---

## 3️⃣ Email регистрация

### Backend реализация

```javascript
// routes/auth.js
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Настройка email транспорта
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Регистрация
router.post('/auth/register',
  [
    body('full_name').trim().isLength({ min: 3, max: 255 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage('Пароль должен содержать буквы и цифры'),
    body('phone').optional().isMobilePhone('ru-RU')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { full_name, email, password, phone } = req.body;

    try {
      // Проверка существования email
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email уже зарегистрирован'
        });
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(password, 10);

      // Создание токена подтверждения
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Создание пользователя
      const user = await User.create({
        full_name,
        email,
        password_hash: passwordHash,
        phone,
        verification_token: verificationToken,
        auth_provider: 'email',
        email_verified: false
      });

      // Отправка email подтверждения
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      await emailTransport.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Подтверждение регистрации - Народный Рейтинг Удмуртии',
        html: `
          <h2>Добро пожаловать!</h2>
          <p>Здравствуйте, ${full_name}!</p>
          <p>Для завершения регистрации подтвердите ваш email:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 30px; background: #009639; color: white; text-decoration: none; border-radius: 5px;">
            Подтвердить email
          </a>
          <p>Или перейдите по ссылке: ${verificationUrl}</p>
          <p>Ссылка действительна 24 часа.</p>
        `
      });

      res.status(201).json({
        success: true,
        message: 'Регистрация успешна. Проверьте email для подтверждения.'
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка регистрации'
      });
    }
  }
);

// Подтверждение email
router.get('/auth/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      where: { verification_token: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Недействительный токен'
      });
    }

    // Проверка срока действия (24 часа)
    const tokenAge = Date.now() - user.created_at.getTime();
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'Токен истек'
      });
    }

    await user.update({
      email_verified: true,
      verification_token: null
    });

    res.json({
      success: true,
      message: 'Email успешно подтвержден'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка подтверждения'
    });
  }
});

// Вход
router.post('/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      // Проверка пароля
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      // Проверка подтверждения email
      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          message: 'Email не подтвержден. Проверьте почту.'
        });
      }

      // Создание JWT токена
      const token = jwt.sign(
        { userId: user.id, provider: 'email' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Обновление последнего входа
      await user.update({ last_login_at: new Date() });

      res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка входа'
      });
    }
  }
);

// Восстановление пароля
router.post('/auth/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Не раскрываем существование email
        return res.json({
          success: true,
          message: 'Если email существует, письмо отправлено'
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 час

      await user.update({
        reset_token: resetToken,
        reset_token_expires: resetExpires
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await emailTransport.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Восстановление пароля - Народный Рейтинг Удмуртии',
        html: `
          <h2>Восстановление пароля</h2>
          <p>Вы запросили сброс пароля.</p>
          <a href="${resetUrl}">Сбросить пароль</a>
          <p>Ссылка действительна 1 час.</p>
          <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
        `
      });

      res.json({
        success: true,
        message: 'Если email существует, письмо отправлено'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера'
      });
    }
  }
);
```

### Переменные окружения

```env
# Email настройки
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.ru
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="Народный Рейтинг Удмуртии <noreply@yourdomain.ru>"

# JWT
JWT_SECRET=your_very_long_random_secret_key_here

# Frontend URL
FRONTEND_URL=https://yourdomain.ru
```

---

## Обновленная схема БД

```sql
-- Добавить поля для новых провайдеров
ALTER TABLE users ADD COLUMN telegram_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN max_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN username VARCHAR(255);
ALTER TABLE users ADD COLUMN photo_url TEXT;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';

-- Индексы
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_max ON users(max_id);
CREATE INDEX idx_users_verification ON users(verification_token);
CREATE INDEX idx_users_reset ON users(reset_token);
```

---

## Frontend интеграция

Обновите функцию `handleEmailAuth`:

```javascript
async function handleEmailAuth(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Сохранить токен
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            alert('Вход выполнен успешно!');
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();

            // Обновить UI
            updateUserInterface(result.user);
            window.location.reload();
        } else {
            alert(result.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Валидация паролей
    const password = e.target.querySelector('input[type="password"]').value;
    const passwordConfirm = e.target.querySelectorAll('input[type="password"]')[1].value;

    if (password !== passwordConfirm) {
        alert('Пароли не совпадают!');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert('Регистрация успешна! Проверьте email для подтверждения.');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        } else {
            alert(result.message || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Ошибка соединения с сервером');
    }
}
```

---

## Тестирование

### Локальное тестирование

1. **Telegram**: Используйте тестовый режим BotFather
2. **Email**: Используйте [Mailtrap.io](https://mailtrap.io) для перехвата писем
3. **MAX**: Требуется песочница от MAX (если доступна)

### Тестовые переменные (.env.test)

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
```

---

## Безопасность

✅ **Обязательно реализовать**:
- Rate limiting (максимум 5 попыток входа за 15 минут)
- HTTPS (обязательно!)
- CSRF защита
- XSS защита (escape user input)
- SQL injection защита (используйте ORM)
- Secure cookies для токенов
- Email подтверждение
- Двухфакторная аутентификация (опционально, для админов)

---

## Готово! 🎉

После настройки всех трех методов авторизации ваша платформа будет готова к использованию.
