# --- Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build react app
FROM deps AS builder
WORKDIR /app

COPY . .
RUN npm run build

# --- Stage 2: Serve built app via nginx
FROM nginx:stable-alpine AS production

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# --- Stage 3: Development
FROM deps AS development
WORKDIR /app
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]