FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.mjs lib.mjs ./
ENV NODE_ENV=production
ENV DATA_DIR=/data
RUN mkdir -p /data
EXPOSE 8787
CMD ["node", "server.mjs"]
