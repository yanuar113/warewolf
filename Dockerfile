FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Port yang dibuka
EXPOSE 3000

# Start server fullstack (Express + Vite static assets)
CMD ["npm", "start"]
