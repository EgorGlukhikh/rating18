# 🛠 Детальный технологический стек

## Рекомендуемая конфигурация для продакшена

### Сервер
- **VPS**: 2+ CPU cores, 4GB+ RAM, 40GB+ SSD
- **ОС**: Ubuntu 22.04 LTS
- **Локация**: Россия (для низкой задержки)

### Frontend Stack

#### Базовый уровень (рекомендуется для старта)
```
├── HTML5
├── CSS3 + Bootstrap 5.3
├── Vanilla JavaScript (ES6+)
└── Библиотеки:
    ├── Bootstrap Icons
    ├── Chart.js (графики)
    └── Axios (HTTP клиент)
```

**Плюсы**: Быстрая разработка, простота, низкий порог входа
**Минусы**: Меньше структуры при росте проекта

#### Продвинутый уровень (для масштабирования)
```
├── Vue.js 3 / React 18
├── TypeScript
├── Vite (bundler)
├── Tailwind CSS
└── Библиотеки:
    ├── Vue Router / React Router
    ├── Pinia / Redux Toolkit
    ├── VeeValidate / Formik
    └── Vue Chart.js / Recharts
```

**Плюсы**: Масштабируемость, типобезопасность, большая экосистема
**Минусы**: Более сложная настройка, дольше старт

### Backend Stack

#### Node.js + Express
```javascript
// Основные пакеты
{
  "dependencies": {
    "express": "^4.18.2",           // Веб-фреймворк
    "pg": "^8.11.0",                 // PostgreSQL клиент
    "pg-hstore": "^2.3.4",          // PostgreSQL типы
    "sequelize": "^6.32.1",          // ORM
    "passport": "^0.6.0",            // Авторизация
    "passport-oauth2": "^1.7.0",    // OAuth2 стратегия
    "jsonwebtoken": "^9.0.1",        // JWT токены
    "bcrypt": "^5.1.0",              // Хеширование
    "helmet": "^7.0.0",              // Security headers
    "cors": "^2.8.5",                // CORS
    "express-rate-limit": "^6.9.0",  // Rate limiting
    "dotenv": "^16.3.1",             // Env переменные
    "joi": "^17.9.2",                // Валидация
    "redis": "^4.6.7",               // Кэш
    "winston": "^3.10.0"             // Логирование
  }
}
```

#### База данных - PostgreSQL 14+

**Почему PostgreSQL?**
- ✅ ACID транзакции (важно для голосования)
- ✅ Уникальные индексы (один голос от пользователя)
- ✅ JSON поддержка (гибкие данные)
- ✅ Отличная производительность
- ✅ Открытый исходный код

**Альтернативы**:
- MySQL/MariaDB - проще, но меньше возможностей
- MongoDB - быстрее для чтения, но сложнее гарантировать целостность

#### Кэширование - Redis

**Что кэшировать**:
- Список топ-100 кандидатов (обновление раз в 5 минут)
- Количество голосов (обновление в реальном времени через pub/sub)
- Сессии пользователей
- Rate limiting счетчики

### Авторизация - Sber ID (OAuth 2.0)

```javascript
// Примерная настройка Passport
const OAuth2Strategy = require('passport-oauth2');

passport.use('sber', new OAuth2Strategy({
    authorizationURL: 'https://online.sberbank.ru/CSAFront/oidc/authorize',
    tokenURL: 'https://online.sberbank.ru/CSAFront/oidc/token',
    clientID: process.env.SBER_CLIENT_ID,
    clientSecret: process.env.SBER_CLIENT_SECRET,
    callbackURL: process.env.SBER_REDIRECT_URI
  },
  function(accessToken, refreshToken, profile, cb) {
    // Создание/обновление пользователя
    return cb(null, profile);
  }
));
```

### DevOps & Deployment

#### Nginx конфигурация
```nginx
server {
    listen 80;
    server_name yourdomain.ru www.yourdomain.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.ru www.yourdomain.ru;

    ssl_certificate /etc/letsencrypt/live/yourdomain.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.ru/privkey.pem;

    # Frontend статика
    location / {
        root /var/www/rating/frontend;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Admin панель
    location /admin {
        root /var/www/rating/frontend;
        try_files $uri /admin.html;
        # Дополнительная защита (IP whitelist)
        # allow 123.123.123.123;
        # deny all;
    }
}
```

#### PM2 конфигурация
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rating-api',
    script: './src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

### Мониторинг и логирование

```javascript
// Winston logger настройка
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// В production добавить:
// - Sentry (мониторинг ошибок)
// - Grafana + Prometheus (метрики)
```

### Безопасность

#### 1. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 голосов в минуту
  message: 'Слишком много голосов, попробуйте позже'
});

app.post('/api/votes', voteLimiter, voteHandler);
```

#### 2. Helmet.js
```javascript
const helmet = require('helmet');
app.use(helmet());
```

#### 3. CORS
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://yourdomain.ru'],
  credentials: true
}));
```

#### 4. Input Validation
```javascript
const Joi = require('joi');

const nominateSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).required(),
  category: Joi.string().valid('Образование', 'Культура', 'Спорт', 'Бизнес', 'Благотворительность', 'Экология').required(),
  description: Joi.string().min(50).max(1000).required()
});
```

### Производительность

#### Индексы PostgreSQL
```sql
-- Индекс для быстрого поиска голосов
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Уникальный индекс (защита от дублей)
CREATE UNIQUE INDEX idx_votes_unique ON votes(user_id, candidate_id);

-- Индекс для подсчета голосов
CREATE INDEX idx_candidates_status ON candidates(status);
```

#### Database Query Optimization
```javascript
// ❌ N+1 проблема
const candidates = await Candidate.findAll();
for (let c of candidates) {
  c.votes = await Vote.count({ where: { candidate_id: c.id } });
}

// ✅ Один запрос с JOIN
const candidates = await Candidate.findAll({
  attributes: [
    'id', 'full_name', 'description', 'category',
    [sequelize.fn('COUNT', sequelize.col('votes.id')), 'vote_count']
  ],
  include: [{
    model: Vote,
    attributes: []
  }],
  group: ['Candidate.id'],
  order: [[sequelize.literal('vote_count'), 'DESC']]
});
```

### Бэкап и восстановление

```bash
#!/bin/bash
# Автоматический бэкап БД (cron: 0 2 * * *)

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/rating"
DB_NAME="rating_db"

# Бэкап PostgreSQL
pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/rating/uploads
```

### Стоимость инфраструктуры (примерно)

**Минимальная конфигурация** (~1500₽/мес):
- VPS 2GB RAM: 500₽
- Домен .ru: 200₽/год
- SSL сертификат: бесплатно (Let's Encrypt)

**Рекомендуемая** (~3500₽/мес):
- VPS 4GB RAM: 1000₽
- Managed PostgreSQL: 1500₽
- CDN (если нужно): 500₽
- Бэкапы: 300₽
- Мониторинг: 200₽

**Провайдеры VPS в России**:
- Timeweb
- Beget
- Selectel
- VK Cloud (бывший Mail.ru Cloud)

---

## Рекомендации по выбору стека

### Для быстрого MVP (1-2 недели):
✅ Vanilla JS + Bootstrap + Node.js + PostgreSQL

### Для долгосрочного проекта (1-2 месяца):
✅ Vue 3/React + TypeScript + Node.js + PostgreSQL + Redis

### Команда:
- 1 Fullstack разработчик (может все сам)
- ИЛИ 1 Frontend + 1 Backend + 1 DevOps (оптимально)
