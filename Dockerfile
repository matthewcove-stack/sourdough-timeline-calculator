FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=4173
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 4173
CMD ["node", "server.mjs"]
