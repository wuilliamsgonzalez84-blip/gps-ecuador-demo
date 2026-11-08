FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY db.cjs server.cjs receiver.cjs teltonika.cjs private-map.html private-map.js ./
USER node
CMD ["node","server.cjs"]
