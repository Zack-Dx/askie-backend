FROM node:alpine3.21

# Install required dependencies (including OpenSSL)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install


COPY . .

# Generate Prisma client before starting the app
RUN npx prisma generate

EXPOSE 7777

CMD ["npm", "run", "start"]
