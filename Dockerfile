FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:node

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production ESTATEHUB_TARGET=node
RUN corepack enable
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "node_modules/vinext/dist/cli.js", "start", "--host", "0.0.0.0", "--port", "3000"]
