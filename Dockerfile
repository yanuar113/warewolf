FROM node:22-alpine

WORKDIR /app

# Copy dependency definitions and lockfile for deterministic caching
COPY package.json package-lock.json ./

# Install exact dependencies using npm ci from lockfile
RUN npm ci

# Copy project source code (includes public/, src/assets/, images)
COPY . .

# Ensure persistent upload & public asset directories exist
RUN mkdir -p uploads public/assets/images

# Build frontend production bundle (Vite outputs to dist/)
RUN npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Port yang dibuka
EXPOSE 3000

# Start server fullstack (Express + Vite static assets)
CMD ["npm", "start"]
