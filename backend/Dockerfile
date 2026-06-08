FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p src/uploads src/uploads/documents logs
EXPOSE 3000
CMD ["npm", "run", "dev"]
