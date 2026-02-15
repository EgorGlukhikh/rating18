# 🚀 Деплой на SprintHost.ru

Пошаговая инструкция по размещению платформы "Народный Рейтинг Удмуртии" на бесплатном хостинге SprintHost.

---

## ✅ Что у вас есть

**Готовые файлы:**
- ✅ `index.html` - полностью рабочий интерфейс
- ✅ Встроенные стили (CSS в `<style>`)
- ✅ Встроенный JavaScript
- ✅ Все ссылки на CDN (Bootstrap, Google Fonts)

**Особенность:** Это SPA (Single Page Application) с фронтендом, но без реального backend. Для полноценной работы потребуется backend (Node.js или PHP).

---

## 📋 Шаг 1: Подготовка файлов

### 1.1 Создайте структуру

```
rating/
├── index.html          ← Главная страница
├── .htaccess          ← Конфигурация Apache
└── api/               ← Заглушки API (опционально)
    └── test.php
```

### 1.2 Создайте .htaccess

Создайте файл `.htaccess` в корневой папке:

```apache
# Включить mod_rewrite
RewriteEngine On

# Force HTTPS (если есть SSL)
# Раскомментируйте когда настроите SSL
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Кэширование статических файлов
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# Gzip сжатие
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>

# Заголовки безопасности
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Роутинг для SPA (все запросы на index.html)
# Раскомментируйте если используете клиентский роутинг
# RewriteCond %{REQUEST_FILENAME} !-f
# RewriteCond %{REQUEST_FILENAME} !-d
# RewriteRule ^(.*)$ index.html [L]

# Блокировка доступа к служебным файлам
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>
```

---

## 🌐 Шаг 2: Регистрация и настройка SprintHost

### 2.1 Регистрация

1. Перейдите на https://sprinthost.ru
2. Выберите "Бесплатный хостинг"
3. Зарегистрируйтесь (укажите email, придумайте пароль)
4. Подтвердите email

### 2.2 Создание сайта

1. Войдите в панель управления
2. Нажмите "Создать сайт"
3. Выберите:
   - **Домен**: поддомен на sprinthost.ru (например `udmurt-rating.sprinthost.ru`)
   - **Язык**: PHP 7.4 или выше
   - **Кодировка**: UTF-8
4. Дождитесь создания (1-5 минут)

### 2.3 Получите FTP доступ

В панели управления найдите:
- **FTP хост**: обычно `ftp.sprinthost.ru` или IP адрес
- **FTP логин**: ваш логин
- **FTP пароль**: ваш пароль
- **Путь**: обычно `/public_html/`

---

## 📤 Шаг 3: Загрузка файлов

### Вариант A: Через FTP-клиент (FileZilla)

1. **Скачайте FileZilla** (https://filezilla-project.org/)

2. **Подключитесь:**
   ```
   Хост: ftp.sprinthost.ru
   Имя пользователя: ваш_логин
   Пароль: ваш_пароль
   Порт: 21
   ```

3. **Загрузите файлы:**
   - Слева: локальные файлы (`d:/rating/`)
   - Справа: удаленный сервер (`/public_html/`)
   - Перетащите `index.html` и `.htaccess` в папку `/public_html/`

### Вариант B: Через Файловый менеджер SprintHost

1. Войдите в панель управления
2. Откройте "Файловый менеджер"
3. Перейдите в `/public_html/`
4. Нажмите "Загрузить файл"
5. Выберите `index.html` с вашего компьютера
6. Создайте файл `.htaccess` через "Новый файл" и скопируйте содержимое

---

## 🎯 Шаг 4: Проверка

### 4.1 Откройте сайт

Перейдите по адресу: `http://ваш-домен.sprinthost.ru`

**Что должно работать:**
- ✅ Страница загружается
- ✅ Дизайн отображается корректно
- ✅ Солярный знак виден в navbar и favicon
- ✅ Кнопки кликабельны
- ✅ Модальные окна открываются

### 4.2 Проверьте консоль браузера

1. Откройте DevTools (F12)
2. Вкладка "Console"
3. **Не должно быть ошибок** (кроме предупреждений о API)

### 4.3 Проверьте мобильную версию

1. DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Проверьте на разных размерах (iPhone, iPad, Desktop)

---

## ⚠️ Ограничения бесплатного хостинга

**Что НЕ будет работать:**
- ❌ Реальная авторизация (Telegram, MAX, Email)
- ❌ Голосование и сохранение в БД
- ❌ Номинирование кандидатов
- ❌ Админ-панель

**Почему:** Для этого нужен backend (Node.js/PHP) и база данных.

**Решение:** Это прототип/демо версия. Для полной версии нужен:
- Платный хостинг с Node.js (или VPS)
- PostgreSQL база данных
- Backend из папки `/backend/`

---

## 🔧 Шаг 5: Настройка backend (опционально для бесплатного хостинга)

### Вариант 1: PHP заглушки (простой способ)

Создайте файл `api/test.php`:

```php
<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Простая проверка работы API
echo json_encode([
    'success' => true,
    'message' => 'API работает!',
    'timestamp' => date('Y-m-d H:i:s')
], JSON_UNESCAPED_UNICODE);
?>
```

Проверка: откройте `http://ваш-домен.sprinthost.ru/api/test.php`

### Вариант 2: Использовать внешний backend

Разместите Node.js backend на:
- **Heroku** (бесплатный tier)
- **Railway** (бесплатный tier)
- **Render** (бесплатный tier)
- **VK Cloud** (пробный период)

Затем обновите в `index.html` API endpoints:

```javascript
// Было:
fetch('/api/auth/login', ...)

// Стало:
fetch('https://your-backend.herokuapp.com/api/auth/login', ...)
```

---

## 🔒 Шаг 6: Настройка SSL (HTTPS)

### 6.1 Бесплатный SSL от SprintHost

1. Панель управления → SSL сертификаты
2. Выберите "Let's Encrypt (бесплатный)"
3. Нажмите "Установить"
4. Дождитесь активации (5-30 минут)

### 6.2 Раскомментируйте в .htaccess

```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 6.3 Обновите ссылки

В `index.html` замените:
```html
<link href="http://cdn..." → <link href="https://cdn..."
```

---

## 📊 Шаг 7: Мониторинг и статистика

### 7.1 Яндекс.Метрика

1. Зарегистрируйтесь на https://metrika.yandex.ru
2. Создайте счетчик
3. Скопируйте код
4. Вставьте в `index.html` перед `</body>`:

```html
<!-- Яндекс.Метрика -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(XXXXXX, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/XXXXXX" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Яндекс.Метрика -->
```

Замените `XXXXXX` на ваш ID счетчика.

---

## 🐛 Решение проблем

### Проблема: Страница не загружается

**Решение:**
1. Проверьте путь файла (должен быть `/public_html/index.html`)
2. Проверьте права доступа (644 для файлов, 755 для папок)
3. Очистите кеш браузера (Ctrl+Shift+Delete)

### Проблема: Стили не применяются

**Решение:**
1. Проверьте консоль браузера (F12)
2. Убедитесь что CDN ссылки работают
3. Проверьте кодировку файла (должна быть UTF-8)

### Проблема: 403 Forbidden

**Решение:**
```bash
# Через FTP клиент установите права:
index.html → 644
.htaccess → 644
папки → 755
```

### Проблема: Модальные окна не открываются

**Решение:**
1. Проверьте что Bootstrap JS загружен
2. Откройте консоль, проверьте ошибки JavaScript
3. Убедитесь что Bootstrap Icons CDN доступен

---

## 📝 Чек-лист деплоя

- [ ] Зарегистрировались на SprintHost
- [ ] Создали сайт и получили FTP доступ
- [ ] Загрузили `index.html`
- [ ] Создали `.htaccess`
- [ ] Проверили сайт в браузере
- [ ] Проверили мобильную версию
- [ ] Настроили SSL (опционально)
- [ ] Добавили Яндекс.Метрику (опционально)
- [ ] Поделились ссылкой!

---

## 🎉 Готово!

Ваш сайт доступен по адресу: `https://ваш-домен.sprinthost.ru`

**Что дальше:**

1. **Соберите обратную связь** от пользователей
2. **Покажите прототип** заказчикам/инвесторам
3. **Планируйте backend** для полной версии
4. **Рассмотрите платный хостинг** когда будет трафик

---

## 💡 Альтернативы SprintHost

Если SprintHost не подходит:

1. **Netlify** (бесплатно, проще)
   - Drag & drop файлов
   - Автоматический SSL
   - CDN по всему миру

2. **GitHub Pages** (бесплатно)
   - Загрузите через Git
   - Автоматический деплой
   - Кастомные домены

3. **Vercel** (бесплатно, для фронтенда)
   - Очень быстрый
   - Превью для каждого коммита
   - Серверless functions

**Для production с backend:**
- VK Cloud (российский, есть бесплатный период)
- Timeweb (от 150₽/мес, хороший support)
- Selectel (российский, надежный)

---

## 📞 Помощь

**Если что-то не получается:**

1. Проверьте документацию SprintHost: https://sprinthost.ru/docs
2. Напишите в поддержку SprintHost (обычно отвечают за 1-24 часа)
3. Проверьте FAQ на форуме: https://forum.sprinthost.ru

**Удачи с деплоем!** 🚀
