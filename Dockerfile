FROM node:22-alpine
WORKDIR /app

# Only the package files here, NOT prisma/: this layer must stay cached unless
# dependencies change. A schema edit used to invalidate it and force a full
# reinstall on every deploy. @prisma/client's postinstall no-ops without a
# schema; the real generate runs below after the source is copied.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
