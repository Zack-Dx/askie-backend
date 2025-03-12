FROM node:alpine3.21

# Install required dependencies (including OpenSSL for Prisma to Connect)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 7777

CMD ["npm", "run", "start"]
