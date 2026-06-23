# Use Node.js LTS version on Alpine Linux
FROM node:20-alpine

# Set target directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install clean production dependencies
RUN npm ci --omit=dev

# Copy the rest of the backend files
COPY . .

# Expose the API port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
