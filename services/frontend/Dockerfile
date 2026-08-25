# Stage 1: Build React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy files relative to root build context
COPY services/frontend/package*.json ./
RUN npm ci

COPY services/frontend/ ./

# Run build to generate dist/
RUN npm run build

# Stage 2: Serve static build with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration from root of build context
COPY nginx.conf /etc/nginx/nginx.conf

# Copy React build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
