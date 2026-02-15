FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["node", "backend/src/app.js"]
