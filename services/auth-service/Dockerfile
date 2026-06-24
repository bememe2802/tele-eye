FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

COPY package.json ./
RUN npm install

COPY tsconfig.json nest-cli.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npx prisma generate
RUN npx nest build

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json ./
RUN npm install --only=production && npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts

EXPOSE 8081

CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/src/main"]
