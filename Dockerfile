FROM node:20 AS builder 
 
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

FROM node:bullseye-slim

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000

CMD ["node", "app.js"]
