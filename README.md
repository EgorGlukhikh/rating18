# 🏆 Народный Рейтинг Удмуртии

Независимая платформа для признания людей, которые делают вклад в развитие Удмуртской Республики.

## 📋 Основные возможности

### Для пользователей:
- ✅ **Множественные способы входа**: Telegram, MAX, Email
- ✅ Просмотр рейтинга по категориям
- ✅ Голосование за кандидатов (1 голос от пользователя на кандидата)
- ✅ Предложение новых кандидатов
- ✅ Фильтрация по 6 категориям
- ✅ Адаптивный дизайн для всех устройств

### Для администраторов:
- ✅ Модерация предложенных кандидатов
- ✅ Управление пользователями
- ✅ Просмотр статистики
- ✅ Управление категориями
- ✅ Блокировка нарушителей

## 🎯 Категории

1. **Образование** - педагоги, ученые, просветители
2. **Культура** - деятели искусства, хранители традиций
3. **Спорт** - тренеры, спортсмены, организаторы
4. **Бизнес** - предприниматели, создающие рабочие места
5. **Благотворительность** - волонтеры, организаторы акций
6. **Экология** - защитники природы, эко-активисты

## 🛠 Технологический стек

### Frontend
- **HTML5, CSS3, JavaScript**
- **Bootstrap 5** - UI framework
- **Alpine.js** / **Vue.js** - реактивность (на выбор)
- **Chart.js** - графики и визуализация
- **Axios** - HTTP запросы

### Backend
- **Node.js 18+**
- **Express.js** - веб-фреймворк
- **PostgreSQL 14+** - основная БД
- **Redis** - кэширование и сессии
- **Passport.js** - авторизация
- **JWT** - токены доступа

### DevOps
- **Nginx** - reverse proxy + статика
- **PM2** - process manager
- **Docker** - контейнеризация (опционально)
- **Certbot** - SSL сертификаты
- **Git** - версионирование

## 📁 Структура проекта

```
rating/
├── frontend/
│   ├── index.html              # Главная страница
│   ├── admin.html              # Админ-панель
│   ├── css/
│   │   └── styles.css          # Кастомные стили
│   ├── js/
│   │   ├── app.js              # Основная логика
│   │   ├── auth.js             # Авторизация
│   │   └── api.js              # API клиент
│   └── assets/
│       └── images/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # Настройки БД
│   │   │   └── sber-id.js      # Настройки Sber ID
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Candidate.js
│   │   │   └── Vote.js
│   │   ├── routes/
│   │   │   ├── auth.js         # Авторизация
│   │   │   ├── candidates.js   # Кандидаты
│   │   │   ├── votes.js        # Голосование
│   │   │   └── admin.js        # Админка
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── admin.js
│   │   └── app.js              # Главный файл
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema.sql              # Схема БД
│   └── seeds.sql               # Тестовые данные
│
├── deploy/
│   ├── nginx.conf              # Конфиг Nginx
│   └── ecosystem.config.js     # Конфиг PM2
│
└── README.md
```

## 🗄️ Схема базы данных

### Таблица `users`
```sql
- id (UUID, PK)
- sber_id (VARCHAR, UNIQUE)
- email (VARCHAR)
- full_name (VARCHAR)
- created_at (TIMESTAMP)
- is_blocked (BOOLEAN)
```

### Таблица `candidates`
```sql
- id (UUID, PK)
- full_name (VARCHAR)
- description (TEXT)
- category (VARCHAR)
- photo_url (VARCHAR)
- nominated_by (UUID, FK -> users.id)
- status (ENUM: pending, approved, rejected)
- created_at (TIMESTAMP)
- approved_at (TIMESTAMP)
```

### Таблица `votes`
```sql
- id (UUID, PK)
- user_id (UUID, FK -> users.id)
- candidate_id (UUID, FK -> candidates.id)
- created_at (TIMESTAMP)
- UNIQUE (user_id, candidate_id)
```

### Таблица `admins`
```sql
- id (UUID, PK)
- user_id (UUID, FK -> users.id)
- permissions (JSONB)
- created_at (TIMESTAMP)
```

## 🔐 Система авторизации

Платформа поддерживает 3 способа входа:

### 1. Telegram Login Widget
- Быстрая OAuth авторизация через Telegram
- Не требует ввода паролей
- Автоматическая синхронизация профиля

### 2. MAX (платежная система)
- OAuth через российскую платежную систему
- Верификация через финансовый сервис

### 3. Email/Password
- Классическая регистрация
- Подтверждение через email
- Восстановление пароля

**Полная документация**: См. [AUTH_SETUP.md](AUTH_SETUP.md)

### Переменные окружения:
```env
# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_ID=123456789

# MAX
MAX_CLIENT_ID=your_max_client_id
MAX_CLIENT_SECRET=your_max_client_secret

# Email/SMTP
SMTP_HOST=smtp.yandex.ru
SMTP_USER=noreply@yourdomain.ru
SMTP_PASSWORD=your_smtp_password

# JWT
JWT_SECRET=your_very_long_random_secret_key
```

## 🚀 Установка и запуск

### Локальная разработка:

```bash
# 1. Клонируем проект
git clone <repo-url>
cd rating

# 2. Backend
cd backend
npm install
cp .env.example .env
# Заполняем .env

# 3. База данных
psql -U postgres -f ../database/schema.sql
psql -U postgres -f ../database/seeds.sql

# 4. Запуск
npm run dev
```

### Деплой на сервер:

```bash
# 1. Подготовка сервера
sudo apt update
sudo apt install nginx postgresql redis nodejs npm

# 2. Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rating
sudo ln -s /etc/nginx/sites-available/rating /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. PM2
npm install -g pm2
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup

# 4. SSL
sudo certbot --nginx -d yourdomain.ru
```

## 📊 API Endpoints

### Публичные:
- `GET /api/candidates` - Список кандидатов
- `GET /api/candidates/:id` - Информация о кандидате
- `GET /api/stats` - Статистика платформы

### Авторизованные:
- `POST /api/votes` - Проголосовать
- `POST /api/candidates/nominate` - Предложить кандидата
- `GET /api/user/votes` - Мои голоса

### Админские:
- `GET /api/admin/candidates/pending` - На модерации
- `POST /api/admin/candidates/:id/approve` - Одобрить
- `POST /api/admin/candidates/:id/reject` - Отклонить
- `GET /api/admin/users` - Пользователи
- `POST /api/admin/users/:id/block` - Заблокировать

## 🔒 Безопасность

1. **Rate Limiting** - ограничение запросов
2. **CSRF Protection** - защита от CSRF
3. **SQL Injection** - параметризованные запросы
4. **XSS Protection** - санитизация входных данных
5. **HTTPS Only** - только защищенное соединение
6. **Helmet.js** - security headers

## 📈 Будущие улучшения

- [ ] Интеграция с соцсетями (VK, Telegram)
- [ ] Push-уведомления
- [ ] Мобильное приложение
- [ ] Система достижений
- [ ] Экспорт в PDF/Excel
- [ ] Аналитика и дашборды
- [ ] Многоязычность (удмуртский, русский)

## 📞 Контакты

Для вопросов и предложений: admin@yourdomain.ru

---

**© 2026 Народный Рейтинг Удмуртии**
