# rating18

Народный Рейтинг Удмуртии.

## Локальный запуск (статический)

Откройте `index.html` в браузере.

## Сборка для Docker

```bash
npm ci
npm run build
```

После сборки файлы лежат в `build/`.

## Docker

```bash
docker build -t rating18:latest .
docker run -p 8080:80 rating18:latest
```

## Деплой в Dockerhosting через Git

1. Привяжите репозиторий `https://github.com/EgorGlukhikh/rating18`.
2. Укажите путь к `Dockerfile` в корне.
3. Публикуйте контейнер на порту `80`.
