FROM node:alpine3.21
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Generate Prisma client before starting the app
RUN npx prisma generate
EXPOSE 7777
CMD [ "npm", "run", "start" ]