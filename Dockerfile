FROM node:lts-alpine as base
WORKDIR /bot
COPY package*.json ./

FROM base as build
RUN npm install
COPY . .
RUN npm run transpile

FROM base as prod
RUN npm ci --only=prod
COPY --from=build /bot/dist ./dist
COPY --from=build /bot/.env.example ./.env.example
COPY --from=build /bot/README.md ./README.md
COPY --from=build /bot/alias-loader.mjs ./alias-loader.mjs
CMD ["npm", "start"]