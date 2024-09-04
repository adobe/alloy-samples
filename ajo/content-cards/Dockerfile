# ajo/content-cards/Dockerfile
FROM node:18

ARG BASE_PATH
ARG APP_DOMAIN

ENV BASE_PATH=$BASE_PATH
ENV APP_DOMAIN=$APP_DOMAIN

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 443

CMD ["npm", "start"]