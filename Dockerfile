
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies dari lockfile
COPY package.json package-lock.json ./
RUN npm ci --include=optional

# Copy source code, termasuk aset gambar
COPY . .

# Pastikan direktori tersedia
RUN mkdir -p uploads public/assets/images

# Build aplikasi
RUN npm run build

# Konfigurasi aplikasi
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
