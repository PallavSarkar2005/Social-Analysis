# syntax=docker/dockerfile:1
# Convenience alias: default image builds the backend API.
# Prefer explicit targets: Dockerfile.backend / Dockerfile.frontend

FROM node:20-bookworm-slim
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
