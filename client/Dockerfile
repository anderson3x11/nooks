# Construction du front puis service des fichiers statiques par nginx.
FROM node:24-alpine AS build
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist/client/browser /usr/share/nginx/html

EXPOSE 80
