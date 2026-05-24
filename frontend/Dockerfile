FROM node:20-alpine AS build

RUN corepack enable

WORKDIR /app

ARG API_DOMAIN=/api
ENV API_DOMAIN=$API_DOMAIN

COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn install --immutable

COPY . .

RUN yarn build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
