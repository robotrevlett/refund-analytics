FROM node:18-alpine AS base

# Install openssl for Prisma
RUN apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["npm", "run", "docker-start"]
