FROM node:alpine3.21
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 7777
CMD [ "npm", "run", "start" ]