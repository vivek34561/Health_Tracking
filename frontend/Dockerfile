# Stage 1: Build the Angular application
FROM node:22-alpine AS build

# Set the working directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build the Angular application for production
RUN npm run build -- --configuration=production

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the compiled static assets from the build stage
# Angular @angular/build outputs assets in dist/frontend/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copy the custom Nginx routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
