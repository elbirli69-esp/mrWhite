FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm install --omit=dev

WORKDIR /app
COPY shared ./shared
COPY server ./server

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]
