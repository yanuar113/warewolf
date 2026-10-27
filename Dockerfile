FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install -g npm@10.9.2
RUN npm install --legacy-peer-deps --no-audit --no-fund

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
