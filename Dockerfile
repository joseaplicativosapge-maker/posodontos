FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

CMD npx prisma generate && npx prisma migrate deploy && npm run server