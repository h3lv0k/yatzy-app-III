FROM node:20-alpine

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY server/package*.json ./
RUN npm install

# Copy source and compile TypeScript
COPY server/ .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 8000

CMD ["node", "dist/index.js"]
