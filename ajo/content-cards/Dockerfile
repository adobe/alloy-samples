# ajo/content-cards/Dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 443

CMD ["npm", "start"]